const { mapValues } = require('lodash');

const getSchema = async (request, h) => {
  const config = request.route.settings.plugins.hapiPgRestAPI;
  const { table, primaryKey, primaryKeyAuto, primaryKeyGuid } = config;
  const required = [];
  const properties = mapValues(config.validation, (value, key) => {
    // Required fields
    if (value._flags.presence === 'required') {
      required.push(key);
    }
    const field = {
      type: value._type
    };

    // Joi Tests
    value._tests.forEach((test) => {
      if (test.name === 'min') {
        field.minLength = test.arg;
      }
      if (test.name === 'max') {
        field.maxLength = test.arg;
      }
      if (test.name === 'email') {
        field.format = 'email';
      }
      if (test.name === 'guid') {
        field.pattern = '/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i';
      }
    });

    return field;
  });

  const jsonSchema = {
    title: table,
    type: 'object',
    properties,
    required
  };

  return h.response({
    error: null,
    data: {
      jsonSchema,
      config: {
        primaryKey,
        primaryKeyAuto,
        primaryKeyGuid
      }
    }
  });
};

module.exports = {
  getSchema
};
