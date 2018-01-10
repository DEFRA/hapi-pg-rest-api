'use strict';

/**
 * HAPI server used for testing
 */

require('dotenv').config();
const Hapi = require('hapi');
const { Pool } = require('pg');
const { promisify } = require('bluebird');
const Blipp = require('blipp');
const SessionsApi = require('./sessions-api.js');

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
// const server = new Hapi.Server({ debug: { request: ['error'] } });
const server = new Hapi.Server();
server.connection({
      host: 'localhost',
      port: 8000
});

// Create DB connection
const pool = new Pool(process.env.DATABASE_URL);

server.route([
  ...SessionsApi(pool).getRoutes()
]);

server.register({
    // Plugin to display the routes table to console at startup
    // See https://www.npmjs.com/package/blipp
    register: require('blipp'),
    options: {
      showAuth: true
    }
});


// Start the server if not testing with Lab
if (!module.parent) {
  server.start((err) => {
    if (err) {
      throw err
    }
    console.log(`Server running at: ${server.info.uri}`)
  })
}
module.exports = server
