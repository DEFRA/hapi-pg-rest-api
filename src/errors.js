/**
 * Error classes
 * @module errors
 */
const ExtendableError = require('es6-error');

/**
 * An error class for when API class has been instantiated with incorrect
 * config object
 * @class ConfigError
 */
class ConfigError extends ExtendableError {}

/**
 * An error class for when HTTP request params/payload fail validation
 * @class ValidationError
 */
class ValidationError extends ExtendableError {}

/**
 * An error class for when the requested data was not found in the DB
 * @class NotFoundError
 */
class NotFoundError extends ExtendableError {}

class NotImplementedError extends ExtendableError {}

module.exports = {
  ConfigError,
  ValidationError,
  NotFoundError,
  NotImplementedError
};
