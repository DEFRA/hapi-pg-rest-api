/**
 * A class for handling/processing incoming request
 * @module request
 * @class Request
 */
const Joi = require('joi');
const { mapValues, isArray } = require('lodash');
const objectWalk = require('object-walk');
const omit = require('lodash/omit');
const { ValidationError } = require('./errors.js');


class Request {
  /**
   * Constructor
   * @constructor
   * @param {Object} config - configuration data
   */
  constructor(config) {
    this.config = config;
  }


  /**
   * Given that a filter query may now contain method params, e.g.
   * { $or : ['x', 'y']}, we need to walk over this object and get all values
   * from the leaf nodes of this object
   * @param {Object} filter, eg {field : 'value'}
   * @return {Object} filter with mongo-style queries converted to an array of values
   */
  static getFilterValues(filter) {
    return mapValues(filter, (value) => {
      if (typeof (value) !== 'object' || isArray(value) || value === null) {
        return value;
      }
      const values = [];
      objectWalk(value, (val, key) => {
        // Scalars
        if (typeof (val) !== 'object') {
          // When using like/ilike, skip field validation as the value is only
          // partial
          if (key.match(/^\$i?like$/i)) {
            return;
          }
          values.push(val);
        }
      });
      return values;
    });
  }


  /**
   * Validates request result
   * the result is in the form {filter, data, sort}
   * @param {Object} result - the processed result object
   * @param {Object} result.filter - filter by these fields when selecting
   * @param {Object} result.sort - sort data by these fields when selecting
   * @param {Object} result.data - create/update data
   */
  validate(result) {
    const filterValues = Request.getFilterValues(result.filter);

    // Validate filter
    const fSchema = mapValues(this.config.validation, value => [value, Joi.array().items(value)]);
    const { error: filterError } = Joi.validate(filterValues, fSchema, {
      allowUnknown: true,
    });
    if (filterError) {
      return filterError;
    }


    // Validate data
    const {
      validation, primaryKeyAuto, primaryKey, primaryKeyGuid,
    } = this.config;
    const permitPrimaryKey = (!primaryKeyAuto && !primaryKeyGuid);
    const dataSchema = permitPrimaryKey ? validation : omit(validation, [primaryKey]);
    const { error: dataError } = Joi.validate(result.data, dataSchema);
    if (dataError) {
      return dataError;
    }
    // Validate sort
    const sortError = Object.keys(result.sort).reduce((memo, sortKey) => {
      if (memo || sortKey in this.config.validation) {
        return memo;
      }
      return new ValidationError(`Sort field '${sortKey}' not defined in validation config`);
    }, null);
    if (sortError) {
      return sortError;
    }
    // Validate pagination
    if (result.pagination) {
      const pSchema = { page: Joi.number().min(1), perPage: Joi.number().default(100).min(1) };
      const { error: paginationError } = Joi.validate(result.pagination, pSchema);
      if (paginationError) {
        return new ValidationError('Pagination must contain keys \'page\' and \'perPage\' with integer values');
      }
    }
    // Validate columns
    if (result.columns) {
      const cSchema = {
        columns: Joi.array().items(Joi.string().valid(Object.keys(this.config.validation))),
      };
      const { error: columnError } = Joi.validate({ columns: result.columns }, cSchema);
      if (columnError) {
        return new ValidationError('Invalid column specification');
      }
    }


    return null;
  }

  /**
   * Process HAPI HTTP request
   * @param {Object} - HAPI HTTP request interface
   * @return {Object} - processed data with {filter, sort, data}
   */
  processRequest(request) {
    const { primaryKey, pagination } = this.config;

    const result = {
      // Data for create/update
      data: request.payload || {},
      // Filtering data for get/update/delete
      filter: {},
      // Sorting data
      sort: {},
      // Paginate data
      pagination,
      // Columns (default is select * )
      columns: null,
    };

    if ('id' in request.params) {
      result.filter[primaryKey] = request.params.id;
    }
    if ('filter' in request.query) {
      try {
        const filter = JSON.parse(request.query.filter);
        result.filter = Object.assign({}, filter, result.filter);
      }
      catch (e) {
        throw new ValidationError('Filter must be valid JSON');
      }
    }
    if ('sort' in request.query) {
      try {
        const sort = JSON.parse(request.query.sort);
        result.sort = Object.assign({}, sort, result.sort);
      }
      catch (e) {
        throw new ValidationError('Sort must be valid JSON');
      }
    }
    if ('pagination' in request.query) {
      try {
        result.pagination = JSON.parse(request.query.pagination);
      }
      catch (e) {
        throw new ValidationError('Pagination must be valid JSON');
      }
    }
    if ('columns' in request.query) {
      try {
        result.columns = request.query.columns.split(',');
      }
      catch (e) {
        throw new ValidationError('Columns must be valid JSON');
      }
    }

    // Validate
    const error = this.validate(result);
    if (error) {
      throw error;
    }

    // For delete/update, enforce some filter criteria
    if (request.method.match(/^put|patch|delete$/i)) {
      if (Object.keys(result.filter).length < 1) {
        throw new ValidationError('For PUT/PATCH/DELETE, filter criteria cannot be empty');
      }
    }

    return this.config.preQuery(result, request);
  }
}

module.exports = Request;
