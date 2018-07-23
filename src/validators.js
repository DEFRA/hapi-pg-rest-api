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
 * Given that a filter query may now contain method params, e.g.
 * { $or : ['x', 'y']}, we need to walk over this object and get all values
 * from the leaf nodes of this object
 * @param {Object} filter, eg {field : 'value'}
 * @return {Object} filter with mongo-style queries converted to an array of values
 */
const getFilterValues = (filter) => {
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
};

/**
 * Validates supplied filter options
 * NOTE: don't use the value returned from this for filtering, Joi can adjust
 * mongo-sql specific object such as $or, $in
 *
 * @param {Object} filter
 * @param {Object} config
 * @param {Boolean} isRequired - for update/delete, can specify that the filter is required
 * @return {Object}
 */
const validateFilter = (filter, config, isRequired = false) => {
  if (isRequired && isEmpty(filter)) {
    return { value: undefined, error: new ValidationError('Filter parameter is required') };
  }

  const filterValues = getFilterValues(filter);

  let schema = mapValues(config.validation, value => [value, Joi.array().items(value)]);

  // Permit additional fields for jsonb
  for (let key in filterValues) {
    if (key.match('->')) {
      const field = key.split('->')[0];
      if (field in schema) {
        schema[key] = Joi.any();
      }
    }
  }

  return Joi.validate(filterValues, schema);
};

module.exports = {
  validateCreatePayload,
  validateUpdatePayload,
  validateFilter
};
