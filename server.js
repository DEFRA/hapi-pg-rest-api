/**
 * HAPI server used for testing
 */
require('dotenv').config();
const Hapi = require('hapi');
const Blipp = require('blipp');
const SessionsApi = require('./sessions-api.js');
const SessionsApiContext = require('./sessions-api-context.js');
const AutoPKApi = require('./auto-pk-api.js');
const NumericPKApi = require('./numeric-pk-api.js');
const pool = require('./db');

// Create a server with a host and port
// const server = new Hapi.Server({ debug: { request: ['error'] } });
const server = new Hapi.Server({
  host: 'localhost',
  port: 8000
});

server.route([
  ...SessionsApi(pool).getRoutes(),
  ...SessionsApiContext(pool).getRoutes(),
  ...AutoPKApi(pool).getRoutes(),
  ...NumericPKApi(pool).getRoutes()
]);

async function start () {
  await server.register({
    plugin: Blipp
  });

  // Start the server if not testing with Lab
  // if (!module.parent) {
  await server.start();
  console.log(`Server running at: ${server.info.uri}`);
  // }
}

start();

module.exports = server;
