[![Build Status](https://travis-ci.org/DEFRA/hapi-pg-rest-api.svg?branch=master)](https://travis-ci.org/DEFRA/hapi-pg-rest-api)
[![Test Coverage](https://codecov.io/gh/DEFRA/hapi-pg-rest-api/branch/master/graphs/badge.svg)](https://codecov.io/gh/DEFRA/hapi-pg-rest-api)

# HAPI REST API

A module to create a simple REST API in a HAPI application connected to a particular Postgres DB table.

## Contributing to this project

Please read the [contribution guidelines](/CONTRIBUTING.md) before submitting a pull request.

## Features:

* Records are identified by an auto-generated guid.
* Data is transmitted as JSON format.
* Validation is provided by Joi.
* A client class is also available to connect to the API created

All routes return a standard response in form:

```
{
  "error": // Error response
  "data": // data returned from call
}
```

Some routes also return a rowCount parameter showing the number of rows modified, e.g.:

```
{
  "error": null,
  "data": null,
  "rowCount" : 3
}
```

## Usage

```
const {Pool} = require('pg');
const server = new Hapi.Server();
const RestApi = require('rest-api');

// Create a new endpoint linked to a table
const SessionsApi = RestApi({
  table : 'sessions',
  connection : pool,
  primaryKey : 'session_id',
  endpoint : '/api/1.0/sessions',
  onCreateTimestamp : 'date_created',
  onUpdateTimestamp : 'date_updated',
  validation : {
    session_id : Joi.string().guid(),
    ip : Joi.string(),
    session_data : Joi.string(),
    date_created : Joi.string(),
    date_updated : Joi.string().allow(null)
  }
});

// Import routes to HAPI
server.route([
  ...SessionsApi.getRoutes()
]);
```

## Configuration Options

* `table` : the PostGres table to connect to
* `connection` : the pool connection instance created with pg module
* `primaryKey` : the primary key field in the database table (must accept string GUID)
* `endpoint` : the base URL endpoint upon which the below calls are mounted
* `onCreateTimestamp` : a field which will be updated when the record is created
* `onUpdateTimestamp` : a field which will be updated when the record is updated
* `validation` : an object containing Joi validation for the entity (required)
* `preUpdate` : a function which can filter the data object being updated
* `preInsert` : a function which can filter the data object being inserted
* `preQuery` : a function which can modify the data, filter and sort after a HAPI request has been interpreted  
* `upsert` : an object containing arrays `fields` and `set` - adds an on conflict clause to an insert

## Supported Endpoints

### Create

Request:
```
POST /endpoint
Body:
{
  field : 'value',
  field2: 'value2'
}
```

Response:
```
201 Created
Body:
{
  "error" : null,
  "data" : {
    "field" : "value",
    "field2" : "value2"
  }
}
```

### Find One

Request:
```
GET /endpoint/:id
```

Success Response:
```
200 OK
Body:
{
  "error" : null,
  "data" : {
    "field" : "value",
    "field2" : "value2"
  }
}
```

Not Found Response:
```
404 Not Found
Body:
{
  "error" : {
    "name" : "NotFoundError"
  },
  "data" : null
}
```


### Find All

Request:
```
GET /endpoint
```

Success Response:
```
200 OK
Body:
{
  "error" : null,
  "data" : [{
    "field" : "value",
    "field2" : "value2"
  },
  {
    "field" : "value",
    "field2" : "value2"
  }]
}
```

### Filter / Sort

Request:
```
GET /endpoint?filter={"field":"value"}&sort={"field":+1,"field2":-1}
```

Success Response:
```
200 OK
Body:
{
  "error" : null,
  "data" : [
  ...
  ]
}
```

### Update One

Request:
```
PATCH /endpoint/:id
Body:
{
  field : 'value',
  field2: 'value2'
}
```

Success Response:
```
200 OK
Body:
{
  "error" : null,
  "data" : null
}
```

Not Found Response:
```
404 Not Found
Body:
{
  "error" : {
    "name" : "NotFoundError"
  },
  "data" : null
}
```

### Update Many

Request:
```
PATCH /endpoint?filter={"key" : "value"}
Body:
{
  field : 'value',
  field2: 'value2'
}
```

Success Response:
```
200 OK
Body:
{
  "error" : null,
  "data" : null,
  "rowCount" : 5    // number of rows modified
}
```

### Delete

Request:
```
DELETE /endpoint/:id
```

Success Response:
```
200 OK
Body:
{
  "error" : null,
  "data" : null
}
```

Not Found Response:
```
404 Not Found
Body:
{
  "error" : {
    "name" : "NotFoundError"
  },
  "data" : null
}
```

## Validation

Data is validated with Joi validation, and on failure, the 'error' key in the response is populated with the Joi error.

For example:
```
{
    "data": null,
    "error": {
        "name": "ValidationError",
        "isJoi": true,
        "details": [
            {
                "message": "\"ip\" must be a string",
                "path": [
                    "ip"
                ],
                "type": "string.base",
                "context": {
                    "value": 123,
                    "key": "ip",
                    "label": "ip"
                }
            }
        ],
        "_object": {
            "ip": 123,
            "session_data": "{\"key\" : \"value\"}"
        }
    }
}
```


## API Client

An API client is also available to connect with the server API.
It depends on request-promise-native.

```
const APIClient = require('hapi-pg-rest-api').APIClient;
const rp = require('request-promise-native');
const client = new APIClient(rp, {
  endpoint : 'http://localhost/some/api/endpoint',
  headers : {
    Authorization : '...'
  }
});
```

### Client methods:

```
const data = {field : 'value', field2 : 'value2'}
const filter = {field : 'value'};
const sort = {field2 : +1, field3 : -1};

// Single record
var record = client.create(data)   
var record = client.findOne('guid')
var {rowCount} = client.updateOne('guid', data)  
client.delete('guid');

// Batch
var records = client.findMany(filter, sort)  
var {rowCount} = client.updateMany(filter, data)
```

### Error Handling

All the client methods above throw an error if something is unexpected (status code not in 200 range)

This can be either an error returned by the API, e.g. a Joi validation error, or a status code error returned from request-promise-native.

```

## Tests

To run the test suite

* Ensure the DATABASE_URL environment variable is set to a valid Postgres DSN
* Run `npm run migrate` to set up the test database tables
* Run `npm run test` to run the lab test suite

## License

THIS INFORMATION IS LICENSED UNDER THE CONDITIONS OF THE OPEN GOVERNMENT LICENCE found at:

<http://www.nationalarchives.gov.uk/doc/open-government-licence/version/3>

The following attribution statement MUST be cited in your products and applications when using this information.

>Contains public sector information licensed under the Open Government license v3

### About the license

The Open Government Licence (OGL) was developed by the Controller of Her Majesty's Stationery Office (HMSO) to enable information providers in the public sector to license the use and re-use of their information under a common open licence.

It is designed to encourage use and re-use of information freely and flexibly, with only a few conditions.
