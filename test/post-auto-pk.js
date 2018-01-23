

const Lab = require('lab');

const lab = Lab.script();
const Code = require('code');
const server = require('../server.js');

lab.experiment('Test POST entity creation with auto-increment primary key', () => {
  lab.test('The API should create a new valid record with POST', async () => {
    const request = {
      method: 'POST',
      url: '/api/1.0/autopk',
      payload: {
        name: 'Test',
      },
    };

    const res = await server.inject(request);
    Code.expect(res.statusCode).to.equal(201);

    // Check payload
    const payload = JSON.parse(res.payload);

    Code.expect(payload.error).to.equal(null);

    // Note: Node PG outputs numbers as strings
    Code.expect(payload.data.id).to.match(/^[0-9]+$/);
  });
});

exports.lab = lab;
