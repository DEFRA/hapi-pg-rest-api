const Joi = require('joi');
const HAPIRestAPI = require('./src/rest-api');

module.exports = (pool) => {
  return new HAPIRestAPI({
    table : 'test.sessions',
    connection : pool,
    primaryKey : 'session_id',
    endpoint : '/api/1.0/sessions',
    onCreateTimestamp : 'date_created',
    onUpdateTimestamp : 'date_updated',
    validation : {
      session_id : Joi.string().guid(),
      ip : Joi.string(),
      session_data : Joi.string(),
      date_created : Joi.string(),
      date_updated : Joi.string().allow(null)
    }
  });
}
