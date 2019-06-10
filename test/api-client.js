const sinon = require('sinon');
const sortBy = require('lodash/sortBy');
const { expect } = require('code');
const rp = require('request-promise-native').defaults({
  proxy: null,
  strictSSL: false
});

const { experiment, test, before, after } = exports.lab = require('lab').script();
require('../server.js');

// server.start();
const APIClient = require('../src/api-client.js');

const client = new APIClient(rp, {
  endpoint: 'http://localhost:8000/api/1.0/sessions',
  logger: {
    error: sinon.spy()
  }
});

const client2 = new APIClient(rp, {
  endpoint: 'http://localhost:8000/api/1.0/{ip}/sessions'
});

let sessionId;
let sessionId2;

experiment('Test APIClient', () => {
  // GET schema
  test('The client should get the API schema', async () => {
    const { data } = await client.schema();

    expect(data.jsonSchema).to.be.an.object();
    expect(data.config).to.be.an.object();
  });

  // POST
  test('The client should create a record', async () => {
    const { data } = await client.create({
      ip: '255.255.255.255',
      session_data: JSON.stringify({ api: 'test' })
    });
    sessionId = data.session_id;
    expect(sessionId).to.be.a.string();

    const { data: data2 } = await client.create({
      ip: '127.0.0.1',
      session_data: JSON.stringify({ api: 'test2' })
    });
    sessionId2 = data2.session_id;
    expect(sessionId2).to.be.a.string();
  });

  // POST
  test('The client should create a record and only return certain columns', async () => {
    const { data } = await client.create({
      ip: '255.255.255.255',
      session_data: JSON.stringify({ api: 'test' })
    }, ['ip']);

    const keys = Object.keys(data);
    expect(keys).to.equal(['ip']);
  });

  // GET one
  test('The client should find a single record', async () => {
    const { data } = await client.findOne(sessionId);
    expect(data.ip).to.equal('255.255.255.255');
  });

  test('The client should find a single record and only select certain fields', async () => {
    const { data } = await client.findOne(sessionId, ['session_data']);
    expect(Object.keys(data)).to.equal(['added_field', 'session_data']);
  });

  // GET many
  test('The client should find all records', async () => {
    const { data } = await client.findMany();
    expect(data.length).to.be.greaterThan(0);
  });

  test('The client should find all records and only select certain fields', async () => {
    const { data } = await client.findMany({}, {}, null, ['session_data']);
    expect(Object.keys(data[0])).to.equal(['added_field', 'session_data']);
  });

  test('The client should paginate results', async () => {
    const { data, pagination } = await client.findMany({}, {}, { perPage: 1, page: 2 });
    expect(pagination.page).to.equal(2);
    expect(data.length).to.equal(1);
  });

  // GET many with pagination
  test('The client should find all records with pagination', async () => {
    const { data } = await client.findMany({}, {}, { page: 1, perPage: 1 });
    expect(data.length).to.equal(1);
  });

  // GET many - filtered
  test('The client should find records with filtering', async () => {
    const { data } = await client.findMany({ session_id: sessionId });
    expect(data[0].session_id).to.equal(sessionId);
  });

  // Get many - sorted
  test('The client should find records with sorting', async () => {
    const { data } = await client.findMany({}, { session_id: 1 });

    const sessionIds = data.map(item => item.session_id);
    const sorted = sortBy(sessionIds);

    expect(sessionIds.join(',')).to.equal(sorted.join(','));
  });

  // Get many - sorted
  test('The client should find records with reverse sorting', async () => {
    const { data } = await client.findMany({}, { session_id: -1 });

    const sessionIds = data.map(item => item.session_id);
    const reverseSorted = sortBy(sessionIds).reverse();

    expect(sessionIds.join(',')).to.equal(reverseSorted.join(','));
  });

  // GET many with URL params
  test('The client should find all records with URL params', async () => {
    const { data } = await client2.setParams({ ip: '127.0.0.1' }).findMany();

    expect(data).to.be.an.array();

    data.forEach((row) => {
      expect(row.ip).to.equal('127.0.0.1');
    });
  });

  // PATCH one
  test('The client should update a record', async () => {
    const { data, rowCount } = await client.updateOne(sessionId, { ip: '0.0.0.0' });

    expect(data.ip).to.equal('0.0.0.0');
    expect(rowCount).to.equal(1);
  });

  // PATCH one
  test('The client should update a record and return only specific columns', async () => {
    const { data, rowCount } = await client.updateOne(sessionId, { ip: '0.0.0.0' }, ['ip']);

    expect(Object.keys(data)).to.equal(['ip']);
    expect(data.ip).to.equal('0.0.0.0');
    expect(rowCount).to.equal(1);
  });

  // PATCH many
  test('The client should update many records', async () => {
    const { rowCount } = await client.updateMany({ session_id: { $or: [sessionId, sessionId2] } }, { ip: '0.0.0.0' });
    expect(rowCount).to.equal(2);
  });

  // DELETE one
  test('The client should delete a record', async () => {
    const res = await client.delete(sessionId);
    expect(res.error).to.equal(null);
  });

  // DELETE many
  test('The client should delete many records with filter criteria', async () => {
    const { data: { session_id: id1 } } = await client.create({
      ip: '123.123.123.001',
      session_data: JSON.stringify({ api: 'test' })
    });
    const { data: { session_id: id2 } } = await client.create({
      ip: '123.123.123.002',
      session_data: JSON.stringify({ api: 'test' })
    });

    const filter = {
      session_id: {$in: [id1, id2]}
    };
    const { rowCount, error } = await client.delete(filter);

    expect(error).to.equal(null);
    expect(rowCount).to.equal(2);
  });

  // Test validation error handling
  test('The client should throw an validation error', async () => {
    const { error } = await client.create({
      non_existent_field: 'Invalid'
    });
    expect(error.name).to.equal('ValidationError');
  });

  // Test error handling
  test('The client should throw status errors', async () => {
    try {
      const client2 = new APIClient(rp, {
        endpoint: 'http://localhost:8000/api/1.0/session'
      });
      await client2.create({
        non_existent_field: 'Invalid'
      });
    } catch (error) {
      expect(client.logger.error.called).to.be.true();
      expect(error.name).to.equal('StatusCodeError');
    }
  });
});

