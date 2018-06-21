/**
 * Provides a quick way to get an API client for the REST API HAPI server
 * @module api-client
 * @class APIClient
 */
const forEach = require('lodash/forEach');

class APIClient {
  /**
   * Constructor
   * @param {Function} rp - request-promise-native instance
   * @param {Object} config
   * @param {String} config.endpoint
   */
  constructor (rp, config = {}) {
    const defaults = {
      headers: {}
    };
    this.config = Object.assign({}, defaults, config);
    this.rp = rp;
    this.urlParams = {};
  }

  /**
   * Sets context, e.g. when endpoint is like /api/{someId}/entity/{id}
   * @param {Object} URL context params
   */
  setParams (urlParams = {}) {
    this.urlParams = urlParams;
    return this;
  }

  /**
   * Get URL for call
   * @param {Mixed} [id] - the ID of the entity to get/update/delete
   * @return {String} URL
   */
  getUrl (id) {
    let url = id ? `${this.config.endpoint}/${id}` : this.config.endpoint;
    // Replace context params in URL
    forEach(this.urlParams, (val, key) => {
      url = url.replace(`{${key}}`, val);
    });
    return url;
  }

  /**
   * Create record
   * @param {Object} data - the model data to post
   * @param {Array} [columns] - the columns to return on insert
   * @return {Promise} - resolves with new row data on success
   */
  async create (body, columns = null) {
    const qs = columns ? {
      columns: columns.join(',')
    } : null;
    return this.makeRequest({
      uri: this.getUrl(),
      method: 'POST',
      body,
      headers: this.config.headers,
      json: true,
      qs
    });
  }

  /**
   * Find one record
   * @param {String} id
   * @param {Array} [columns] - an array containing column names to select
   * @return {Promise} resolves with single record if found
   */
  async findOne (id, columns = null) {
    const qs = columns ? {
      columns: columns.join(',')
    } : null;

    return this.makeRequest({
      uri: this.getUrl(id),
      method: 'GET',
      headers: this.config.headers,
      json: true,
      qs
    });
  }

  /**
   * Find many records
   * @param {Object} [filter] an object describing which fields to query
   * @param {Object} [sort] an object describing which fields to sort on
   * @param {Object} [pagination] - e.g. {page : 5, perPage, 20}
   * @param {Array} [columns] - an array containing field names to select
   */
  async findMany (filter = {}, sort = {}, pagination = null, columns = null) {
    const qs = {
      filter: JSON.stringify(filter),
      sort: JSON.stringify(sort)
    };
    if (pagination) {
      qs.pagination = JSON.stringify(pagination);
    }
    if (columns) {
      qs.columns = columns.join(',');
    }

    return this.makeRequest({
      uri: this.getUrl(),
      method: 'GET',
      headers: this.config.headers,
      qs,
      json: true
    });
  }

  /**
   * Update one record
   * @param {String} id - the primary key value
   * @param {Object} body - the data to update
   * @param {Array} [columns] - the columns to select
   * @return {Promise} - resolves with API response
   */
  async updateOne (id, body, columns = null) {
    const qs = columns ? {
      columns: columns.join(',')
    } : null;
    return this.makeRequest({
      uri: this.getUrl(id),
      method: 'PATCH',
      headers: this.config.headers,
      body,
      json: true,
      qs
    });
  }

  /**
   * Update many records
   * @param {Object} filter - filter rows for updating
   * @param {Object} body - the data to update
   * @return {Promise} - resolves with {data, rowCount}
   */
  async updateMany (filter, body) {
    return this.makeRequest({
      uri: this.getUrl(),
      method: 'PATCH',
      headers: this.config.headers,
      body,
      qs: { filter: JSON.stringify(filter) },
      json: true
    });
  }

  /**
   * Delete record
   * @param {String|Object} id - the ID of the row to delete, or filter object
   * @return {Promise} - resolves when deleted
   */
  async delete(id) {
    let options;

    if (typeof (id) === 'string') {
      options = {
        uri: this.getUrl(id),
        method: 'DELETE',
        headers: this.config.headers,
        json: true,
      };
    }
    else {
      options = {
        uri: this.getUrl(),
        method: 'DELETE',
        headers: this.config.headers,
        json: true,
        qs: { filter: JSON.stringify(id) },
      };
    }

    return this.makeRequest(options);
  }

  /**
   * Get schema
   * @return {Promise} - resolves with schema data {jsonSchema : {}, config : {}}
   */
  async schema () {
    return this.makeRequest({
      uri: this.getUrl('schema'),
      method: 'GET',
      headers: this.config.headers,
      json: true
    });
  }

  /**
   * Make request with request-promise-native
   * @param {Object} options - request promise options
   */
  async makeRequest (options) {
    try {
      return await this.rp(options);
    } catch (error) {
      // API error
      if (error.error.error.name) {
        return { data: null, error: error.error.error };
      }
      // Rethrow other error
      throw error;
    }
  }
}

module.exports = APIClient;
