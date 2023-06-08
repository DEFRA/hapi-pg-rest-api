// Test PUT - not yet implemented

const Lab = require('@hapi/lab')

const lab = Lab.script()

const Code = require('@hapi/code')
const server = require('../server.js')

let sessionId

lab.experiment('Test PUT entity replacement', () => {
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

  lab.test('The API is not implemented for PUT', async () => {
    const request = {
      method: 'PUT',
      url: `/api/1.0/sessions/${sessionId}`,
      payload: {
        ip: '127.0.0.1',
        session_data: JSON.stringify({ username: 'bob' })
      }
    }

    const res = await server.inject(request)
    Code.expect(res.statusCode).to.equal(501)

    // Check payload
    const payload = JSON.parse(res.payload)

    Code.expect(payload.error.name).to.equal('NotImplementedError')
  })
})

exports.lab = lab
