

const Lab = require('lab');

const lab = Lab.script();
const sortBy = require('lodash/sortBy');

const Code = require('code');
const server = require('../server.js');

server.start();
const APIClient = require('../src/api-client.js');

const rp = require('request-promise-native').defaults({
  proxy: null,
  strictSSL: false,
});

const client = new APIClient(rp, {
  endpoint: 'http://localhost:8000/api/1.0/sessions',
});

let sessionId;

lab.experiment('Test APIClient', () => {
  lab.test('The client should create a record', async () => {
    const data = await client.create({
      ip: '255.255.255.255',
      session_data: JSON.stringify({ api: 'test' }),
    });

    sessionId = data.session_id;

    Code.expect(sessionId).to.be.a.string();
  });
});

exports.lab = lab;
