/**
 * Provides a quick way to get an API client for the REST API HAPI server
 * @module api-client
 * @class APIClient
 */

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
  }

  /**
   * Create record
   * @param {Object} data - the model data to post
   * @return {Promise} - resolves with new row data on success
   */
  async create(body) {
    return this.makeRequest({
      uri: this.config.endpoint,
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
      uri: `${this.config.endpoint}/${id}`,
      method: 'GET',
      headers: this.config.headers,
      json: true,
    });
  }

  /**
   * Find many records
   * @param {Object} filter
   * @param {Object} sort
   */
  async findMany(filter = {}, sort = {}) {
    return this.makeRequest({
      uri: `${this.config.endpoint}`,
      method: 'GET',
      headers: this.config.headers,
      qs: {
        filter: JSON.stringify(filter),
        sort: JSON.stringify(sort),
      },
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
      uri: `${this.config.endpoint}/${id}`,
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
      uri: `${this.config.endpoint}`,
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
      uri: `${this.config.endpoint}/${id}`,
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
      const { data, rowCount } = await this.rp(options);
      if (typeof (rowCount) === 'number') {
        return { data, rowCount };
      }
      return data;
    }
    catch (error) {
      // API error
      if (error.error.error.name) {
        throw error.error.error;
      }
      // Rethrow other error
      else {
        throw error;
      }
    }
  }
}

module.exports = APIClient;