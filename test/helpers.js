const Lab = require('lab');
const lab = Lab.script();
const { expect } = require('code');

const { throwIfError } = require('../src/helpers');

lab.experiment('Test throwIfError', () => {
  lab.test('It should return if error is null', async () => {
    expect(throwIfError(null)).to.equal(undefined);
  });

  lab.test('It should throw error if error is object', async () => {
    const error = {
      'name': 'ValidationError',
      'message': 'ValidationError: Some message'
    };
    const func = () => {
      throwIfError(error);
    };
    expect(func).to.throw('API error: {"name":"ValidationError","message":"ValidationError: Some message"}');
  });
});

exports.lab = lab;
