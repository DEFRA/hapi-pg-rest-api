const Joi = require('joi');
const { isArray } = require('lodash');
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
  // For multi-row insert, all items in payload must have identical keys
  if (isArray(payload) && !checkIdenticalKeys(payload)) {
    return { value: undefined, error: new ValidationError('All objects must have same keys in multi-row insert') };
  }

  // Forbid primary key in payload if auto-generated
  const rowSchema = (config.primaryKeyAuto || config.primaryKeyGuid)
    ? config.validation.keys({ [config.primaryKey]: Joi.forbidden() })
    : config.validation;

  // Create single/multi-item schema
  const finalSchema = isArray(payload) ? Joi.array().items(rowSchema) : rowSchema;

  // Validate payload
  return finalSchema.validate(payload);
};

/**
 * Validates update payload.  This can only contain a single object
 * an array of objects.
 * @param {Object|Array} payload
 * @param {Object} config
 * @return {Object}
 */
const validateUpdatePayload = (payload, config) => {
  // Disallow primary key in payload
  const schema = config.validation.keys({
    [config.primaryKey]: Joi.forbidden()
  });

  return schema.validate(payload);
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
  return config.validation.validate(data);
};

module.exports = {
  validateCreatePayload,
  validateUpdatePayload,
  validateParams
};
