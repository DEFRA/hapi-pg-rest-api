const moment = require('moment');
const uuidV4 = require('uuid/v4');
const { isArray } = require('lodash');
const manager = require('./manager');
const { getRequestData, getPaginationResponse, errorReply } = require('./helpers');
const { NotFoundError, ValidationError, NotImplementedError } = require('./errors');
const { validateCreatePayload, validateFilter, validateUpdatePayload } = require('./validators');

/**
 * Find and return a single record
 * @param {Mixed} request.params.id - the primary key value
 */
const findOne = async (request, h) => {
  const config = request.route.settings.plugins.hapiPgRestAPI;
  const repo = manager.get(config.name);
  const { columns, filter } = await getRequestData(request, config);

  const { error } = validateFilter(filter, config);
  if (error) {
    return errorReply(new ValidationError(error), h);
  }

  try {
    // Get data
    const { rows } = await repo.find(filter, null, null, columns);

    if (rows.length !== 1) {
      return errorReply(new NotFoundError(), h);
    }

    return {
      error: null,
      data: config.postSelect(rows)[0]
    };
  } catch (error) {
    return errorReply(error, h);
  }
};

/**
 * Find many results, with options for filter, sort, pagination, and returned columns
 * @param {String} request.query.filter - JSON encoded filter object
 * @param {String} request.query.sort - JSON encoded sort object
 * @param {String} request.query.pagination - JSON encoded pagination object
 * @param {String} request.query.columns - Comma separated column list
 */
const findMany = async (request, h) => {
  const config = request.route.settings.plugins.hapiPgRestAPI;
  const repo = manager.get(config.name);
  const { filter, sort, pagination, columns } = await getRequestData(request, config);

  const { error } = validateFilter(filter, config);
  if (error) {
    return errorReply(error, h);
  }

  try {
    // Get data
    const { rows } = await repo.find(filter, sort, pagination, columns);

    return {
      data: config.postSelect(rows),
      error: null,
      pagination: await getPaginationResponse(pagination, repo, filter)
    };
  } catch (error) {
    return errorReply(error, h);
  }
};

/**
 * Create single/multiple record
 */
const create = async (request, h) => {
  const config = request.route.settings.plugins.hapiPgRestAPI;
  const repo = manager.get(config.name);
  const { columns, data: payload } = await getRequestData(request, config);
  const { error, value } = validateCreatePayload(payload, config);

  if (error) {
    return errorReply(new ValidationError(error), h);
  }

  let data = await config.preInsert(value);

  // Convert to array for ease of adding GUID/timestamp fields
  data = isArray(data) ? data : [data];

  const ts = moment().format('YYYY-MM-DD HH:mm:ss');
  data = data.map(row => {
    // Generate primary key
    if (!config.primaryKeyAuto && config.primaryKeyGuid) {
      row[config.primaryKey] = uuidV4();
    }
    // Generate on create time stamp
    if (config.onCreateTimestamp) {
      row[config.onCreateTimestamp] = ts;
    }
    return row;
  });

  // Persist data
  try {
    const { rows } = await repo.create(data, columns);

    return h.response({
      data: rows.length === 1 ? rows[0] : rows,
      error: null
    }).code(201);
  } catch (error) {
    return errorReply(error, h);
  }
};

/**
 * Update a single record
 * @param {String} request.params.id - primary key value
 * @param {Object} request.payload - new values
 * @param {String} [request.query.columns] - columns to output in reply
 */
const updateOne = async (request, h) => {
  const config = request.route.settings.plugins.hapiPgRestAPI;
  const repo = manager.get(config.name);
  const { columns, filter } = await getRequestData(request, config);

  const { error } = validateFilter(filter, config);
  if (error) {
    return errorReply(new ValidationError(error), h);
  }

  // Validate payload
  const { error: payloadError, value: payloadValue } = validateUpdatePayload(request.payload, config);
  if (payloadError) {
    return errorReply(payloadError, h);
  }

  const data = await config.preUpdate(payloadValue);

  if (config.onUpdateTimestamp) {
    data[config.onUpdateTimestamp] = moment().format('YYYY-MM-DD HH:mm:ss');
  }

  try {
    const { rows, rowCount } = await repo.update(filter, data, columns);

    if (rowCount !== 1) {
      return errorReply(new NotFoundError(), h);
    }

    return {
      data: rows[0],
      error: null,
      rowCount
    };
  } catch (error) {
    return errorReply(error, h);
  }
};

/**
 * PUT method to replace record.  Not yet implemeneted
 */
const replaceOne = async (request, h) => {
  return errorReply(new NotImplementedError(), h);
};

/**
 * Update multiple records
 * @param {String} request.query.filter - JSON encoded filter string for records to update
 * @param {Object} request.payload - key/value pairs of values to update
 * @param {String} request.query.columns - CSV of columns to return (default *)
 */
const updateMany = async (request, h) => {
  const config = request.route.settings.plugins.hapiPgRestAPI;
  const repo = manager.get(config.name);
  const { filter, columns } = await getRequestData(request, config);

  const { error } = validateFilter(filter, config, true);
  if (error) {
    return errorReply(error, h);
  }

  // Validate payload
  const { error: payloadError, value } = validateUpdatePayload(request.payload, config);
  if (payloadError) {
    return errorReply(payloadError, h);
  }

  const data = await config.preUpdate(value);

  if (config.onUpdateTimestamp) {
    data[config.onUpdateTimestamp] = moment().format('YYYY-MM-DD HH:mm:ss');
  }

  try {
    const { rows, rowCount } = await repo.update(filter, data, columns);

    return {
      data: rows,
      error: null,
      rowCount
    };
  } catch (error) {
    return errorReply(error, h);
  }
};

/**
 * Delete a single record from DB
 * @param {Mixed} request.params.id - the primary key value
 */
const deleteOne = async (request, h) => {
  const config = request.route.settings.plugins.hapiPgRestAPI;
  const repo = manager.get(config.name);
  const { filter } = await getRequestData(request, config);

  const { error } = validateFilter(filter, config);
  if (error) {
    return errorReply(error, h);
  }

  try {
    const { rowCount } = await repo.delete(filter);

    if (rowCount === 0) {
      return errorReply(new NotFoundError(), h);
    }

    return {
      data: null,
      error: null,
      rowCount
    };
  } catch (error) {
    return errorReply(error, h);
  }
};

/**
 * Delete many results, with options for filter
 * @param {String} request.query.filter - JSON encoded filter object
 */
const deleteMany = async (request, h) => {
  const config = request.route.settings.plugins.hapiPgRestAPI;
  const repo = manager.get(config.name);

  const { filter } = await getRequestData(request, config);

  const { error } = validateFilter(filter, config, true);
  if (error) {
    return errorReply(error, h);
  }

  try {
    // Get data
    const { rowCount } = await repo.delete(filter);

    return {
      data: null,
      error: null,
      rowCount
    };
  } catch (error) {
    return errorReply(error, h);
  }
};

module.exports = {
  create,
  findOne,
  findMany,
  updateOne,
  replaceOne,
  updateMany,
  deleteOne,
  deleteMany
};
