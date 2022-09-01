/**
 * Repository manager - to centrally manage repository instances
 */
const Repository = require('./repository.js')

class RepositoryManager {
  constructor () {
    this.repository = {}
  }

  /**
     * Creates a new repository
     * @param {Object} config - the HAPI PG rest API config object
     * @return {Object} created repository
     */
  create (config) {
    const { name } = config
    // Create repo
    this.repository[name] = new Repository(config)
    return this.repository[name]
  }

  /**
   * Get named repository
   * @param {String} name
   * @return {Object} repository instance
   */
  get (name) {
    return this.repository[name]
  }
}

const manager = new RepositoryManager()
module.exports = manager
