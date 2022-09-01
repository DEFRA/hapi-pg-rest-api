const Joi = require('joi')
const HAPIRestAPI = require('./src/rest-api')
const pool = require('./db')

module.exports = new HAPIRestAPI({
  table: 'numericpk_test',
  connection: pool,
  primaryKey: 'id',
  endpoint: '/api/1.0/numericpk',
  primaryKeyAuto: false,
  primaryKeyGuid: false,
  validation: {
    id: Joi.number(),
    name: Joi.string()
  }
})
