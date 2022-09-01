const Lab = require('@hapi/lab')

const lab = Lab.script()
const Code = require('@hapi/code')
const server = require('../server.js')

const id = Math.round(Math.random() * 1000000000)

lab.experiment('Test POST entity creation with numeric non-auto-increment primary key', () => {
  lab.test('The API should create a new valid record with POST', async () => {
    const request = {
      method: 'POST',
      url: '/api/1.0/numericpk',
      payload: {
        id,
        name: 'Test'
      }
    }

    const res = await server.inject(request)
    Code.expect(res.statusCode).to.equal(201)

    // Check payload
    const payload = JSON.parse(res.payload)

    Code.expect(payload.error).to.equal(null)

    // Note: Node PG outputs numbers as strings
    Code.expect(parseInt(payload.data.id, 10)).to.equal(id)
    Code.expect(payload.data.name).to.equal('Test')
  })
})

exports.lab = lab
