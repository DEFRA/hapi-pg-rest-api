

const Lab = require('lab');

const lab = Lab.script();
const sortBy = require('lodash/sortBy');

const Code = require('code');
const server = require('../server.js');

const uuidV4 = require('uuid/v4');

let sessionId = null;

lab.experiment('Test GET entity/entities', () => {
  lab.before(async () => {
    const request = {
      method: 'POST',
      url: '/api/1.0/sessions',
      payload: {
        ip: '127.0.0.1',
        session_data: JSON.stringify({ username: 'bob' }),
      },
    };

    const res = await server.inject(request);
    Code.expect(res.statusCode).to.equal(201);

    // Check payload
    const payload = JSON.parse(res.payload);
    sessionId = payload.data.session_id;
  });

  lab.test('The API should get a single record by ID', async () => {
    const request = {
      method: 'GET',
      url: `/api/1.0/sessions/${sessionId}`,
    };

    const res = await server.inject(request);
    Code.expect(res.statusCode).to.equal(200);

    // Check payload
    const payload = JSON.parse(res.payload);

    Code.expect(payload.error).to.equal(null);
    Code.expect(payload.data.session_id).to.be.a.string();
  });

  lab.test('The API should reject an invalid ID', async () => {
    const request = {
      method: 'GET',
      url: '/api/1.0/sessions/invalid-guid',
    };

    const res = await server.inject(request);
    Code.expect(res.statusCode).to.equal(400);

    // Check payload
    const payload = JSON.parse(res.payload);

    Code.expect(payload.error.name).to.equal('ValidationError');
  });

  lab.test('The API should return 404 for a record not found', async () => {
    const request = {
      method: 'GET',
      url: `/api/1.0/sessions/${uuidV4()}`,
    };

    const res = await server.inject(request);
    Code.expect(res.statusCode).to.equal(404);

    // Check payload
    const payload = JSON.parse(res.payload);

    Code.expect(payload.error.name).to.equal('NotFoundError');
  });

  lab.test('The API should return a list of records', async () => {
    const request = {
      method: 'GET',
      url: '/api/1.0/sessions',
    };

    const res = await server.inject(request);
    Code.expect(res.statusCode).to.equal(200);

    // Check payload
    const payload = JSON.parse(res.payload);

    Code.expect(payload.error).to.equal(null);
    Code.expect(payload.data).to.be.an.array();
  });

  lab.test('The API should filter the list of records', async () => {
    const request = {
      method: 'GET',
      url: `/api/1.0/sessions?filter=${JSON.stringify({ session_id: sessionId })}`,
    };

    const res = await server.inject(request);
    Code.expect(res.statusCode).to.equal(200);

    // Check payload
    const payload = JSON.parse(res.payload);

    Code.expect(payload.error).to.equal(null);
    Code.expect(payload.data[0].session_id).to.equal(sessionId);
  });

  lab.test('The API should filter the list of records testing null as filter param', async () => {
    const request = {
      method: 'GET',
      url: `/api/1.0/sessions?filter=${JSON.stringify({ date_updated: null })}`,
    };

    const res = await server.inject(request);
    Code.expect(res.statusCode).to.equal(200);

    // Check payload
    const payload = JSON.parse(res.payload);

    Code.expect(payload.error).to.equal(null);

    // Ensure null values
    payload.data.forEach((item) => {
      Code.expect(item.date_updated).to.equal(null);
    });
  });

  lab.test('The API should filter the list of records testing array as filter param', async () => {
    const request = {
      method: 'GET',
      url: `/api/1.0/sessions?filter=${JSON.stringify({ session_id: [sessionId] })}`,
    };

    const res = await server.inject(request);
    Code.expect(res.statusCode).to.equal(200);

    // Check payload
    const payload = JSON.parse(res.payload);

    Code.expect(payload.error).to.equal(null);
    Code.expect(payload.data[0].session_id).to.equal(sessionId);
    Code.expect(payload.data.length).to.equal(1);
  });

  lab.test('The API should reject filter request where array item is invalid', async () => {
    const request = {
      method: 'GET',
      url: `/api/1.0/sessions?filter=${JSON.stringify({ ip: [123] })}`,
    };

    const res = await server.inject(request);
    Code.expect(res.statusCode).to.equal(400);

    // Check payload
    const payload = JSON.parse(res.payload);

    Code.expect(payload.error.name).to.equal('ValidationError');
  });

  lab.test('The API should handle filter request where filter array is empty', async () => {
    const request = {
      method: 'GET',
      url: `/api/1.0/sessions?filter=${JSON.stringify({ ip: [] })}`,
    };

    const res = await server.inject(request);
    Code.expect(res.statusCode).to.equal(200);

    // Check payload
    const payload = JSON.parse(res.payload);
    Code.expect(payload.data.length).to.equal(0);
  });


  lab.test('The API should sort the list of records ascending', async () => {
    const request = {
      method: 'GET',
      url: `/api/1.0/sessions?sort=${JSON.stringify({ session_id: 1 })}`,
    };

    const res = await server.inject(request);
    Code.expect(res.statusCode).to.equal(200);

    // Check payload
    const payload = JSON.parse(res.payload);

    Code.expect(payload.error).to.equal(null);
    Code.expect(payload.data).to.be.an.array();

    // Verify sort order
    const sessionIds = payload.data.map(item => item.session_id);
    Code.expect(sessionIds.join(',')).to.equal(sortBy(sessionIds).join(','));
  });


  lab.test('The API should reject invalid sort key', async () => {
    const request = {
      method: 'GET',
      url: `/api/1.0/sessions?sort=${JSON.stringify({ session_id: 1, nonexistent_field: 1 })}`,
    };

    const res = await server.inject(request);
    Code.expect(res.statusCode).to.equal(400);

    // Check payload
    const payload = JSON.parse(res.payload);

    Code.expect(payload.error.name).to.equal('ValidationError');
  });

  lab.test('The API should sort the list of records ascending', async () => {
    const request = {
      method: 'GET',
      url: `/api/1.0/sessions?sort=${JSON.stringify({ session_id: -1 })}`,
    };

    const res = await server.inject(request);
    Code.expect(res.statusCode).to.equal(200);

    // Check payload
    const payload = JSON.parse(res.payload);

    Code.expect(payload.error).to.equal(null);
    Code.expect(payload.data).to.be.an.array();

    // Verify sort order
    const sessionIds = payload.data.map(item => item.session_id);
    Code.expect(sessionIds.join(',')).to.equal(sortBy(sessionIds).reverse().join(','));
  });
});

exports.lab = lab;
