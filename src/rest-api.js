/**
 * A module to create a HAPI REST API connected to a PostGreSQL table
 * to reduce boilerplate code
 * @module rest-api
 */
const moment = require('moment');
const uuidV4 = require('uuid/v4');
const { ConfigError, NotFoundError } = require('./errors');
const Request = require('./request.js');
const Repository = require('./repository.js');

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
    pagination: {
      page: 1,
      perPage: 100,
    },
  }, config);

  this.repo = new Repository(this.config);

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
    console.error(error);
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
    const result = await this.repo.findRowCount(request.filter);
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

      // Get data
      const result = await this.repo.find(
        request.filter, request.sort,
        request.pagination, request.columns,
      );

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
      // console.log(error);
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

      const result = await this.repo.create(data, command.columns);

      return reply({ data: result.rows[0], error: null }).code(201);
    }
    catch (error) {
      return this.errorReply(error, reply);
    }
  };


  this.update = async (hapiRequest, reply, isMany) => {
    try {
      const command = await this.request.processRequest(hapiRequest);

      // Call pre-update hook
      const data = await this.config.preUpdate(command.data);

      // Set on update timestamp
      if (this.config.onUpdateTimestamp) {
        data[this.config.onUpdateTimestamp] = moment().format('YYYY-MM-DD HH:mm:ss');
      }

      const { rowCount, rows } = await this.repo.update(command.filter, data);

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
      const command = await this.request.processRequest(hapiRequest);

      const { rowCount } = await this.repo.delete(command.filter);

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
   * Get HAPI API handler for GET single record
   * @return Object
   */
  this.findManyRoute = () => {
    const { endpoint, table } = this.config;
    return {
      method: 'GET',
      path: endpoint,
      handler: this.findMany,
      config: {
        description: `Get many ${table} records`,
      },
    };
  };

  /**
   * Get HAPI API handler for GET single record
   * @return Object
   */
  this.findOneRoute = () => {
    const { endpoint, table } = this.config;
    return {
      method: 'GET',
      path: `${endpoint}/{id}`,
      handler: this.findOne,
      config: {
        description: `Get single ${table} record`,
      },
    };
  };

  /**
   * Get HAPI API handler for POST new record
   * @return Object
   */
  this.createRoute = () => {
    const { endpoint, table } = this.config;
    return {
      method: 'POST',
      path: endpoint,
      handler: this.create,
      config: {
        description: `Create new ${table} record`,
      },
    };
  };

  /**
   * Get HAPI API handler for PATCH single record
   * @return Object
   */
  this.updateOneRoute = () => {
    const { endpoint, table } = this.config;
    return {
      method: 'PATCH',
      path: `${endpoint}/{id}`,
      handler: this.updateOne,
      config: {
        description: `Patch single ${table} record`,
      },
    };
  };


  /**
   * Get HAPI API handler for PUT single record
   * @return Object
   */
  this.replaceOneRoute = () => {
    const { endpoint, table } = this.config;
    return {
      method: 'PUT',
      path: `${endpoint}/{id}`,
      handler: this.replace,
      config: {
        description: `Replace single ${table} record`,
      },
    };
  };


  /**
   * Get HAPI API handler for DELETE single record
   * @return Object
   */
  this.deleteOneRoute = () => {
    const { endpoint, table } = this.config;
    return {
      method: 'DELETE',
      path: `${endpoint}/{id}`,
      handler: this.delete,
      config: {
        description: `Delete single ${table}record`,
      },
    };
  };


  /**
   * Get HAPI API handler for PATCH many records
   * @return Object
   */
  this.updateManyRoute = () => {
    const { endpoint, table } = this.config;
    return {
      method: 'PATCH',
      path: `${endpoint}`,
      handler: this.updateMany,
      config: {
        description: `Patch many ${table} records`,
      },
    };
  };

  /**
   * Get HAPI route config for API
   * @return {Array} - HAPI route config
   */
  this.getRoutes = () => [
    this.findManyRoute(),
    this.findOneRoute(),
    this.createRoute(),
    this.updateOneRoute(),
    this.replaceOneRoute(),
    this.deleteOneRoute(),
    this.updateManyRoute(),
  ];
}


module.exports = HAPIRestAPI;
