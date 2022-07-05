

const Lab = require('@hapi/lab');

const lab = Lab.script();
const sortBy = require('lodash/sortBy');

const Code = require('@hapi/code');
const server = require('../server.js');

const uuidV4 = require('uuid/v4');

const sessionId = null;

lab.experiment('Test GET schema', () => {
  lab.test('The API should get a schema for an endpoint', async () => {
    const request = {
      method: 'GET',
      url: '/api/1.0/sessions/schema',
    };

    const res = await server.inject(request);
    Code.expect(res.statusCode).to.equal(200);

    // Check payload
    const payload = JSON.parse(res.payload);

    const expected = JSON.parse(`{
    "error": null,
    "data": {
        "jsonSchema": {
            "title": "sessions",
            "type": "object",
            "properties": {
                "session_id": {
                    "type": "string",
                    "pattern": "/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i"
                },
                "ip": {
                    "type": "string"
                },
                "session_data": {
                    "type": "string"
                },
                "date_created": {
                    "type": "string"
                },
                "date_updated": {
                    "type": "string"
                },
                "email": {
                    "type": "string",
                    "format": "email"
                }
            },
            "required": []
        },
        "config": {
            "primaryKey": "session_id",
            "primaryKeyAuto": false,
            "primaryKeyGuid": true
        }
    }
}`);

    Code.expect(payload).to.equal(expected);
  });
});

exports.lab = lab;
