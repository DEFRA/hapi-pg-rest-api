const { APIClientError } = require('./errors')

/**
 * Get pagination info for paginated request
 * Includes total row count and number of pages
 * @param {Object} pagination - the pagination object received as part of the request
 * @param {Object} repo - the repository instance
 * @param {Object} filter - the query filter
 * @return {Promise} resolves with object of pagination info
 */
const getPaginationResponse = async (pagination, repo, filter) => {
  const result = await repo.findRowCount(filter)
  const totalRows = parseInt(result.rows[0].totalrowcount, 10)

  return {
    ...pagination,
    totalRows,
    pageCount: Math.ceil(totalRows / pagination.perPage)
  }
}

/**
 * Extracts data from the HAPI request
 * Decodes JSON/CSV encoded parameters
 * @param {Object} request - HAPI request interface
 * @param {Object} config - HAPI PG REST API config object
 * @return {Object} request data
 */
const getRequestData = (request, config) => {
  const { filter: filterStr, sort, pagination, columns } = request.query

  const filter = filterStr ? JSON.parse(filterStr) : {}

  if (request.params.id) {
    filter[config.primaryKey] = request.params.id
  }

  const query = {
    filter,
    sort: sort ? JSON.parse(sort) : {},
    pagination: pagination ? JSON.parse(pagination) : config.pagination,
    columns: columns ? columns.split(',') : null,
    data: request.payload || {}
  }

  // Enable hooks to modify data at this point
  return config.preQuery(query, request)
}

/**
 * Formats standard error reply
 * @param {Object} error
 * @return {Object}
 */
const formatError = (code, errorObj, h) => {
  const error = {
    name: errorObj.name,
    message: errorObj.toString()
  }
  return h.response({ error, data: null }).code(code)
}

/**
 * Converts error code as a string
 * @param  {String|Number} code - error code
 * @return {String}      error code as string
 */
const getStringCode = (code) => {
  return (code || '').toString()
}

/**
 * Checks if 2 postgres error codes are equal
 * @param {Number|String} a - first code to test
 * @param {Number|String} b - second code to test
 * @return {Boolean} true if the same
 */
const isCodeEqual = (a, b) => {
  return getStringCode(a) === getStringCode(b)
}

/**
 * CHecks whether the supplied PG error code should be mapped to a
 * 400 error
 * @param  {String|Number}  code - PostGres error code
 * @return {Boolean}       true if considered 400 error
 */
const isBadRequest = (code) => {
  return isCodeEqual(code, 23505) || isCodeEqual(code, 23502)
}

/**
   * Return a HAPI error response
   * @param {Object} error - PostGres DB response error or internal error
   * @param {Object} h - HAPI HTTP reply interface
   */
const errorReply = (error, h) => {
  console.error(error)
  // Validation error is a bad request - 400
  if (error.name === 'ValidationError') {
    return formatError(400, error, h)
  }
  // Config error - server issue
  if (error.name === 'NotFoundError') {
    return formatError(404, error, h)
  }
  if (error.name === 'NotImplementedError') {
    return formatError(501, error, h)
  }

  // DB error
  const { code } = error
  const statusCode = isBadRequest(code) ? 400 : 500
  return h.response({ error: { name: 'DBError', code }, data: null }).code(statusCode)
}

/**
 * Accepts error response from hapi-pg-rest-api and throws if truthy
 * @param  {Object|null} error [description]
 */
const throwIfError = (error) => {
  if (error) {
    throw new APIClientError(error)
  }
}

module.exports = {
  getRequestData,
  getPaginationResponse,
  errorReply,
  throwIfError,
  isBadRequest
}
