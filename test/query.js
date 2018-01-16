

const Lab = require('lab');

const lab = Lab.script();
const Code = require('code');
const Query = require('../src/query.js');

lab.experiment('Test query class', () => {
  lab.test('Undefined query mode', async () => {
    const q = new Query();
    try {
      q.getQuery();
    }
    catch (error) {
      Code.expect(error.name).to.equal('ConfigError');
    }
  });
});

exports.lab = lab;
