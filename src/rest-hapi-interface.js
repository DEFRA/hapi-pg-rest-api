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
  constructor(config) {
    this.config = config;
  }

  // Methods
  findOne(request, reply) {
  }
  findMany(request, reply) {
  }
  create(request, reply) {
  }
  updateOne(request, reply) {
  }
  updateMany(request, reply) {
  }
  replace(request, reply) {
  }
  delete(request, reply) {
  }
  schemaDefinition(request, reply) {
  }

  /**
   * Get HAPI API handler for GET single record
   * @return Object
   */
  findManyRoute() {
    const { endpoint, table } = this.config;
    return {
      method: 'GET',
      path: endpoint,
      handler: this.findMany.bind(this),
      config: {
        description: `Get many ${table} records`,
      },
    };
  }

  /**
   * Get HAPI API handler for GET single record
   * @return Object
   */
  findOneRoute() {
    const { endpoint, table } = this.config;
    return {
      method: 'GET',
      path: `${endpoint}/{id}`,
      handler: this.findOne.bind(this),
      config: {
        description: `Get single ${table} record`,
      },
    };
  }

  /**
   * Get HAPI API handler for POST new record
   * @return Object
   */
  createRoute() {
    const { endpoint, table } = this.config;
    return {
      method: 'POST',
      path: endpoint,
      handler: this.create.bind(this),
      config: {
        description: `Create new ${table} record`,
      },
    };
  }

  /**
   * Get HAPI API handler for PATCH single record
   * @return Object
   */
  updateOneRoute() {
    const { endpoint, table } = this.config;
    return {
      method: 'PATCH',
      path: `${endpoint}/{id}`,
      handler: this.updateOne.bind(this),
      config: {
        description: `Patch single ${table} record`,
      },
    };
  }


  /**
   * Get HAPI API handler for PUT single record
   * @return Object
   */
  replaceOneRoute() {
    const { endpoint, table } = this.config;
    return {
      method: 'PUT',
      path: `${endpoint}/{id}`,
      handler: this.replace.bind(this),
      config: {
        description: `Replace single ${table} record`,
      },
    };
  }


  /**
   * Get HAPI API handler for DELETE single record
   * @return Object
   */
  deleteOneRoute() {
    const { endpoint, table } = this.config;
    return {
      method: 'DELETE',
      path: `${endpoint}/{id}`,
      handler: this.delete.bind(this),
      config: {
        description: `Delete single ${table}record`,
      },
    };
  }


  /**
   * Get HAPI API handler for PATCH many records
   * @return Object
   */
  updateManyRoute() {
    const { endpoint, table } = this.config;
    return {
      method: 'PATCH',
      path: `${endpoint}`,
      handler: this.updateMany.bind(this),
      config: {
        description: `Patch many ${table} records`,
      },
    };
  }


  /**
   * Get HAPI API handler for schema
   * @return Object
   */
  schemaDefinitionRoute() {
    const { endpoint, table } = this.config;
    return {
      method: 'GET',
      path: `${endpoint}/schema`,
      handler: this.schemaDefinition.bind(this),
      config: {
        description: `Get API schema definition for ${table}`,
      },
    };
  }


  /**
   * Get HAPI route config for API
   * @return {Array} - HAPI route config
   */
  getRoutes() {
    return [
      this.findManyRoute(),
      this.findOneRoute(),
      this.createRoute(),
      this.updateOneRoute(),
      this.replaceOneRoute(),
      this.deleteOneRoute(),
      this.updateManyRoute(),
      this.schemaDefinitionRoute(),
    ];
  }
}


module.exports = RestHAPIInterface;
