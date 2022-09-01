
const Lab = require('@hapi/lab')

const lab = Lab.script()

const Code = require('@hapi/code')
const server = require('../server.js')

const uuidV4 = require('uuid/v4')

let sessionId = null

lab.experiment('Test PATCH entity', () => {
  lab.before(async () => {
    const request = {
      method: 'POST',
      url: '/api/1.0/sessions',
      payload: {
        ip: '127.0.0.1',
        session_data: JSON.stringify({ username: 'bob' })
      }
    }

    const res = await server.inject(request)
    Code.expect(res.statusCode).to.equal(201)

    // Check payload
    const payload = JSON.parse(res.payload)
    sessionId = payload.data.session_id
  })

  lab.test('The API should update a single record by ID', async () => {
    const request = {
      method: 'PATCH',
      url: `/api/1.0/sessions/${sessionId}`,
      payload: {
        ip: '10.0.1.1'
      }
    }

    const res = await server.inject(request)
    Code.expect(res.statusCode).to.equal(200)

    // Check payload
    const payload = JSON.parse(res.payload)
    Code.expect(payload.error).to.equal(null)
  })

  lab.test('The API should support Joi transformation of field values', async () => {
    const request = {
      method: 'PATCH',
      url: `/api/1.0/sessions/${sessionId}`,
      payload: {
        email: '  BOB@EXAMPLE.COM   '
      }
    }

    const res = await server.inject(request)
    Code.expect(res.statusCode).to.equal(200)

    // Check payload
    const payload = JSON.parse(res.payload)
    Code.expect(payload.error).to.equal(null)
    Code.expect(payload.data.email).to.equal('bob@example.com')
  })

  lab.test('The API should bulk update by query filter', async () => {
    const request = {
      method: 'PATCH',
      url: `/api/1.0/sessions?filter=${JSON.stringify({
        ip: '10.0.1.1'
      })}`,
      payload: {
        ip: '127.0.0.1'
      }
    }

    const res = await server.inject(request)
    Code.expect(res.statusCode).to.equal(200)

    // Check payload
    const payload = JSON.parse(res.payload)
    Code.expect(payload.rowCount).to.be.greaterThan(0)
    Code.expect(payload.error).to.equal(null)
  })

  lab.test('The API should require filter param for bulk update', async () => {
    const request = {
      method: 'PATCH',
      url: '/api/1.0/sessions',
      payload: {
        ip: '127.0.0.1'
      }
    }

    const res = await server.inject(request)
    Code.expect(res.statusCode).to.equal(400)

    // Check payload
    const payload = JSON.parse(res.payload)
    Code.expect(payload.error.name).to.equal('ValidationError')
  })

  lab.test('The API should reject an invalid ID', async () => {
    const request = {
      method: 'PATCH',
      url: '/api/1.0/sessions/invalid-guid',
      payload: {
        ip: '10.0.1.1'
      }
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
      url: `/api/1.0/sessions/${uuidV4()}`,
      payload: {
        ip: '10.0.1.1'
      }
    }

    const res = await server.inject(request)
    Code.expect(res.statusCode).to.equal(404)

    // Check payload
    const payload = JSON.parse(res.payload)

    Code.expect(payload.error.name).to.equal('NotFoundError')
  })

  lab.test('The API should reject invalid data', async () => {
    const request = {
      method: 'PATCH',
      url: `/api/1.0/sessions/${sessionId}`,
      payload: {
        ip: 123
      }
    }

    const res = await server.inject(request)
    Code.expect(res.statusCode).to.equal(400)

    // Check payload
    const payload = JSON.parse(res.payload)
    Code.expect(payload.error.name).to.equal('ValidationError')
  })
})

exports.lab = lab
