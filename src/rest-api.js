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
const { mapValues } = require('lodash');
// @source {@link https://stackoverflow.com/questions/7905929/how-to-test-valid-uuid-guid}
const guidRegex = '/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i';
const RestHAPIInterface = require('./rest-hapi-interface');

/**
 * @param {Object} config - configuration options
 * @param {String} config.endpoint - base endpoint, e.g. /crm/1.0/entities
 * @param {String} config.table - DB table name
 * @param {String} config.primaryKey - primary key field name
 * @param {Function} config.preInsert - function for modifying data pre-insert
 * @param {Function} config.onCreateTimestamp - field to update with NOW() on create
 * @param {Function} config.connection - DB connection, e.g. created with Pool
 */
class HAPIRestAPI extends RestHAPIInterface {
  constructor (config) {
    // Require validation
    if (!config.validation) {
      throw new ConfigError('Validation missing from API config');
    }

    // Create config object with defaults
    const configWithDefaults = Object.assign({
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
        perPage: 100
      }
    }, config);

    super(configWithDefaults);
    this.config = configWithDefaults;

    this.repo = new Repository(this.config);

    // Create request processor instance
    this.request = new Request(this.config);
  }

  /**
   * Do DB query
   * @param {String} query - SQL query
   * @param {Array} queryParams - bound query params
   * @return {Promise} resolves with PostGres result
   */
  dbQuery (query, queryParams) {
    return this.config.connection.query(query, queryParams);
  }

  /**
   * Get an error handler function
   * @param {Object} error - PostGres DB response
   * @param {Object} h - HAPI HTTP reply interface
   */
  static errorReply (error, h) {
    console.error(error);
    // Validation error is a bad request - 400
    if (error.name === 'ValidationError') {
      return h.response({ error, data: null }).code(400);
    }
    // Config error - server issue
    if (error.name === 'ConfigError') {
      return h.response({ error, data: null }).code(500);
    }
    // Config error - server issue
    if (error.name === 'NotFoundError') {
      return h.response({ error, data: null }).code(404);
    }

    // DB error
    const code = parseInt(error.code, 10);
    const statusCode = [23505, 23502].includes(code) ? 400 : 500;
    return h.response({ error: { name: 'DBError', code }, data: null }).code(statusCode);
  }

  /**
   * Get pagination info for paginated request
   * Includes total row count and number of pages
   * @param {Object} request - internal request object
   * @return {Object} pagination info
   */
  async getPagination (request) {
    const result = await this.repo.findRowCount(request.filter);
    const totalRows = parseInt(result.rows[0].totalrowcount, 10);

    return {
      ...request.pagination,
      totalRows,
      pageCount: Math.ceil(totalRows / request.pagination.perPage)
    };
  }

  /**
   * Find one/many results
   */
  async find (hapiRequest, h, isMany = false) {
    try {
      const request = await this.request.processRequest(hapiRequest);

      // Get data
      const result = await this.repo.find(
        request.filter, request.sort,
        request.pagination, request.columns
      );

      if (isMany) {
        const replyData = { data: this.config.postSelect(result.rows), error: null };
        replyData.pagination = await this.getPagination(request);

        return h.response(replyData);
      } else if (result.rows.length !== 1) {
        throw new NotFoundError('Query must return exactly 1 row');
      } else {
        return h.response({ data: this.config.postSelect(result.rows)[0], error: null });
      }
    } catch (error) {
      return this.errorReply(error, h);
    }
  }

  /**
   * Find single record
   * @param {Object} request - HAPI HTTP request interface
   * @param {Object} request.params - URL params
   * @param {String} request.params.id - ID of the record to find
   * @param {Object} reply - HAPI HTTP reply interface
   * @return {Promise} resolves with HAPI reply
   */
  findOne (request, h) {
    return this.find(request, h, false);
  }

  /**
   * Find many records
   * @param {Object} request - HAPI HTTP request interface
   * @param {Object} request.query - GET query params
   * @param {String} request.query.filter - JSON encoded filter
   * @param {String} request.query.sort - JSON encoded sort
   * @param {Object} reply - HAPI HTTP reply interface
   * @return {Promise} resolves with HAPI reply
   */
  findMany (request, h) {
    return this.find(request, h, true);
  }

  /**
   * Create a new record (POST)
   * @param {Object} request.payload - the data to insert
   */
  async create (hapiRequest, h) {
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

      return h.response({ data: result.rows[0], error: null }).code(201);
    } catch (error) {
      return this.errorReply(error, h);
    }
  }

  async update (hapiRequest, h, isMany) {
    try {
      const command = await this.request.processRequest(hapiRequest);

      // Call pre-update hook
      const data = await this.config.preUpdate(command.data);

      // Set on update timestamp
      if (this.config.onUpdateTimestamp) {
        data[this.config.onUpdateTimestamp] = moment().format('YYYY-MM-DD HH:mm:ss');
      }

      const { rowCount, rows } = await this.repo.update(command.filter, data);

      const returnData = rowCount === 1 ? rows[0] : null;

      if (isMany || (rowCount === 1)) {
        return h.response({ data: returnData, error: null, rowCount });
      }

      throw new NotFoundError('Query must update exactly 1 row');
    } catch (error) {
      return this.errorReply(error, h);
    }
  }

  /**
   * Update a single record (PATCH)
   * @param {String} request.params.id
   * @param {Object} request.payload - field/value pairs to update
   */
  async updateOne (request, h) {
    return this.update(request, h, false);
  }

  /**
   * Update many records (PATCH)
   * @param {String} request.query.filter - JSON encoded filter params
   * @param {Object} request.payload - field/value pairs to update
   */
  async updateMany (request, h) {
    return this.update(request, h, true);
  }

  /**
   * Replace a whole record (PUT)
   * @TODO
   */
  static replace (request, h) {
    return h.response({
      data: null,
      error: {
        name: 'NotImplementedError',
        message: 'PUT for this API is not yet implemented'
      }
    }).code(501);
  }

  /**
   * Delete a record
   * @param {Mixed} hapiRequest.params.id - the ID of the record to delete
   */
  async delete (hapiRequest, h) {
    try {
      const command = await this.request.processRequest(hapiRequest);

      const { rowCount } = await this.repo.delete(command.filter);

      if (rowCount > 0) {
        return h.response({ data: null, error: null, rowCount });
      }
      throw new NotFoundError('No records deleted');
    } catch (error) {
      return this.errorReply(error, h);
    }
  }

  /**
   * Get schema definition
   * @param {Object} hapiRequest - the HAPI request instance
   * @return {Object} reply - the HAPI reply interface
   */
  /* eslint no-underscore-dangle : ["warn", {}] */
  async schemaDefinition (hapiRequest, h) {
    const {
      table, primaryKey, primaryKeyAuto, primaryKeyGuid
    } = this.config;

    const required = [];
    const properties = mapValues(this.config.validation, (value, key) => {
      // Required fields
      if (value._flags.presence === 'required') {
        required.push(key);
      }
      const field = {
        type: value._type
      };

      // Joi Tests
      value._tests.forEach((test) => {
        if (test.name === 'min') {
          field.minLength = test.arg;
        }
        if (test.name === 'max') {
          field.maxLength = test.arg;
        }
        if (test.name === 'email') {
          field.format = 'email';
        }
        if (test.name === 'guid') {
          field.pattern = guidRegex;
        }
      });

      return field;
    });

    const jsonSchema = {
      title: table,
      type: 'object',
      properties,
      required
    };

    return h.response({
      error: null,
      data: {
        jsonSchema,
        config: {
          primaryKey,
          primaryKeyAuto,
          primaryKeyGuid
        }
      }
    });
  }
}

module.exports = HAPIRestAPI;
