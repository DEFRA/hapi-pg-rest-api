const Lab = require('@hapi/lab')

const lab = Lab.script()

const Code = require('@hapi/code')
const server = require('../server.js')

const uuidV4 = require('uuid/v4')

let sessionId = null

lab.experiment('Test DELETE entity', () => {
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

  lab.test('The API should delete a single record by ID', async () => {
    const request = {
      method: 'DELETE',
      url: `/api/1.0/sessions/${sessionId}`
    }

    const res = await server.inject(request)
    Code.expect(res.statusCode).to.equal(200)

    // Check payload
    const payload = JSON.parse(res.payload)
    Code.expect(payload.error).to.equal(null)
  })

  lab.test('The API should return validation error for invalid id', async () => {
    const request = {
      method: 'DELETE',
      url: '/api/1.0/sessions/invalid-guid'
    }

    const res = await server.inject(request)
    Code.expect(res.statusCode).to.equal(400)

    // Check payload
    const payload = JSON.parse(res.payload)
    Code.expect(payload.error.name).to.equal('ValidationError')
  })

  lab.test('The API should return 404 for deleting a record not found', async () => {
    const request = {
      method: 'DELETE',
      url: `/api/1.0/sessions/${uuidV4()}`
    }

    const res = await server.inject(request)
    Code.expect(res.statusCode).to.equal(404)

    // Check payload
    const payload = JSON.parse(res.payload)
    Code.expect(payload.error.name).to.equal('NotFoundError')
  })
})

exports.lab = lab
