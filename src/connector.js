const rp = require('request-promise-native').defaults({
  proxy: null,
  strictSSL: false,
});

class Connector {
  /**
   * Constructor
   * @param {Object} config
   * @param {String} config.endpoint
   */
  constructor(config) {
    const defaults = {
      headers: {},
    };
    this.config = Object.assign({}, defaults, config);
  }

  /**
   * Create record
   * @param {Object} data - the model data to post
   * @return {Promise} - resolves with new row data on success
   */
  async create(body) {
    const { error, data } = await rp({
      url: this.config.endpoint,
      method: 'POST',
      body,
      headers: this.config.headers,
    });
    if (error) {
      throw error;
    }
    return data;
  }

  /**
   * Find one record
   * @param {String} id
   * @return {Promise} resolves with single record if found
   */
  async findOne(id) {
    const { error, data } = await rp({
      url: `${this.config.endpoint}/${id}`,
      method: 'GET',
      headers: this.config.headers,
    });
    if (error) {
      throw error;
    }
    return data;
  }

  /**
   * Find many records
   * @param {Object} filter
   * @param {Object} sort
   */
  async findMany(filter = {}, sort = {}) {
    const { error, data } = await rp({
      url: `${this.config.endpoint}`,
      method: 'GET',
      headers: this.config.headers,
      qs: {
        filter, sort,
      },
    });
    if (error) {
      throw error;
    }
    return data;
  }
}

module.exports = Connector;
