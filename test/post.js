

const Lab = require('lab');

const lab = Lab.script();
const Code = require('code');
const server = require('../server.js');


lab.experiment('Test POST entity creation', () => {
  lab.test('The API should create a new valid record with POST', async () => {
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

    Code.expect(payload.error).to.equal(null);
    Code.expect(payload.data.session_id).to.be.a.string();
  });

  lab.test('The API should reject invalid data during POST', async () => {
    const request = {
      method: 'POST',
      url: '/api/1.0/sessions',
      payload: {
        ip: 123,
        session_data: JSON.stringify({ username: 'bob' }),
      },
    };

    const res = await server.inject(request);
    Code.expect(res.statusCode).to.equal(400);

    // Check payload
    const payload = JSON.parse(res.payload);
    Code.expect(payload.error.name).to.equal('ValidationError');
  });

  lab.test('The API should reject a POST with primary key field defined', async () => {
    const request = {
      method: 'POST',
      url: '/api/1.0/sessions',
      payload: {
        session_id: '85353c63-4a5d-4987-b834-23b105b16152',
        session_data: JSON.stringify({ username: 'bob' }),
      },
    };

    const res = await server.inject(request);
    Code.expect(res.statusCode).to.equal(400);

    // Check payload
    const payload = JSON.parse(res.payload);
    Code.expect(payload.error.name).to.equal('ValidationError');
  });
});

exports.lab = lab;
