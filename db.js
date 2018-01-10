const {Pool} = require('pg');

// DB setup
if (process.env.DATABASE_URL) {
  // get db params from env vars
  const workingVariable = process.env.DATABASE_URL.replace('postgres://', '')
  process.env.PGUSER = workingVariable.split('@')[0].split(':')[0]
  process.env.PGPASSWORD = workingVariable.split('@')[0].split(':')[1]
  process.env.PGHOST = workingVariable.split('@')[1].split(':')[0]
  process.env.PSPORT = workingVariable.split('@')[1].split(':')[1].split('/')[0]
  process.env.PGDATABASE = workingVariable.split('@')[1].split(':')[1].split('/')[1]
}

const pool = new Pool();

module.exports = pool;
