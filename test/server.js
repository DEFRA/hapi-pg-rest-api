'use strict';
require('dotenv').config();
const Hapi = require('hapi');
const { Pool } = require('pg');
const { promisify } = require('bluebird');
const Joi = require('joi');
const Blipp = require('blipp');

// DB setup
if (process.env.DATABASE_URL) {
  // get db params from env vars
  const workingVariable = process.env.DATABASE_URL.replace('postgres://', '')
  process.env.PGUSER = workingVariable.split('@')[0].split(':')[0]
  process.env.PGPASSWORD = workingVariable.split('@')[0].split(':')[1]
  process.env.PGHOST = workingVariable.split('@')[1].split(':')[0]
  process.env.PSPORT = workingVariable.split('@')[1].split(':')[1].split('/')[0]
  process.env.PGDATABASE = workingVariable.split('@')[1].split(':')[1].split('/')[1]
}

// Create a server with a host and port
const server = new Hapi.Server();
server.connection({
      host: 'localhost',
      port: 8000
});

// Create DB connection
const pool = new Pool(process.env.DATABASE_URL);

const HAPIRestAPI = require('../src/rest-api');
const SessionsApi = new HAPIRestAPI({
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
    date_updated : Joi.string()
  }
});

server.route([
  ...SessionsApi.getRoutes()
]);


server.register({
    // Plugin to display the routes table to console at startup
    // See https://www.npmjs.com/package/blipp
    register: require('blipp'),
    options: {
      showAuth: true
    }
  });



// Start the server
async function start() {

    try {
        await server.start();
    }
    catch (err) {
        console.log(err);
        process.exit(1);
    }

    console.log('Server running at:', server.info.uri);
};

start();
