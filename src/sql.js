/**
 * SQL builder helper classeses
 * @module lib/sql
 */
const isArray = require('lodash/isArray');
const map = require('lodash/map');


/**
 * Provides a way to build a series of AND condition clauses for an SQL query.
 * The field value can be null (mapped to field_name IS NULL)
 * scalar (mapped to field_name=value)
 * or array (mapped to field_name IN value1, value2)
 * @class
 */
class SqlConditionBuilder {

  constructor() {
    this.params = [];
    this.sqlFragments = [];
  }

  /**
   * Add an AND condition to query
   * @param {String} field - the field name
   * @param {Mixed} value - the value
   * @return {SqlConditionBuilder} this
   */
  and(field, value) {
    // Null values
    if(value === null) {
      this.sqlFragments.push(` AND ${ field} IS NULL `);
    }
    // Array values
    else if(isArray(value)) {
      // For empty array
      if(value.length === 0) {
        this.sqlFragments.push(` AND 0=1 `);
        return this;
      }
      const bind = Array.from(Array(value.length), (e,i)=> '$' + (1 + i + this.params.length));
      this.params.push(...value);
      this.sqlFragments.push(` AND ${ field } IN (${bind.join(',')})`);
    }
    // Scalar values
    else {
      this.params.push(value);
      this.sqlFragments.push(` AND ${ field }=$${this.params.length} `);
    }
    return this;
  }

  /**
   * Add an AND condition to query with lowercasing
   * @param {String} field - the field name
   * @param {Mixed} value - the value
   * @return {SqlConditionBuilder} this
   */
  andCaseInsensitive(field, value) {
    // Null values
    if(value === null) {
      this.sqlFragments.push(` AND ${ field} IS NULL `);
    }
    // Array values
    else if(isArray(value)) {
      const bind = Array.from(Array(value.length), (e,i)=> '$' + (1 + i + this.params.length));
      this.params.push(...value.map(s => s.toLowerCase()).join(','));
      this.sqlFragments.push(` AND LOWER(${ field }) IN (${bind.join(',')})`);
    }
    // Scalar values
    else {
      this.params.push(value.toLowerCase());
      this.sqlFragments.push(` AND LOWER(${ field })=$${this.params.length} `);
    }
    return this;
  }

  /**
   * Get SQL query fragment
   * @return {String} - the SQL query fragment
   */
  getSql() {
    return this.sqlFragments.join(' ');
  }

  /**
   * Get the query params
   * @return {Array}
   */
  getParams() {
    return this.params;
  }

  /**
   * Add param
   * @param {mixed} param - the value to add
   * @return {SqlConditionBuilder} this
   */
  addParam(value) {
    this.params.push(value);
    return this;
  }

  /**
   * Get param count
   * @return {number}
   */
  getParamCount() {
    return this.params.length;
  }

}


/**
 * Provides a way to build a sort clause in an SQL query
 * Similar to Mongo, the format used is {field : +1, field2 : -1}
 * where +1 is ascending and -1 is descending.
 * @class
 */
class SqlSortBuilder {
  constructor() {
    this.sortFields = [];
  }

  /**
   * Add an object of sort params, e.g.
   * { a : 1, b : -1} sorts by a ascending then b descending
   * @param {Object} obj
   * @return {SqlSortBuilder} this
   */
  add(obj) {
    const sort = map(obj, (isAscending, sortField) => {
      this.sortFields.push(`${ sortField } ${isAscending===-1 ? 'DESC' : 'ASC'}`);
    });
    return this;
  }

  /**
   * Get SQL fragment
   * @return {String}
   */
  getSql() {
    return this.sortFields.length ? ` ORDER BY ${this.sortFields.join(', ')} ` : '';
  }
}


module.exports = {
  SqlSortBuilder,
  SqlConditionBuilder
};
