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
  constructor(rp, config = {}) {
    const defaults = {
      headers: {},
    };
    this.config = Object.assign({}, defaults, config);
    this.rp = rp;
    this.urlParams = {};
  }


  /**
   * Sets context, e.g. when endpoint is like /api/{someId}/entity/{id}
   * @param {Object} URL context params
   */
  setParams(urlParams = {}) {
    this.urlParams = urlParams;
    return this;
  }

  /**
   * Get URL for call
   * @param {Mixed} [id] - the ID of the entity to get/update/delete
   * @return {String} URL
   */
  getUrl(id) {
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
   * @return {Promise} - resolves with new row data on success
   */
  async create(body) {
    return this.makeRequest({
      uri: this.getUrl(),
      method: 'POST',
      body,
      headers: this.config.headers,
      json: true,
    });
  }

  /**
   * Find one record
   * @param {String} id
   * @return {Promise} resolves with single record if found
   */
  async findOne(id) {
    return this.makeRequest({
      uri: this.getUrl(id),
      method: 'GET',
      headers: this.config.headers,
      json: true,
    });
  }

  /**
   * Find many records
   * @param {Object} filter
   * @param {Object} sort
   * @param {Object} pagination - e.g. {page : 5, perPage, 20}
   */
  async findMany(filter = {}, sort = {}, pagination = null) {
    const qs = {
      filter: JSON.stringify(filter),
      sort: JSON.stringify(sort),
    };
    if (pagination) {
      qs.pagination = JSON.stringify(pagination);
    }

    return this.makeRequest({
      uri: this.getUrl(),
      method: 'GET',
      headers: this.config.headers,
      qs,
      json: true,
    });
  }

  /**
   * Update one record
   * @param {String} id - the primary key value
   * @param {Object} body - the data to update
   * @return {Promise} - resolves with API response
   */
  async updateOne(id, body) {
    return this.makeRequest({
      uri: this.getUrl(id),
      method: 'PATCH',
      headers: this.config.headers,
      body,
      json: true,
    });
  }

  /**
   * Update many records
   * @param {Object} filter - filter rows for updating
   * @param {Object} body - the data to update
   * @return {Promise} - resolves with {data, rowCount}
   */
  async updateMany(filter, body) {
    return this.makeRequest({
      uri: this.getUrl(),
      method: 'PATCH',
      headers: this.config.headers,
      body,
      qs: { filter: JSON.stringify(filter) },
      json: true,
    });
  }

  /**
    * Delete record
    * @param {String} id - the ID of the row to delete
    * @return {Promise} - resolves when deleted
    */
  async delete(id) {
    return this.makeRequest({
      uri: this.getUrl(id),
      method: 'DELETE',
      headers: this.config.headers,
      json: true,
    });
  }

  /**
   * Make request with request-promise-native
   * @param {Object} options - request promise options
   */
  async makeRequest(options) {
    try {
      return await this.rp(options);
    }
    catch (error) {
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
