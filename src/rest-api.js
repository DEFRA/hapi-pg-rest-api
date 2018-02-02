/**
 * A module to create a HAPI REST API connected to a PostGreSQL table
 * to reduce boilerplate code
 * @module rest-api
 */
const moment = require('moment');
const uuidV4 = require('uuid/v4');
const { ConfigError, NotFoundError } = require('./errors');
const Request = require('./request.js');
const Query = require('./query.js');

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
  if (!config.validation) {
    throw new ConfigError('Validation missing from API config');
  }

  // Create config object with defaults
  this.config = Object.assign({
    // Modify data pre-insert
    preInsert: data => data,
    preUpdate: data => data,
    preQuery: result => result,
    postSelect: data => data,
    upsert: null,
    primaryKeyAuto: false,
    primaryKeyGuid: true,
  }, config);

  // Create request processor instance
  this.request = new Request(this.config);

  /**
   * Do DB query
   * @param {String} query - SQL query
   * @param {Array} queryParams - bound query params
   * @return {Promise} resolves with PostGres result
   */
  this.dbQuery = (query, queryParams) => this.config.connection.query(query, queryParams);


  /**
   * Get an error handler function
   * @param {Object} error - PostGres DB response
   * @param {Object} reply - HAPI HTTP reply interface
   */
  this.errorReply = (error, reply) => {
    // Validation error is a bad request - 400
    if (error.name === 'ValidationError') {
      return reply({ error, data: null }).code(400);
    }
    // Config error - server issue
    if (error.name === 'ConfigError') {
      return reply({ error, data: null }).code(500);
    }
    // Config error - server issue
    if (error.name === 'NotFoundError') {
      return reply({ error, data: null }).code(404);
    }

    // DB error
    const { code } = error;
    const statusCode = code === 23505 ? 400 : 500;
    return reply({ error: { name: 'DBError', code }, data: null }).code(statusCode);
  };


  /**
   * Get pagination info for paginated request
   * Includes total row count and number of pages
   * @param {Object} request - internal request object
   * @return {Object} pagination info
   */
  this.getPagination = async (request) => {
    const q = new Query(config);
    const { query, queryParams } = q.selectRowCount()
      .setFilter(request.filter)
      .getQuery();

    const result = await this.dbQuery(query, queryParams);
    const totalRows = parseInt(result.rows[0].totalrowcount, 10);

    return {
      ...request.pagination,
      totalRows,
      pageCount: Math.ceil(totalRows / request.pagination.perPage),
    };
  };


  /**
   * Find one/many results
   */
  this.find = async (hapiRequest, reply, isMany = false) => {
    try {
      const request = await this.request.processRequest(hapiRequest);

      const q = new Query(config);

      const { query, queryParams } = q.select()
        .setFilter(request.filter)
        .setSort(request.sort)
        .setPagination(request.pagination)
        .getQuery();

      const result = await this.dbQuery(query, queryParams);

      if (isMany) {
        const replyData = { data: this.config.postSelect(result.rows), error: null };

        if (request.pagination) {
          replyData.pagination = await this.getPagination(request);
        }

        return reply(replyData);
      }
      else if (result.rows.length !== 1) {
        throw new NotFoundError('Query must return exactly 1 row');
      }
      else {
        return reply({ data: this.config.postSelect(result.rows)[0], error: null });
      }
    }
    catch (error) {
      return this.errorReply(error, reply);
    }
  };


  /**
   * Find single record
   * @param {Object} request - HAPI HTTP request interface
   * @param {Object} request.params - URL params
   * @param {String} request.params.id - ID of the record to find
   * @param {Object} reply - HAPI HTTP reply interface
   * @return {Promise} resolves with HAPI reply
   */
  this.findOne = async (request, reply) => this.find(request, reply, false);


  /**
   * Find many records
   * @param {Object} request - HAPI HTTP request interface
   * @param {Object} request.query - GET query params
   * @param {String} request.query.filter - JSON encoded filter
   * @param {String} request.query.sort - JSON encoded sort
   * @param {Object} reply - HAPI HTTP reply interface
   * @return {Promise} resolves with HAPI reply
   */
  this.findMany = async (request, reply) => this.find(request, reply, true);

  /**
   * Create a new record (POST)
   * @param {Object} request.payload - the data to insert
   */
  this.create = async (hapiRequest, reply) => {
    const { primaryKey } = this.config;

    try {
      const q = new Query(config);
      const command = await this.request.processRequest(hapiRequest);

      // Call pre-insert hook
      const data = await this.config.preInsert(command.data);

      // Auto-generate primary key
      if (!this.config.primaryKeyAuto && this.config.primaryKeyGuid) {
        data[primaryKey] = uuidV4();
      }

      // Set on create timestamp
      if (this.config.onCreateTimestamp) {
        data[this.config.onCreateTimestamp] = moment().format('YYYY-MM-DD HH:mm:ss');
      }

      const { query, queryParams } = q.insert()
        .setData(data)
        .getQuery();

      const result = await this.dbQuery(query, queryParams);
      return reply({ data: result.rows[0], error: null }).code(201);
    }
    catch (error) {
      return this.errorReply(error, reply);
    }
  };


  this.update = async (hapiRequest, reply, isMany) => {
    try {
      const q = new Query(config);
      const command = await this.request.processRequest(hapiRequest);

      // Call pre-update hook
      const data = await this.config.preUpdate(command.data);

      // Set on update timestamp
      if (this.config.onUpdateTimestamp) {
        data[this.config.onUpdateTimestamp] = moment().format('YYYY-MM-DD HH:mm:ss');
      }

      const { query, queryParams } = q.update()
        .setData(data)
        .setFilter(command.filter)
        .getQuery();

      const { rowCount, rows } = await this.dbQuery(query, queryParams);

      if (isMany || (rowCount === 1)) {
        const returnData = isMany ? null : rows[0];
        return reply({ data: returnData, error: null, rowCount });
      }

      throw new NotFoundError('Query must update exactly 1 row');
    }
    catch (error) {
      return this.errorReply(error, reply);
    }
  };


  /**
   * Update a single record (PATCH)
   * @param {String} request.params.id
   * @param {Object} request.payload - field/value pairs to update
   */
  this.updateOne = async (request, reply) => this.update(request, reply, false);


  /**
   * Update many records (PATCH)
   * @param {String} request.query.filter - JSON encoded filter params
   * @param {Object} request.payload - field/value pairs to update
   */
  this.updateMany = async (request, reply) => this.update(request, reply, true);


  /**
   * Replace a whole record (PUT)
   * @TODO
   */
  this.replace = (request, reply) => {
    reply({
      data: null,
      error: {
        name: 'NotImplementedError',
        message: 'PUT for this API is not yet implemented',
      },
    }).code(501);
  };


  /**
   * Delete a record
   * @param {Mixed} hapiRequest.params.id - the ID of the record to delete
   */
  this.delete = async (hapiRequest, reply) => {
    try {
      const q = new Query(config);
      const command = await this.request.processRequest(hapiRequest);

      const { query, queryParams } = q.delete()
        .setFilter(command.filter)
        .getQuery();

      const { rowCount } = await this.dbQuery(query, queryParams);

      if (rowCount > 0) {
        return reply({ data: null, error: null, rowCount });
      }
      throw new NotFoundError('No records deleted');
    }
    catch (error) {
      return this.errorReply(error, reply);
    }
  };

  /**
   * Get HAPI route config for API
   * @return {Array} - HAPI route config
   */
  this.getRoutes = () => {
    const {
      endpoint, table,
    } = this.config;

    return [
      {
        method: 'GET',
        path: endpoint,
        handler: this.findMany,
        config: {
          description: `Get many ${table} records`,
        },
      },
      {
        method: 'GET',
        path: `${endpoint}/{id}`,
        handler: this.findOne,
        config: {
          description: `Get single ${table} record`,
        },
      },
      {
        method: 'POST',
        path: endpoint,
        handler: this.create,
        config: {
          description: `Create new ${table} record`,
        },
      },
      {
        method: 'PATCH',
        path: `${endpoint}/{id}`,
        handler: this.updateOne,
        config: {
          description: `Patch single ${table} record`,
        },
      },
      {
        method: 'PUT',
        path: `${endpoint}/{id}`,
        handler: this.replace,
        config: {
          description: `Replace single ${table} record`,
        },
      },
      {
        method: 'DELETE',
        path: `${endpoint}/{id}`,
        handler: this.delete,
        config: {
          description: `Delete single ${table}record`,
        },
      },
      {
        method: 'PATCH',
        path: `${endpoint}`,
        handler: this.updateMany,
        config: {
          description: `Patch many ${table} records`,
        },
      },
    ];
  };
}


module.exports = HAPIRestAPI;
