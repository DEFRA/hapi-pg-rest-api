const objectWalk = require('object-walk');
const Joi = require('joi');
const { omit, isArray, mapValues, isEmpty } = require('lodash');
const { ValidationError } = require('./errors');

/**
 * Checks an array ensuring all objects in the array have the same keys
 * @param {Array} data
 * @return {Boolean}
 */
const checkIdenticalKeys = (data) => {
  const createKeyStr = (row) => {
    return Object.keys(row).sort().join(',');
  };
  const firstRow = createKeyStr(data[0]);
  for (let row of data) {
    if (createKeyStr(row) !== firstRow) {
      return false;
    }
  }
  return true;
};

/**
 * Validates create payload.  This can contain either a single object or
 * an array of objects.
 * @param {Object|Array} payload
 * @param {Object} config
 * @return {Object}
 */
const validateCreatePayload = (payload, config) => {
  const rowSchema = (config.primaryKeyAuto || config.primaryKeyGuid) ? omit(config.validation, config.primaryKey) : config.validation;

  const finalSchema = isArray(payload) ? Joi.array().items(rowSchema) : rowSchema;

  if (isArray(payload) && !checkIdenticalKeys) {
    return {value: undefined, error: new ValidationError('All objects must have same keys in multi-row insert')};
  }

  return Joi.validate(payload, finalSchema);
};

/**
 * Validates update payload.  This can only contain a single object
 * an array of objects.
 * @param {Object|Array} payload
 * @param {Object} config
 * @return {Object}
 */
const validateUpdatePayload = (payload, config) => {
  const schema = omit(config.validation, config.primaryKey);
  return Joi.validate(payload, schema);
};

/**
 * Validates URL params
 * This validates the primary key value - for routes that operate on a single entity
 * @param {Object} params - from HAPI request
 * @return {Object} Joi validation result
 */
const validateParams = (params, config) => {
  const data = {
    [config.primaryKey]: params.id
  };
  return Joi.validate(data, config.validation);
};

module.exports = {
  validateCreatePayload,
  validateUpdatePayload,
  validateParams
};
