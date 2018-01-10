'use strict';

/**
 * HAPI server used for testing
 */
require('dotenv').config();
const Hapi = require('hapi');
const { promisify } = require('bluebird');
const Blipp = require('blipp');
const SessionsApi = require('./sessions-api.js');
const pool = require('./db');

// Create a server with a host and port
// const server = new Hapi.Server({ debug: { request: ['error'] } });
const server = new Hapi.Server();
server.connection({
      host: 'localhost',
      port: 8000
});

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
