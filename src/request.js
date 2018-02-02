/**
 * A class for handling/processing incoming request
 * @module request
 * @class Request
 */
const Joi = require('joi');
const mapValues = require('lodash/mapValues');
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
   * Validates request result
   * the result is in the form {filter, data, sort}
   * @param {Object} result - the processed result object
   * @param {Object} result.filter - filter by these fields when selecting
   * @param {Object} result.sort - sort data by these fields when selecting
   * @param {Object} result.data - create/update data
   */
  validate(result) {
    // Validate filter
    const fSchema = mapValues(this.config.validation, value => [value, Joi.array().items(value)]);
    const { error: filterError } = Joi.validate(result.filter, fSchema);
    if (filterError) {
      return filterError;
    }
    // Validate data
    const dataSchema = omit(this.config.validation, [this.config.primaryKey]);
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


    return null;
  }

  /**
   * Process HAPI HTTP request
   * @param {Object} - HAPI HTTP request interface
   * @return {Object} - processed data with {filter, sort, data}
   */
  processRequest(request) {
    const result = {
      // Data for create/update
      data: request.payload || {},
      // Filtering data for get/update/delete
      filter: {},
      // Sorting data
      sort: {},
      // Paginate data
      paginate: null,
    };

    const { primaryKey } = this.config;

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
