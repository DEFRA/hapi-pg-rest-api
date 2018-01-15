/**
 * Error classes
 * @module errors
 */

/**
 * An error class for when API class has been instantiated with incorrect
 * config object
 * @class ConfigError
 */
class ConfigError extends Error {
  constructor(message) {
    super(message);
    this.name = 'ConfigError';
  }
}

/**
 * An error class for when HTTP request params/payload fail validation
 * @class ValidationError
 */
class ValidationError extends Error {
  constructor(message) {
    super(message);
    this.name = 'ValidationError';
  }
}

/**
 * An error class for when the requested data was not found in the DB
 * @class NotFoundError
 */
class NotFoundError extends Error {
  constructor(message) {
    super(message);
    this.name = 'NotFoundError';
  }
}

module.exports = {
  ConfigError,
  ValidationError,
  NotFoundError,
};
