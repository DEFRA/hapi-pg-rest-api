const controller = require('./controller');
const schemaController = require('./schema-controller');

const createRoute = (config, method, handler, isMany = false) => {
  const { endpoint, table } = config;
  const description = `${method} ${isMany ? 'many' : 'single'} ${table} ${isMany ? 'records' : 'record'}`;
  const path = (isMany || method === 'POST') ? endpoint : `${endpoint}/{id*}`;
  const route = {
    method,
    path,
    handler,
    config: {
      description,
      plugins: {
        hapiPgRestAPI: config
      }
    }
  };

  if (config.maxPayloadBytes && ['POST', 'PUT', 'PATCH'].includes(method)) {
    route.config.payload = {
      maxBytes: config.maxPayloadBytes
    };
  }

  return route;
};

const createSchemaRoute = (config) => {
  const { endpoint, table } = config;
  return {
    method: 'GET',
    path: `${endpoint}/schema`,
    handler: schemaController.getSchema,
    config: {
      description: `Get API schema definition for ${table}`,
      plugins: {
        hapiPgRestAPI: config
      }
    }
  };
};

module.exports = (config) => {
  const { connection, ...rest } = config;

  return {
    findManyRoute: createRoute(rest, 'GET', controller.findMany, true),
    findOneRoute: createRoute(rest, 'GET', controller.findOne),
    createRoute: createRoute(rest, 'POST', controller.create),
    updateOneRoute: createRoute(rest, 'PATCH', controller.updateOne),
    replaceOneRoute: createRoute(rest, 'PUT', controller.replaceOne),
    deleteOneRoute: createRoute(rest, 'DELETE', controller.deleteOne),
    updateManyRoute: createRoute(rest, 'PATCH', controller.updateMany, true),
    schemaDefinitionRoute: createSchemaRoute(rest),
    deleteManyRoute: createRoute(rest, 'DELETE', controller.deleteMany, true)
  };
};
