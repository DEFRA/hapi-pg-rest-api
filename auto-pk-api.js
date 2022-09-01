const Joi = require('joi')
const HAPIRestAPI = require('./src/rest-api')
const pool = require('./db')

module.exports = new HAPIRestAPI({
  table: 'autopk_test',
  connection: pool,
  primaryKey: 'id',
  endpoint: '/api/1.0/autopk',
  primaryKeyAuto: true,
  primaryKeyGuid: false,
  validation: {
    id: Joi.number(),
    name: Joi.string()
  }
})
