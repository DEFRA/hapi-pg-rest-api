const { throwIfError } = require('./src/helpers')
const HAPIRestAPI = require('./src/rest-api.js')
const APIClient = require('./src/api-client.js')
const manager = require('./src/manager.js')

module.exports = {
  throwIfError,
  HAPIRestAPI,
  APIClient,
  manager
}
