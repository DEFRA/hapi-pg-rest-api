/**
 * A module to create the interface for the HAPI API routes
 * @module rest-hapi-interface
 */

/**
 * @param {Object} config - configuration options
 * @param {String} config.endpoint - base endpoint, e.g. /crm/1.0/entities
 * @param {String} config.table - DB table name
 * @param {String} config.primaryKey - primary key field name
 * @param {Function} config.preInsert - function for modifying data pre-insert
 * @param {Function} config.onCreateTimestamp - field to update with NOW() on create
 * @param {Function} config.connection - DB connection, e.g. created with Pool
 */
class RestHAPIInterface {
  constructor (config) {
    this.config = config;
  }

  // Methods
  findOne (request, h) {}
  findMany (request, h) {}
  create (request, h) {}
  updateOne (request, h) {}
  updateMany (request, h) {}
  replace (request, h) {}
  delete (request, h) {}
  schemaDefinition (request, h) {}

  /**
   * Get HAPI API handler for GET single record
   * @return Object
   */
  findManyRoute () {
    return this._getRoute('GET', this.findMany.bind(this), true);
  }

  /**
   * Get HAPI API handler for GET single record
   * @return Object
   */
  findOneRoute () {
    return this._getRoute('GET', this.findOne.bind(this));
  }

  /**
   * Get HAPI API handler for POST new record
   * @return Object
   */
  createRoute () {
    return this._getRoute('POST', this.create.bind(this));
  }

  /**
   * Get HAPI API handler for PATCH single record
   * @return Object
   */
  updateOneRoute () {
    return this._getRoute('PATCH', this.updateOne.bind(this));
  }

  /**
   * Get HAPI API handler for PUT single record
   * @return Object
   */
  replaceOneRoute () {
    return this._getRoute('PUT', this.replace.bind(this));
  }

  /**
   * Get HAPI API handler for DELETE single record
   * @return Object
   */
  deleteOneRoute () {
    return this._getRoute('DELETE', this.delete.bind(this));
  }

  /**
   * Get HAPI API handler for DELETE many records
   * @reutrn {Object}
   */
  deleteManyRoute () {
    return this.getRoute('DELETE', this.delete.bind(this), true);
  }

  /**
   * Get HAPI API handler for PATCH many records
   * @return Object
   */
  updateManyRoute () {
    return this._getRoute('PATCH', this.updateMany.bind(this), true);
  }

  _getRoute (method, handler, isMany) {
    const { endpoint, table } = this.config;
    const description = `${method} ${isMany ? 'many' : 'single'} ${table} ${isMany ? 'records' : 'record'}`;
    const path = (isMany || method === 'POST') ? endpoint : `${endpoint}/{id}`;
    return {
      method,
      path,
      handler,
      config: {
        description
      }
    };
  }

  /**
   * Get HAPI API handler for schema
   * @return Object
   */
  schemaDefinitionRoute () {
    const { endpoint, table } = this.config;
    return {
      method: 'GET',
      path: `${endpoint}/schema`,
      handler: this.schemaDefinition.bind(this),
      config: {
        description: `Get API schema definition for ${table}`
      }
    };
  }

  /**
   * Get HAPI route config for API
   * @return {Array} - HAPI route config
   */
  getRoutes () {
    return [
      this.findManyRoute(),
      this.findOneRoute(),
      this.createRoute(),
      this.updateOneRoute(),
      this.replaceOneRoute(),
      this.deleteOneRoute(),
      this.updateManyRoute(),
      this.schemaDefinitionRoute(),
      this.deleteManyRoute()
    ];
  }
}

module.exports = RestHAPIInterface;
