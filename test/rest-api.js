// 'use strict'
const Lab = require('lab');

const lab = Lab.script();
const sinon = require('sinon');
const Db = require('../db.js');
const server = require('../server.js');
const Code = require('code');
const RestApi = require('../src/rest-api.js');

let sandbox;

lab.experiment('Test REST API', () => {
  lab.test('Throw error if no validation constraints supplied', async () => {
    try {
      new RestApi({});
    }
    catch (error) {
      Code.expect(error.name).to.equal('ConfigError');
    }
  });

  lab.test('The API should return 400 if DB unique constraint error', async () => {
    sandbox = sinon.sandbox.create();
    const query = sandbox.stub(Db, 'query');
    query.throws({
      code: 23505,
    });

    const request = {
      method: 'POST',
      url: '/api/1.0/sessions',
      payload: {
        ip: '127.0.0.1',
        session_data: JSON.stringify({ username: 'bob' }),
      },
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
      code: 'P0000',
    });

    const request = {
      method: 'POST',
      url: '/api/1.0/sessions',
      payload: {
        ip: '127.0.0.1',
        session_data: JSON.stringify({ username: 'bob' }),
      },
    };

    const res = await server.inject(request);
    Code.expect(res.statusCode).to.equal(500);

    const payload = JSON.parse(res.payload);
    Code.expect(payload.error.name).to.equal('DBError');

    sandbox.restore();
  });
});

exports.lab = lab;
