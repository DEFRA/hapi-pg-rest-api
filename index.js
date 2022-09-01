const { throwIfError } = require('./src/helpers')

module.exports = require('./src/rest-api.js')

module.exports.APIClient = require('./src/api-client.js')

module.exports.manager = require('./src/manager.js')

module.exports.throwIfError = throwIfError
