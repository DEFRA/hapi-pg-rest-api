'use strict';

/**
 * A module to create a HAPI REST API connected to a PostGreSQL table
 * to reduce boilerplate code
 * @module lib/rest-api
 */
const moment = require('moment');
const forEach = require('lodash/forEach');
const mapValues = require('lodash/mapValues');
const omit = require('lodash/omit');
const map = require('lodash/map');
const uuidV4 = require('uuid/v4');
const Joi = require('joi');
const {SqlConditionBuilder, SqlSortBuilder} = require('./sql');


/**
 * @param {Object} config - configuration options
 * @param {String} config.endpoint - base endpoint, e.g. /crm/1.0/entities
 * @param {String} config.table - DB table name
 * @param {String} config.primaryKey - primary key field name
 * @param {Function} config.preInsert - function for modifying data pre-insert
 * @param {Function} config.onCreateTimestamp - field to update with NOW() on create
 * @param {Function} config.connection - DB connection, e.g. created with Pool
 */
function HAPIRestAPI(config) {

  // Require validation
  if(!config.validation) {
    throw `Validation missing from API config`;
  }

  this.config = Object.assign({
    // Modify data pre-insert
    preInsert : (data) => data
  }, config);

  /**
   * Do DB query
   * @param {String} query - SQL query
   * @param {Array} queryParams - bound query params
   * @return {Promise} resolves with PostGres result
   */
  this.dbQuery = (query, queryParams) => {
    console.log(query, queryParams);
    return this.config.connection.query(query, queryParams);
  }



  /**
   * Get an error handler function
   * @param {Object} error - PostGres DB response
   * @param {Object} reply - HAPI HTTP reply interface
   */
  this.errorReply = (error, reply) => {
    console.error(error);
    const { code } = error;
    const statusCode = code === 23505 ? 400 : 500;
    return reply({ error : {name : 'DBError', code}, data : null }).code(statusCode);
  }

  /**
   * Reply with validation error message
   * @param {Object} error - PostGres DB response
   * @param {Object} reply - HAPI HTTP reply interface
   */
  this.validationErrorReply = (error, reply) => {
    console.error(error);
    return reply({
      data : null,
      error : Object.assign({
            name : 'ValidationError'
      }, error)
    }).code(400);
  }

  /**
   * Find a single record in DB by primary key
   * @param {Mixed} request.params.id - the primary key value to search
   */
  this.findOne = async (request, reply) => {
    const {table, primaryKey} = this.config;

    // Validate request
    console.log('about to validate!');
    const error = this.validateRequest(request);
    if(error) {
      return this.validationErrorReply(error, reply);
    }

    // Select data
    const query = `SELECT * FROM ${ table } WHERE ${ primaryKey }=$1`;
    const queryParams = [request.params.id];

    try {
      const result = await this.dbQuery(query, queryParams);
      if(result.rows.length === 1) {
          return reply({data : result.rows[0], error: null});
      }
      return reply({
        data: null,
        error : {
          name : 'NotFoundError'
        }
      }).code(404);
    }
    catch(error) {
      this.errorReply(error, reply);
    }
  }


  /**
   * Validates the payload
   * @param {Object} request - HAPI HTTP request instance
   * @return {Mixed} error - object if error, null otherise
   */
  this.validateRequest = (request) => {

    const {primaryKey} = this.config;

    // ID in request params
    if('id' in request.params) {
      const data = {};
      data[primaryKey] = request.params.id;
      const {error} = Joi.validate(data, this.config.validation);
      if(error) {
        return error;
      }
    }
    // Filtering data
    // @TODO filter fails if array provided
    if('filter' in request.query) {
      const filterSchema = mapValues(this.config.validation, (value) => {
        return [value, Joi.array().items(value)];
      });
      const filter = JSON.parse(request.query.filter);
      const { error } = Joi.validate(filter, filterSchema);
      if(error) {
        return error;
      }
    }
    // Sorting data
    if('sort' in request.query) {
      const sort = JSON.parse(request.query.sort);
      const sortError = Object.keys(sort).reduce((memo, sortKey) => {
        if(memo || sortKey in this.config.validation) {
          return memo;
        }
        return {
          name : "ValidationError",
          message : `Sort field '${sortKey}' not defined in validation config`
        };
      }, null);
      if(sortError) {
        return sortError;
      }
    }

    // Request body
    if(request.payload) {
      const {error} = Joi.validate(request.payload, this.config.validation);
      if(error) {
        return error;
      }
    }
    return null;
  }



  /**
   * Find many results
   * @param {Object} request.query
   * @param {String} request.query.filter - JSON encoded filter
   */
  this.findMany = async (request, reply) => {

    // Validate request
    const error = this.validateRequest(request);
    if(error) {
      return this.validationErrorReply(error, reply);
    }

    const filter = 'filter' in request.query ? JSON.parse(request.query.filter) : {};
    const sort = 'sort' in request.query ? JSON.parse(request.query.sort) : {};


    // @TODO limit/paginate
    const {table, primaryKey} = this.config;
    const conditions = new SqlConditionBuilder();

    // Filtering
    forEach(filter, (value, key) => {
      conditions.and(key, value);
    });

    let query = `SELECT * FROM ${ table } WHERE 0=0 ` + conditions.getSql();
    let queryParams = conditions.getParams();

    // Sorting
    const sortBuilder = new SqlSortBuilder();
    query += sortBuilder.add(sort).getSql();

    try {
      const result = await this.dbQuery(query, queryParams);
      return reply({data : result.rows, error: null});
    }
    catch(error) {
      this.errorReply(error, reply);
    }

  }




  /**
   * Create a new record (POST)
   * @param {Object} request.payload - the data to insert
   */
  this.create = async (request, reply) => {
    const {table, primaryKey, validation} = this.config;

    // Validate payload
    const schema = omit(validation, primaryKey);
    const { error } = Joi.validate(request.payload, schema);
    if(error) {
      return this.validationErrorReply(error, reply);
    }

    // Call pre-insert hook
    const data = this.config.preInsert(request.payload);
    data[primaryKey] = uuidV4();

    // Set on create timestamp
    if(this.config.onCreateTimestamp) {
      data[this.config.onCreateTimestamp] = moment().format('YYYY-MM-DD HH:mm:ss');
    }

    const fields = Object.keys(data);
    const queryParams = Object.values(data);
    const values = fields.map((value, i) => '$' + (i+1));

    const query = `INSERT INTO ${ table } (${fields.join(',')}) VALUES (${values.join(',')})`;

    try {
      const result = await this.dbQuery(query, queryParams);
      return reply({data, error: null}).code(201);
    }
    catch(error) {
      this.errorReply(error, reply);
    }
  }

  /**
   * Update a single record (PATCH)
   * @param {String} request.params.id
   * @param {Object} request.payload - field/value pairs to update
   */
  this.update = async (request, reply) => {
    // Validate request
    const error = this.validateRequest(request);
    if(error) {
      return this.validationErrorReply(error, reply);
    }

    const {table, primaryKey} = this.config;
    const queryParams = [];
    const set = map(request.payload, (value, key) => {
      queryParams.push(value);
      return `${ key }=$${queryParams.length}`;
    });

    queryParams.push(request.params.id);
    const query = `UPDATE ${ table } SET ${ set.join(',') } WHERE ${ primaryKey }=$${ queryParams.length }`;

    return this.updateOneQuery(query, queryParams, reply);
  }

  /**
   * Replace a whole record (PUT)
   * @TODO
   */
  this.replace = (request, reply)  => {
    reply({error : 'Not implemented'}).code(501);
  }



  /**
   * Perform and update or delete query that updates a single item
   */
  this.updateOneQuery = async (query, queryParams, reply) => {
    try {
      const result = await this.dbQuery(query, queryParams);
      // Was row updated?
      if(result.rowCount === 1) {
        return reply({data : null, error: null});
      }
      else {
        return reply({data : null, error : {
          name : 'NotFoundError'
        }}).code(404);
      }
    }
    catch(error) {
      this.errorReply(error, reply);
    }
  }


  /**
   * Delete a record
   * @param {Mixed} request.params.id - the ID of the record to delete
   */
  this.delete = async (request, reply) => {

    const {table, primaryKey} = this.config;

    // Validate request
    const error = this.validateRequest(request);
    if(error) {
      return this.validationErrorReply(error, reply);
    }

    const query = `DELETE FROM ${ table } WHERE ${ primaryKey}=$1`;
    const queryParams = [request.params.id];

    return this.updateOneQuery(query, queryParams, reply);
  }

  /**
   * Get HAPI route config for API
   * @return {Array} - HAPI route config
   */
  this.getRoutes = () => {
    const {endpoint, table, validation, primaryKey} = this.config;

    return [
      { method: 'GET', path : endpoint, handler : this.findMany, config : {
        description : 'Get many ' + table + ' records'
      }},
      { method: 'GET', path : endpoint + '/{id}', handler : this.findOne, config : {
        description : 'Get single ' + table + ' record'
      }},
      { method: 'POST', path : endpoint, handler : this.create, config : {
        description : 'Create new ' + table + ' record'
      }},
      { method: 'PATCH', path : endpoint + '/{id}', handler : this.update, config : {
        description : 'Patch single ' + table + ' record'
      }},
      { method : 'PUT', path : endpoint + '/{id}', handler : this.replace, config : {
        description : 'Replace single ' + table + ' record'
      }},
      { method : 'DELETE', path : endpoint + '/{id}', handler : this.delete, config : {
        description : 'Delete single ' + table + 'record'
      }}
    ];
  }
}


module.exports = HAPIRestAPI;
