import pool from './index.js';

export default class BaseRepository {
  constructor(tableName) {
    this.tableName = tableName;
  }

  async findById(id) {
    const result = await pool.query(`SELECT * FROM ${this.tableName} WHERE id = $1`, [id]);
    return result.rows[0] || null;
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
}
