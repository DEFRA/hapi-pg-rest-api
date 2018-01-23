const Joi = require('joi');
const HAPIRestAPI = require('./src/rest-api');

module.exports = pool => new HAPIRestAPI({
  table: 'sessions',
  connection: pool,
  primaryKey: 'session_id',
  endpoint: '/api/1.0/{ip}/sessions',
  onCreateTimestamp: 'date_created',
  onUpdateTimestamp: 'date_updated',
  preQuery: (result, hapiRequest) => {
    result.filter.ip = hapiRequest.params.ip;
    result.data.ip = hapiRequest.params.ip;
    return result;
  },
  upsert: {
    fields: ['session_id'],
    set: ['session_data'],
  },
  validation: {
    session_id: Joi.string().guid(),
    ip: Joi.string(),
    session_data: Joi.string(),
    date_created: Joi.string(),
    date_updated: Joi.string().allow(null),
  },
});
