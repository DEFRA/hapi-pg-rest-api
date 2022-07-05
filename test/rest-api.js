// 'use strict'
const Lab = require('@hapi/lab');

const lab = Lab.script();
const sinon = require('sinon');
const Db = require('../db.js');
const server = require('../server.js');
const Code = require('@hapi/code');
const RestApi = require('../src/rest-api.js');
const Sessions = require('../sessions-api.js');

let sandbox;

lab.experiment('Test REST API', () => {
  lab.test('Throw error if no validation constraints supplied', async () => {
    try {
      new RestApi({});
    } catch (error) {
      Code.expect(error.name).to.equal('ConfigError');
    }
  });

  lab.test('The API should return 400 if DB unique constraint error', async () => {
    sandbox = sinon.sandbox.create();
    const query = sandbox.stub(Db, 'query');
    query.throws({
      code: 23505
    });

    const request = {
      method: 'POST',
      url: '/api/1.0/sessions',
      payload: {
        ip: '127.0.0.1',
        session_data: JSON.stringify({ username: 'bob' })
      }
    };

    const res = await server.inject(request);
    Code.expect(res.statusCode).to.equal(400);

    const payload = JSON.parse(res.payload);
    Code.expect(payload.error.name).to.equal('DBError');

    sandbox.restore();
  });

  lab.test('The API should return 500 for other DB errors', async () => {
    sandbox = sinon.sandbox.create();
    const query = sandbox.stub(Db, 'query');
    query.throws({
      code: 'P0000'
    });

    const request = {
      method: 'POST',
      url: '/api/1.0/sessions',
      payload: {
        ip: '127.0.0.1',
        session_data: JSON.stringify({ username: 'bob' })
      }
    };

    const res = await server.inject(request);
    Code.expect(res.statusCode).to.equal(500);

    const payload = JSON.parse(res.payload);
    Code.expect(payload.error.name).to.equal('DBError');

    sandbox.restore();
  });

  lab.test('The API should make available methods that return HAPI route definitions', async () => {
    Code.expect(Sessions.findManyRoute).to.be.a.function();
    Code.expect(Sessions.findOneRoute).to.be.a.function();
    Code.expect(Sessions.createRoute).to.be.a.function();
    Code.expect(Sessions.updateOneRoute).to.be.a.function();
    Code.expect(Sessions.replaceOneRoute).to.be.a.function();
    Code.expect(Sessions.deleteOneRoute).to.be.a.function();
    Code.expect(Sessions.updateManyRoute).to.be.a.function();
    Code.expect(Sessions.schemaDefinitionRoute).to.be.a.function();
    Code.expect(Sessions.deleteManyRoute).to.be.a.function();
  });

  lab.test('The API should allow customising max payload size on create/update routes', async () => {
    Code.expect(Sessions.routes.findManyRoute.config.payload).to.equal(undefined);
    Code.expect(Sessions.routes.findOneRoute.config.payload).to.equal(undefined);
    Code.expect(Sessions.routes.createRoute.config.payload.maxBytes).to.equal(4096);
    Code.expect(Sessions.routes.updateOneRoute.config.payload.maxBytes).to.equal(4096);
    Code.expect(Sessions.routes.replaceOneRoute.config.payload.maxBytes).to.equal(4096);
    Code.expect(Sessions.routes.deleteOneRoute.config.payload).to.equal(undefined);
    Code.expect(Sessions.routes.updateManyRoute.config.payload.maxBytes).to.equal(4096);
    Code.expect(Sessions.routes.schemaDefinitionRoute.config.payload).to.equal(undefined);
    Code.expect(Sessions.routes.deleteManyRoute.config.payload).to.equal(undefined);
  });
});

exports.lab = lab;
