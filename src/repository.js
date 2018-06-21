const builder = require('mongo-sql');
const {
  mapValues,
} = require('lodash');

class Repository {
  /**
   * Constructor
   * @param {Object} config
   * @param {Object} config.connection - Postgres DB connection created using pool
   * @param {String} config.table - DB table name
   * @param {String} config.primaryKey - primary key field name
   */
  constructor (config = {}) {
    this.config = config;
  }

  /**
   * Do DB query
   * @param {String} query - SQL query
   * @param {Array} queryParams - bound query params
   * @return {Promise} resolves with PostGres result
   */
  dbQuery(query, queryParams) {
    if (this.config.showSql) {
      console.log(query, queryParams);
    }
    return this.config.connection.query(query, queryParams);
  }

  /**
   * Maps sort defined as +1/-1 to ASC/DESC for use in mongo-sql
   * @param {Object} sort
   * @return {Object}
   */
  static mapSort (sort) {
    return mapValues(sort, i => (i === -1 ? 'DESC' : 'ASC'));
  }

  /**
   * Total rows query
   * @param {Object} filter
   * @return {Promise} resolves with result of DB query
   */
  findRowCount (filter) {
    const { table } = this.config;

    const query = {
      type: 'select',
      table,
      columns: ['COUNT(*) AS totalrowcount'],
      where: filter
    };

    const result = builder.sql(query);
    return this.dbQuery(result.toString(), result.values);
  }

  /**
   * Find records
   * @param {Object} filter - filter records by key/value pairs
   * @param {Object} sort - sort by {field : +1, field : -1}
   * @param {Object} pagination
   * @param {Number} pagination.perPage - number of results per page
   * @param {Number} pagination.page - current page of results
   * @param {Array} columns - specify columns
   */
  find (filter, sort, pagination, columns) {
    const { table } = this.config;

    const query = {
      type: 'select',
      table,
      limit: 10,
      where: filter,
      order: Repository.mapSort(sort)
    };
    if (columns) {
      query.columns = columns;
    }
    if (pagination) {
      query.limit = pagination.perPage;
      query.offset = (pagination.page - 1) * pagination.perPage;
    }
    const result = builder.sql(query);
    return this.dbQuery(result.toString(), result.values);
  }

  /**
   * Create a record
   * @param {Object} data
   * @param {Array} [columns] - columns to return during insert
   * @return {Promise} resolves with db result
   */
  create (data, columns = null) {
    const { table, upsert } = this.config;
    const fields = Object.keys(data);
    const queryParams = Object.values(data);
    const values = fields.map((value, i) => `$${i + 1}`);

    let query = `INSERT INTO ${table} (${fields.join(',')}) VALUES (${values.join(',')})`;

    if (upsert) {
      const parts = upsert.set.map(field => `${field}=EXCLUDED.${field}`);
      query += ` ON CONFLICT (${upsert.fields.join(',')}) DO UPDATE SET ${parts.join(',')}`;
    }

    query += ` RETURNING ${columns ? `"${columns.join('","')}"` : '*'}`;

    return this.dbQuery(query, queryParams);
  }

  update (filter, data) {
    const { table } = this.config;

    const query = {
      type: 'update',
      table,
      values: data,
      where: filter
    };
    const result = builder.sql(query);
    return this.dbQuery(`${result.toString()} RETURNING *`, result.values);
  }

  delete (filter) {
    const { table } = this.config;

    const query = {
      type: 'delete',
      table,
      where: filter
    };
    const result = builder.sql(query);
    return this.dbQuery(result.toString(), result.values);
  }
}

module.exports = Repository;
