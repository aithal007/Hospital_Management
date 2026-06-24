import pool from '../../db/index.js';
import BaseRepository from '../../db/base.repository.js';

class PoliciesRepository extends BaseRepository {
  constructor() {
    super('policies');
  }

  async findByPatientId(patientId) {
    const result = await pool.query(
      `SELECT * FROM policies WHERE patient_id = $1 ORDER BY created_at DESC LIMIT 1`,
      [patientId]
    );
    return result.rows[0] || null;
  }
}

export default new PoliciesRepository();
