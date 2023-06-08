const Lab = require('@hapi/lab')

const lab = Lab.script()
const Code = require('@hapi/code')
const { ConfigError, ValidationError, NotFoundError } = require('../src/errors.js')

lab.experiment('Test error classes', () => {
  lab.test('Config error', async () => {
    const error = new ConfigError('Test message')

    Code.expect(error.name).to.equal('ConfigError')
    Code.expect(error.message).to.equal('Test message')
  })

  lab.test('Validation error', async () => {
    const error = new ValidationError('Test message')

    Code.expect(error.name).to.equal('ValidationError')
    Code.expect(error.message).to.equal('Test message')
  })

  lab.test('Not found error', async () => {
    const error = new NotFoundError('Test message')

    Code.expect(error.name).to.equal('NotFoundError')
    Code.expect(error.message).to.equal('Test message')
  })
})

exports.lab = lab
