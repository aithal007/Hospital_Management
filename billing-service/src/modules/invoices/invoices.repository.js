import BaseRepository from '../../db/base.repository.js';
import pool from '../../db/index.js';

class InvoicesRepository extends BaseRepository {
  constructor() {
    super('invoices');
  }

  async findByAppointmentId(appointmentId) {
    const result = await pool.query(
      `SELECT * FROM invoices WHERE appointment_id = $1`,
      [appointmentId]
    );
    return result.rows[0] || null;
  }

  // Fetch all invoices, newest first
  async findAllOrderedByDate() {
    const result = await pool.query(
      `SELECT * FROM invoices ORDER BY created_at DESC`
    );
    return result.rows;
  }

  // Fetch all invoices belonging to a specific patient
  async findByPatientId(patientId) {
    const result = await pool.query(
      `SELECT * FROM invoices WHERE patient_id = $1 ORDER BY created_at DESC`,
      [patientId]
    );
    return result.rows;
  }
}

export default new InvoicesRepository();
