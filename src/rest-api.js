/**
 * A module to create a HAPI REST API connected to a PostGreSQL table
 * to reduce boilerplate code
 * @module rest-api
 */
const { ConfigError } = require('./errors');
const routeFactory = require('./route-factory');
const manager = require('./manager');

class HAPIRestAPI {
  constructor (config) {
    // Require validation
    if (!config.validation) {
      throw new ConfigError('Validation missing from API config');
    }

    // Create config object with defaults
    this.config = Object.assign({
      name: config.name || config.endpoint.split('/').pop(),
      // Modify data pre-insert
      preInsert: data => data,
      preUpdate: data => data,
      preQuery: result => result,
      postSelect: data => data,
      upsert: null,
      primaryKeyAuto: false,
      primaryKeyGuid: true,
      pagination: {
        page: 1,
        perPage: 100
      }
    }, config);

    manager.create(this.config);

    this.repo = manager.create(this.config);

    this.routes = routeFactory(this.config);

    // Add routes as methods to this instance for backwards compatability
    for (let routeName in this.routes) {
      this[routeName] = this.routes[routeName];
    }
  }

  /**
   * Get all routes as array
   * @return {Array}
   */
  getRoutes () {
    return Object.values(this.routes);
  }
}

module.exports = HAPIRestAPI;