experiment('Test findAll internal logic', () => {
  let stub;

  before(async () => {
    stub = sinon.stub(client, 'findMany').resolves({
      error: null,
      pagination: {
        page: 1,
        perPage: 3,
        pageCount: 3,
        totalRows: 9
      },
      data: [
        {
          id: 'a'
        },
        {
          id: 'b'
        },
        {
          id: 'c'
        }
      ]
    });
  });

  after(async () => {
    stub.restore();
  });

  test('It should load all pages of a result set', async () => {
    const data = await client.findAll({});
    expect(data.length).to.equal(9);
    const ids = data.map(row => row.id);
    expect(ids).to.equal(['a', 'b', 'c', 'a', 'b', 'c', 'a', 'b', 'c']);
  });

  test('It should throw an error if API call returns error', async () => {
    stub.resolves({
      error: 'Some DB Error',
      data: null
    });
    expect(client.findAll({})).to.reject();
  });
});

experiment('Test findAll on API data', () => {
  test('It should load all pages of a result set', async () => {
    const data = await client.findAll();
    expect(data).to.be.an.array();
  });
});

experiment('logger', () => {
  test('by default the console is used as the logger', async () => {
    const client = new APIClient(rp, {
      endpoint: 'http://localhost:8000/api/1.0/sessions'
    });

    expect(client.logger).to.equal(console);
  });

  test('a custom logger can be setup via the config object', async () => {
    const customLogger = { log: () => {}, error: () => {} };

    const client = new APIClient(rp, {
      endpoint: 'http://localhost:8000/api/1.0/sessions',
      logger: customLogger
    });

    expect(client.logger).to.equal(customLogger);
  });
});
