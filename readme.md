# HAPI REST API

A module to create a simple REST API in a HAPI application connected to a particular Postgres DB table.

## Features:

* Records are identified by an auto-generated guid.
* Data is transmitted as JSON format.
* Validation is provided by Joi.

All routes return a standard response in form:

```
{
  "error": // Error response
  "data": // data returned from call
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

### Update

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
