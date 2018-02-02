/**
 * SQL query builder
 */
const reduce = require('lodash/reduce');
const isArray = require('lodash/isArray');
const map = require('lodash/map');
const { ConfigError } = require('./errors.js');

const MODE_SELECT = 'select';
const MODE_SELECT_ROW_COUNT = 'select-row-count';
const MODE_INSERT = 'insert';
const MODE_UPDATE = 'update';
const MODE_DELETE = 'delete';


class SQLQueryBuilder {
  constructor(config) {
    this.config = config;
    this.mode = null;

    this.data = {};
    this.filter = {};
    this.sort = {};
    this.pagination = null;

    return this;
  }

  select() {
    this.mode = MODE_SELECT;
    return this;
  }

  selectRowCount() {
    this.mode = MODE_SELECT_ROW_COUNT;
    return this;
  }

  insert() {
    this.mode = MODE_INSERT;
    return this;
  }

  update() {
    this.mode = MODE_UPDATE;
    return this;
  }

  delete() {
    this.mode = MODE_DELETE;
    return this;
  }

  setData(data = {}) {
    this.data = data;
    return this;
  }

  setFilter(filter = {}) {
    this.filter = filter;
    return this;
  }

  setPagination(pagination = null) {
    this.pagination = pagination;
    return this;
  }

  setSort(sort = {}) {
    this.sort = sort;
    return this;
  }

  /**
   * Get filter conditions
   * @return {Object} - {query, queryParams}
   */
  getFilterQuery(queryParams = []) {
    // const queryParams = [];
    const sqlFragments = reduce(this.filter, (memo, value, field) => {
      // Null values
      if (value === null) {
        memo.push(` ${field} IS NULL `);
      }
      else if (isArray(value)) {
        // For empty array
        if (value.length === 0) {
          memo.push(' 0=1 ');
        }
        else {
          // Other arrays
          const bind = Array.from(Array(value.length), (e, i) => `$${1 + i + queryParams.length}`);
          queryParams.push(...value);
          memo.push(` ${field} IN (${bind.join(',')})`);
        }
      }
      // Scalar values
      else {
        queryParams.push(value);
        memo.push(` ${field}=$${queryParams.length} `);
      }
      return memo;
    }, []);

    if (sqlFragments.length) {
      return { query: ` WHERE ${sqlFragments.join(' AND ')}`, queryParams };
    }
    return { query: '', queryParams };
  }

  /**
   * Get sort query
   */
  getSortQuery() {
    const parts = map(this.sort, (isAscending, sortField) => `${sortField} ${isAscending === -1 ? 'DESC' : 'ASC'}`);
    return parts.length ? ` ORDER BY ${parts.join(', ')}` : '';
  }


  /**
   * Get pagination query LIMIT/OFFSET
   * @return {String|null}
   */
  getPaginationQuery() {
    if (this.pagination) {
      const limit = parseInt(this.pagination.perPage, 10);
      const offset = (parseInt(this.pagination.page, 10) - 1) * limit;
      return ` LIMIT ${limit} OFFSET ${offset} `;
    }
    return '';
  }

  /**
   * Select data from database
   * @return {Object} - {query, queryParams}
   */
  selectQuery() {
    const { table } = this.config;

    let query = `SELECT * FROM ${table} `;

    // Filtering
    const { query: filterQuery, queryParams } = this.getFilterQuery();
    query += filterQuery;

    // Sorting
    query += this.getSortQuery();

    // Paginating
    query += this.getPaginationQuery();

    return { query, queryParams };
  }

  /**
   * Get row count for select query
   * @return {Object} - {query, queryParams}
   */
  selectRowCountQuery() {
    const { table } = this.config;

    let query = `SELECT COUNT(*) AS totalrowcount FROM ${table} `;

    // Filtering
    const { query: filterQuery, queryParams } = this.getFilterQuery();
    query += filterQuery;

    return { query, queryParams };
  }

  /**
   * Delete data from database
   * @return {Object} - {query, queryParams}
   */
  deleteQuery() {
    const { table } = this.config;

    let query = `DELETE FROM ${table} `;

    // Filtering
    const { query: filterQuery, queryParams } = this.getFilterQuery();
    query += filterQuery;

    return { query, queryParams };
  }

  /**
   * Insert record into database
   * @return {Object} - {query, queryParams}
   */
  insertQuery() {
    const { table, upsert } = this.config;
    const { data } = this;

    const fields = Object.keys(data);
    const queryParams = Object.values(data);
    const values = fields.map((value, i) => `$${i + 1}`);

    let query = `INSERT INTO ${table} (${fields.join(',')}) VALUES (${values.join(',')})`;

    if (upsert) {
      const parts = upsert.set.map(field => `${field}=EXCLUDED.${field}`);
      query += ` ON CONFLICT (${upsert.fields.join(',')}) DO UPDATE SET ${parts.join(',')}`;
    }

    query += ' RETURNING * ';

    return { query, queryParams };
  }

  updateQuery() {
    const { table } = this.config;

    // Filtering
    const { query: filterQuery, queryParams } = this.getFilterQuery();

    const parts = map(this.data, (value, field) => {
      queryParams.push(value);
      return `${field}=$${queryParams.length}`;
    });


    const query = `UPDATE ${table} SET ${parts.join(',')} ${filterQuery} RETURNING * `;

    return { query, queryParams };
  }


  /**
   * Gets query and query params
   * @return {Object} - {query, queryParams}
   */
  getQuery() {
    switch (this.mode) {
      case MODE_SELECT:
        return this.selectQuery();
      case MODE_SELECT_ROW_COUNT:
        return this.selectRowCountQuery();
      case MODE_INSERT:
        return this.insertQuery();
      case MODE_UPDATE:
        return this.updateQuery();
      case MODE_DELETE:
        return this.deleteQuery();
      default:
        throw new ConfigError('Invalid SQL query mode');
    }
  }
}

module.exports = SQLQueryBuilder;
