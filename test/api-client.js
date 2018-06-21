const Lab = require('lab');
const sortBy = require('lodash/sortBy');
const Code = require('code');
const rp = require('request-promise-native').defaults({
  proxy: null,
  strictSSL: false
});

const lab = Lab.script();
require('../server.js');

// server.start();
const APIClient = require('../src/api-client.js');

const client = new APIClient(rp, {
  endpoint: 'http://localhost:8000/api/1.0/sessions'
});

const client2 = new APIClient(rp, {
  endpoint: 'http://localhost:8000/api/1.0/{ip}/sessions'
});

let sessionId;
let sessionId2;

lab.experiment('Test APIClient', () => {
  // GET schema
  lab.test('The client should get the API schema', async () => {
    const { data } = await client.schema();

    Code.expect(data.jsonSchema).to.be.an.object();
    Code.expect(data.config).to.be.an.object();
  });

  // POST
  lab.test('The client should create a record', async () => {
    const { data } = await client.create({
      ip: '255.255.255.255',
      session_data: JSON.stringify({ api: 'test' })
    });
    sessionId = data.session_id;
    Code.expect(sessionId).to.be.a.string();

    const { data: data2 } = await client.create({
      ip: '127.0.0.1',
      session_data: JSON.stringify({ api: 'test2' })
    });
    sessionId2 = data2.session_id;
    Code.expect(sessionId2).to.be.a.string();
  });

  // POST
  lab.test('The client should create a record and only return certain columns', async () => {
    const { data } = await client.create({
      ip: '255.255.255.255',
      session_data: JSON.stringify({ api: 'test' })
    }, ['ip']);

    const keys = Object.keys(data);
    Code.expect(keys).to.equal(['ip']);
  });

  // GET one
  lab.test('The client should find a single record', async () => {
    const { data } = await client.findOne(sessionId);
    Code.expect(data.ip).to.equal('255.255.255.255');
  });

  lab.test('The client should find a single record and only select certain fields', async () => {
    const { data } = await client.findOne(sessionId, ['session_data']);
    Code.expect(Object.keys(data)).to.equal(['added_field', 'session_data']);
  });

  // GET many
  lab.test('The client should find all records', async () => {
    const { data } = await client.findMany();
    Code.expect(data.length).to.be.greaterThan(0);
  });

  lab.test('The client should find all records and only select certain fields', async () => {
    const { data } = await client.findMany({}, {}, null, ['session_data']);
    Code.expect(Object.keys(data[0])).to.equal(['added_field', 'session_data']);
  });

  lab.test('The client should paginate results', async () => {
    const { data, pagination } = await client.findMany({}, {}, { perPage: 1, page: 2 });
    Code.expect(pagination.page).to.equal(2);
    Code.expect(data.length).to.equal(1);
  });

  // GET many with pagination
  lab.test('The client should find all records', async () => {
    const { data } = await client.findMany({}, {}, { page: 1, perPage: 1 });
    Code.expect(data.length).to.equal(1);
  });

  // GET many - filtered
  lab.test('The client should find records with filtering', async () => {
    const { data } = await client.findMany({ session_id: sessionId });
    Code.expect(data[0].session_id).to.equal(sessionId);
  });

  // Get many - sorted
  lab.test('The client should find records with sorting', async () => {
    const { data } = await client.findMany({}, { session_id: 1 });

    const sessionIds = data.map(item => item.session_id);
    const sorted = sortBy(sessionIds);

    Code.expect(sessionIds.join(',')).to.equal(sorted.join(','));
  });

  // Get many - sorted
  lab.test('The client should find records with reverse sorting', async () => {
    const { data } = await client.findMany({}, { session_id: -1 });

    const sessionIds = data.map(item => item.session_id);
    const reverseSorted = sortBy(sessionIds).reverse();

    Code.expect(sessionIds.join(',')).to.equal(reverseSorted.join(','));
  });

  // GET many with URL params
  lab.test('The client should find all records with URL params', async () => {
    const { data } = await client2.setParams({ ip: '127.0.0.1' }).findMany();

    Code.expect(data).to.be.an.array();

    data.forEach((row) => {
      Code.expect(row.ip).to.equal('127.0.0.1');
    });
  });

  // PATCH one
  lab.test('The client should update a record', async () => {
    const { data, rowCount } = await client.updateOne(sessionId, { ip: '0.0.0.0' });

    Code.expect(data.ip).to.equal('0.0.0.0');
    Code.expect(rowCount).to.equal(1);
  });

  // PATCH many
  lab.test('The client should update many records', async () => {
    const { rowCount } = await client.updateMany({ session_id: { $or: [sessionId, sessionId2] } }, { ip: '0.0.0.0' });
    Code.expect(rowCount).to.equal(2);
  });

  // DELETE one
  lab.test('The client should delete a record', async () => {
    const res = await client.delete(sessionId);
    Code.expect(res.error).to.equal(null);
  });

  // DELETE many
  lab.test('The client should delete many records with filter criteria', async () => {
    const { data: { session_id: id1 } } = await client.create({
      ip: '123.123.123.001',
      session_data: JSON.stringify({ api: 'test' })
    });
    const { data: { session_id: id2 } } = await client.create({
      ip: '123.123.123.002',
      session_data: JSON.stringify({ api: 'test' })
    });

    const filter = {
      session_id: { $or: [id1, id2] }
    };
    const { rowCount, error } = await client.delete(filter);

    Code.expect(error).to.equal(null);
    Code.expect(rowCount).to.equal(2);
  });

  // Test validation error handling
  lab.test('The client should throw an validation error', async () => {
    const { error } = await client.create({
      non_existent_field: 'Invalid'
    });
    Code.expect(error.name).to.equal('ValidationError');
  });

  // Test error handling
  lab.test('The client should throw status errors', async () => {
    try {
      const client2 = new APIClient(rp, {
        endpoint: 'http://localhost:8000/api/1.0/session'
      });
      await client2.create({
        non_existent_field: 'Invalid'
      });
    } catch (error) {
      Code.expect(error.name).to.equal('StatusCodeError');
    }
  });
});

exports.lab = lab;
