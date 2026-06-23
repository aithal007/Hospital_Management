import pool from './index.js';

export default class BaseRepository {
  constructor(tableName) {
    this.tableName = tableName;
  }

  async findById(id) {
    const result = await pool.query(`SELECT * FROM ${this.tableName} WHERE id = $1`, [id]);
    return result.rows[0] || null;
  }

  async deleteById(id) {
    const result = await pool.query(`DELETE FROM ${this.tableName} WHERE id = $1 RETURNING *`, [
      id,
    ]);
    return result.rows[0] || null;
  }

  async findAll() {
    const result = await pool.query(`SELECT * FROM ${this.tableName}`);
    return result.rows;
  }

  async create(data) {
    const keys = Object.keys(data);
    const values = Object.values(data);
    const placeholders = keys.map((_, i) => `$${i + 1}`).join(', ');
    const queryText = `
      INSERT INTO ${this.tableName} (${keys.join(', ')})
      VALUES (${placeholders})
      RETURNING *;
    `;
    const result = await pool.query(queryText, values);
    return result.rows[0];
  }

  async update(id, data) {
    const keys = Object.keys(data);
    if (keys.length === 0) return null;
    const values = Object.values(data);
    const sets = keys.map((key, i) => `${key} = $${i + 1}`).join(', ');
    values.push(id);
    const queryText = `
      UPDATE ${this.tableName}
      SET ${sets}, updated_at = CURRENT_TIMESTAMP
      WHERE id = $${values.length}
      RETURNING *;
    `;
    const result = await pool.query(queryText, values);
    return result.rows[0];
  }
}
