

const Lab = require('lab');
const sortBy = require('lodash/sortBy');
const Code = require('code');
const rp = require('request-promise-native').defaults({
  proxy: null,
  strictSSL: false,
});

const lab = Lab.script();
const server = require('../server.js');

server.start();
const APIClient = require('../src/api-client.js');

const client = new APIClient(rp, {
  endpoint: 'http://localhost:8000/api/1.0/sessions',
});

let sessionId;
let sessionId2;

lab.experiment('Test APIClient', () => {
  // POST
  lab.test('The client should create a record', async () => {
    const data = await client.create({
      ip: '255.255.255.255',
      session_data: JSON.stringify({ api: 'test' }),
    });
    sessionId = data.session_id;
    Code.expect(sessionId).to.be.a.string();

    const data2 = await client.create({
      ip: '127.0.0.1',
      session_data: JSON.stringify({ api: 'test2' }),
    });
    sessionId2 = data2.session_id;
    Code.expect(sessionId2).to.be.a.string();
  });

  // GET one
  lab.test('The client should find a single record', async () => {
    const data = await client.findOne(sessionId);
    Code.expect(data.ip).to.equal('255.255.255.255');
  });

  // GET many
  lab.test('The client should find all records', async () => {
    const data = await client.findMany();
    Code.expect(data.length).to.be.greaterThan(0);
  });

  // GET many - filtered
  lab.test('The client should find records with filtering', async () => {
    const data = await client.findMany({ session_id: sessionId });
    Code.expect(data[0].session_id).to.equal(sessionId);
  });

  // Get many - sorted
  lab.test('The client should find records with sorting', async () => {
    const data = await client.findMany({}, { session_id: 1 });

    const sessionIds = data.map(item => item.session_id);
    const sorted = sortBy(sessionIds);

    Code.expect(sessionIds.join(',')).to.equal(sorted.join(','));
  });

  // Get many - sorted
  lab.test('The client should find records with reverse sorting', async () => {
    const data = await client.findMany({}, { session_id: -1 });

    const sessionIds = data.map(item => item.session_id);
    const reverseSorted = sortBy(sessionIds).reverse();

    Code.expect(sessionIds.join(',')).to.equal(reverseSorted.join(','));
  });

  // PATCH one
  lab.test('The client should update a record', async () => {
    const { data, rowCount } = await client.updateOne(sessionId, { ip: '0.0.0.0' });

    Code.expect(data).to.equal(null);
    Code.expect(rowCount).to.equal(1);
  });

  // PATCH many
  lab.test('The client should update many records', async () => {
    const { rowCount, data } = await client.updateMany({ session_id: [sessionId, sessionId2] }, { ip: '0.0.0.0' });
    Code.expect(rowCount).to.equal(2);
  });

  // DELETE one
  lab.test('The client should delete a record', async () => {
    const res = await client.delete(sessionId);
    console.log(res);
  });

  // Test validation error handling
  lab.test('The client should throw an validation error', async () => {
    try {
      const data = await client.create({
        non_existent_field: 'Invalid',
      });
    }
    catch (error) {
      Code.expect(error.name).to.equal('ValidationError');
    }
  });

  // Test error handling
  lab.test('The client should throw status errors from', async () => {
    try {
      const client2 = new APIClient(rp, {
        endpoint: 'http://localhost:8000/api/1.0/session',
      });
      const data = await client2.create({
        non_existent_field: 'Invalid',
      });
    }
    catch (error) {
      Code.expect(error.name).to.equal('StatusCodeError');
    }
  });
});

exports.lab = lab;
