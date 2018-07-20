const Joi = require('joi');
const HAPIRestAPI = require('./src/rest-api');
const pool = require('./db');

module.exports = new HAPIRestAPI({
  table: 'sessions',
  connection: pool,
  primaryKey: 'session_id',
  endpoint: '/api/1.0/sessions',
  onCreateTimestamp: 'date_created',
  onUpdateTimestamp: 'date_updated',
  upsert: {
    fields: ['session_id'],
    set: ['session_data']
  },
  postSelect: data => data.map((row, i) =>
    // Add a calculated field to data output
    ({
      added_field: `ROW-${i}`,
      ...row
    })),
  validation: {
    session_id: Joi.string().guid(),
    ip: Joi.string(),
    session_data: Joi.string(),
    date_created: Joi.string(),
    date_updated: Joi.string().allow(null),
    email: Joi.string().email().lowercase().trim()
  },
  showSql: true
});
