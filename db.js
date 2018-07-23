const { Pool } = require('pg');
const { pg } = require('./config');
const uuidV4 = require('uuid/v4');
const pool = new Pool(pg);

module.exports = pool;
