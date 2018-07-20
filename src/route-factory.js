const Joi = require('joi');
const controller = require('./controller');
const schemaController = require('./schema-controller');
const { set } = require('lodash');

const createRoute = (pluginConfig, method, handler, isMany = false) => {
  const { config } = pluginConfig;
  const { endpoint, table } = config;
  const description = `${method} ${isMany ? 'many' : 'single'} ${table} ${isMany ? 'records' : 'record'}`;
  const path = (isMany || method === 'POST') ? endpoint : `${endpoint}/{id}`;
  return {
    method,
    path,
    handler,
    config: {
      description,
      plugins: {
        hapiPgRestAPI: pluginConfig
      }
    }
  };
};

const createSchemaRoute = (pluginConfig) => {
  const { config: { endpoint, table } } = pluginConfig;
  return {
    method: 'GET',
    path: `${endpoint}/schema`,
    handler: schemaController.getSchema,
    config: {
      description: `Get API schema definition for ${table}`,
      plugins: {
        hapiPgRestAPI: pluginConfig
      }
    }
  };
};

module.exports = (config, repo) => {
  const pluginConfig = {
    config,
    repo
  };

  return {
    findManyRoute: createRoute(pluginConfig, 'GET', controller.findMany, true),
    findOneRoute: createRoute(pluginConfig, 'GET', controller.findOne),
    createRoute: createRoute(pluginConfig, 'POST', controller.create),
    updateOneRoute: createRoute(pluginConfig, 'PATCH', controller.updateOne),
    replaceOne: createRoute(pluginConfig, 'PUT', controller.replaceOne),
    deleteOneRoute: createRoute(pluginConfig, 'DELETE', controller.deleteOne),
    updateManyRoute: createRoute(pluginConfig, 'PATCH', controller.updateMany, true),
    schemaDefinitionRoute: createSchemaRoute(pluginConfig),
    deleteManyRoute: createRoute(pluginConfig, 'DELETE', controller.deleteMany, true)
  };
};
