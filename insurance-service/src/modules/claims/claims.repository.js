import pool from '../../db/index.js';
import BaseRepository from '../../db/base.repository.js';

class ClaimsRepository extends BaseRepository {
  constructor() {
    super('claims');
  }

  async findByAppointmentId(appointmentId) {
    const result = await pool.query(
      `SELECT * FROM claims WHERE appointment_id = $1`,
      [appointmentId]
    );
    return result.rows[0] || null;
  }

  async findByPatientId(patientId) {
    const result = await pool.query(
      `SELECT * FROM claims WHERE patient_id = $1 ORDER BY created_at DESC`,
      [patientId]
    );
    return result.rows;
  }

  async findAll() {
    const result = await pool.query(
      `SELECT * FROM claims ORDER BY created_at DESC`
    );
    return result.rows;
  }

  async updateStatus(id, { status, reviewed_by }) {
    const result = await pool.query(
      `UPDATE claims
       SET status = $1, reviewed_by = $2, reviewed_at = NOW(), updated_at = NOW()
       WHERE id = $3
       RETURNING *`,
      [status, reviewed_by, id]
    );
    return result.rows[0] || null;
  }
}

export default new ClaimsRepository();
