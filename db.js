const { Pool } = require('pg');
const { pg } = require('./config');

const pool = new Pool(pg);

module.exports = pool;
