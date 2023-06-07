const Lab = require('@hapi/lab')

const lab = Lab.script()
const sortBy = require('lodash/sortBy')

const Code = require('@hapi/code')
const server = require('../server.js')

const uuidV4 = require('uuid/v4')
const sandbox = require('sinon').createSandbox()
const Db = require('../db')

let sessionId = null

lab.experiment('Test GET entity/entities', () => {
  lab.before(async () => {
    const request = {
      method: 'POST',
      url: '/api/1.0/sessions',
      payload: {
        ip: '127.0.0.1',
        session_data: JSON.stringify({ username: 'bob' }),
        email: 'mail@example.com'
      }
    }

    const res = await server.inject(request)
    Code.expect(res.statusCode).to.equal(201)

    // Check payload
    const payload = JSON.parse(res.payload)

    sessionId = payload.data.session_id
  })

  lab.test('The API should get a single record by ID', async () => {
    const request = {
      method: 'GET',
      url: `/api/1.0/sessions/${sessionId}`
    }

    const res = await server.inject(request)
    Code.expect(res.statusCode).to.equal(200)

    // Check payload
    const payload = JSON.parse(res.payload)

    Code.expect(payload.error).to.equal(null)
    Code.expect(payload.data.session_id).to.be.a.string()

    // Check calculated field
    Code.expect(payload.data.added_field).to.equal('ROW-0')
  })

  lab.test('The API should reject an invalid ID', async () => {
    const request = {
      method: 'GET',
      url: '/api/1.0/sessions/invalid-guid'
    }

    const res = await server.inject(request)
    Code.expect(res.statusCode).to.equal(400)

    // Check payload
    const payload = JSON.parse(res.payload)

    Code.expect(payload.error.name).to.equal('ValidationError')
  })

  lab.test('The API should return 404 for a record not found', async () => {
    const request = {
      method: 'GET',
      url: `/api/1.0/sessions/${uuidV4()}`
    }

    const res = await server.inject(request)
    Code.expect(res.statusCode).to.equal(404)

    // Check payload
    const payload = JSON.parse(res.payload)

    Code.expect(payload.error.name).to.equal('NotFoundError')
  })

  lab.test('The API should return an error response if DB errors', async () => {
    const query = sandbox.stub(Db, 'query')
    query.throws({
      code: 23505
    })

    const request = {
      method: 'GET',
      url: `/api/1.0/sessions/${uuidV4()}`
    }

    const res = await server.inject(request)
    Code.expect(res.statusCode).to.equal(400)

    // Check payload
    const payload = JSON.parse(res.payload)

    Code.expect(payload.error.code).to.equal(23505)
    Code.expect(payload.error.name).to.equal('DBError')

    sandbox.restore()
  })

  lab.test('The API should return a list of records', async () => {
    const request = {
      method: 'GET',
      url: '/api/1.0/sessions'
    }

    const res = await server.inject(request)
    Code.expect(res.statusCode).to.equal(200)

    // Check payload
    const payload = JSON.parse(res.payload)

    Code.expect(payload.error).to.equal(null)
    Code.expect(payload.data).to.be.an.array()
    Code.expect(payload.pagination.page).to.equal(1)
    Code.expect(payload.pagination.perPage).to.equal(Number.MAX_SAFE_INTEGER)

    // Check calculated field
    Code.expect(payload.data[0].added_field).to.equal('ROW-0')
  })

  lab.test('The API should filter the list of records', async () => {
    const request = {
      method: 'GET',
      url: `/api/1.0/sessions?filter=${JSON.stringify({ session_id: sessionId })}`
    }

    const res = await server.inject(request)
    Code.expect(res.statusCode).to.equal(200)

    // Check payload
    const payload = JSON.parse(res.payload)

    Code.expect(payload.error).to.equal(null)
    Code.expect(payload.data[0].session_id).to.equal(sessionId)
  })

  lab.test('The API should filter records using $or query', async () => {
    const request = {
      method: 'GET',
      url: `/api/1.0/sessions?filter=${JSON.stringify({
        ip: {
          $or: ['127.0.0.1', '127.0.0.2']
        }
      })}`
    }

    const res = await server.inject(request)
    Code.expect(res.statusCode).to.equal(200)

    // Check payload
    const payload = JSON.parse(res.payload)

    Code.expect(payload.error).to.equal(null)
  })

  lab.test('The API should filter records using $gt query on date field', async () => {
    const request = {
      method: 'GET',
      url: `/api/1.0/sessions?filter=${JSON.stringify({
        date_created: {
          $gt: '2018-01-01'
        }
      })}`
    }

    const res = await server.inject(request)
    Code.expect(res.statusCode).to.equal(200)

    // Check payload
    const payload = JSON.parse(res.payload)

    Code.expect(payload.error).to.equal(null)
  })

  lab.test('The API should filter records using $ilike for partial match on email field', async () => {
    const request = {
      method: 'GET',
      url: `/api/1.0/sessions?filter=${JSON.stringify({
        email: {
          $ilike: '%example.com'
        }
      })}`
    }

    const res = await server.inject(request)
    Code.expect(res.statusCode).to.equal(200)

    // Check payload
    const payload = JSON.parse(res.payload)

    Code.expect(payload.error).to.equal(null)
  })

  lab.test('The API should filter records using $or at base level', async () => {
    const request = {
      method: 'GET',
      url: `/api/1.0/sessions?filter=${JSON.stringify({
        $or: [{
          email: 'bob@example.com'
        }, {
          email: 'mail@example.com'
        }]
      })}`
    }

    const res = await server.inject(request)
    Code.expect(res.statusCode).to.equal(200)

    // Check payload
    const payload = JSON.parse(res.payload)

    Code.expect(payload.error).to.equal(null)

    payload.data.forEach(row => {
      Code.expect(row.email).to.satisfy(val => ['bob@example.com', 'mail@example.com'].includes(val))
    })
  })

  lab.test('The API should filter the list of records testing null as filter param', async () => {
    const request = {
      method: 'GET',
      url: `/api/1.0/sessions?filter=${JSON.stringify({ date_updated: null })}`
    }

    const res = await server.inject(request)
    Code.expect(res.statusCode).to.equal(200)

    // Check payload
    const payload = JSON.parse(res.payload)

    Code.expect(payload.error).to.equal(null)

    // Ensure null values
    payload.data.forEach((item) => {
      Code.expect(item.date_updated).to.equal(null)
    })
  })

  lab.test('The API should filter the list of records testing array as filter param', async () => {
    const request = {
      method: 'GET',
      url: `/api/1.0/sessions?filter=${JSON.stringify({ session_id: [sessionId] })}`
    }

    const res = await server.inject(request)
    Code.expect(res.statusCode).to.equal(200)

    // Check payload
    const payload = JSON.parse(res.payload)

    Code.expect(payload.error).to.equal(null)
    Code.expect(payload.data[0].session_id).to.equal(sessionId)
    Code.expect(payload.data.length).to.equal(1)
  })

  lab.test('The API should filter the list of records on JSON property', async () => {
    const request = {
      method: 'GET',
      url: `/api/1.0/sessions?filter=${JSON.stringify({ 'session_data->>username': 'bob' })}`
    }

    const res = await server.inject(request)
    Code.expect(res.statusCode).to.equal(200)

    // Check payload
    const payload = JSON.parse(res.payload)

    Code.expect(payload.error).to.equal(null)
    Code.expect(payload.data[0].session_data.username).to.equal('bob')
  })

  // lab.test('The API should reject filter request where array item is invalid', async () => {
  //   const request = {
  //     method: 'GET',
  //     url: `/api/1.0/sessions?filter=${JSON.stringify({ ip: [123] })}`
  //   };
  //
  //   const res = await server.inject(request);
  //   Code.expect(res.statusCode).to.equal(400);
  //
  //   // Check payload
  //   const payload = JSON.parse(res.payload);
  //
  //   Code.expect(payload.error.name).to.equal('ValidationError');
  // });

  lab.test('The API should sort the list of records ascending', async () => {
    const request = {
      method: 'GET',
      url: `/api/1.0/sessions?sort=${JSON.stringify({ session_id: 1 })}`
    }

    const res = await server.inject(request)
    Code.expect(res.statusCode).to.equal(200)

    // Check payload
    const payload = JSON.parse(res.payload)

    Code.expect(payload.error).to.equal(null)
    Code.expect(payload.data).to.be.an.array()

    // Verify sort order
    const sessionIds = payload.data.map(item => item.session_id)
    Code.expect(sessionIds.join(',')).to.equal(sortBy(sessionIds).join(','))
  })

  lab.test('The API should sort on a nested JSON field', async () => {
    const request = {
      method: 'GET',
      url: `/api/1.0/sessions?sort=${JSON.stringify({ 'session_data->>username': 1 })}`
    }

    const res = await server.inject(request)
    Code.expect(res.statusCode).to.equal(200)

    // Check payload
    const payload = JSON.parse(res.payload)

    Code.expect(payload.error).to.equal(null)
    Code.expect(payload.data).to.be.an.array()

    // Verify sort order
    const usernames = payload.data.map(item => item.session_data.username)
    Code.expect(usernames.join(',')).to.equal(sortBy(usernames).join(','))
  })

  lab.test('The API should sort the list of records ascending', async () => {
    const request = {
      method: 'GET',
      url: `/api/1.0/sessions?sort=${JSON.stringify({ session_id: -1 })}`
    }

    const res = await server.inject(request)
    Code.expect(res.statusCode).to.equal(200)

    // Check payload
    const payload = JSON.parse(res.payload)

    Code.expect(payload.error).to.equal(null)
    Code.expect(payload.data).to.be.an.array()

    // Verify sort order
    const sessionIds = payload.data.map(item => item.session_id)
    Code.expect(sessionIds.join(',')).to.equal(sortBy(sessionIds).reverse().join(','))
  })

  lab.test('The API should return an error response if DB errors on list view', async () => {
    const query = sandbox.stub(Db, 'query')
    query.throws({
      code: '28P01'
    })

    const request = {
      method: 'GET',
      url: '/api/1.0/sessions'
    }

    const res = await server.inject(request)
    Code.expect(res.statusCode).to.equal(500)

    // Check payload
    const payload = JSON.parse(res.payload)

    Code.expect(payload.error.code).to.equal('28P01')
    Code.expect(payload.error.name).to.equal('DBError')

    sandbox.restore()
  })
})

exports.lab = lab
