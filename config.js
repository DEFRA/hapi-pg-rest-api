require('dotenv').config()

module.exports = {

  pg: {
    connectionString: process.env.DATABASE_URL,
    max: 5,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 2000
  }

}
