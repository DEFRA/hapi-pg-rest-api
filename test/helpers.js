const Lab = require('@hapi/lab');
const lab = Lab.script();
const { expect } = require('@hapi/code');

const { throwIfError, isBadRequest } = require('../src/helpers');

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

lab.experiment('isBadRequest', () => {
  lab.test('It should return true for unique_violation (numeric code)', async () => {
    expect(isBadRequest(23505)).to.equal(true);
  });

  lab.test('It should return true for unique_violation (string code)', async () => {
    expect(isBadRequest('23505')).to.equal(true);
  });

  lab.test('It should return true for not_null_violation violation (numeric code)', async () => {
    expect(isBadRequest(23502)).to.equal(true);
  });

  lab.test('It should return true for not_null_violation violation (string code)', async () => {
    expect(isBadRequest('23502')).to.equal(true);
  });

  lab.test('It should return false for other numeric code', async () => {
    expect(isBadRequest(123)).to.equal(false);
  });

  lab.test('It should return false for other string code', async () => {
    expect(isBadRequest('2200G')).to.equal(false);
  });

  lab.test('It should return false if no argument given', async () => {
    expect(isBadRequest()).to.equal(false);
  });
});

exports.lab = lab;
