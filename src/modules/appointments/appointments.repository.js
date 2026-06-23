import pool from '../../db/index.js';
import BaseRepository from '../../db/base.repository.js';

class AppointmentsRepository extends BaseRepository {
  constructor() {
    super('appointments');
  }

  async findPatientById(id) {
    const result = await pool.query('SELECT id FROM patients WHERE id = $1', [id]);
    return result.rows[0] || null;
  }

  async findDoctorById(id) {
    const result = await pool.query('SELECT id FROM doctors WHERE id = $1', [id]);
    return result.rows[0] || null;
  }

  async findPatientProfileByUserId(userId) {
    const result = await pool.query('SELECT id FROM patients WHERE user_id = $1', [userId]);
    return result.rows[0] || null;
  }

  async findDoctorProfileByUserId(userId) {
    const result = await pool.query('SELECT id FROM doctors WHERE user_id = $1', [userId]);
    return result.rows[0] || null;
  }

  async checkDoctorOverlap(doctorId, date, start, end) {
    const result = await pool.query(
      `SELECT id FROM appointments
       WHERE doctor_id = $1
         AND appointment_date = $2
         AND status != 'cancelled'
         AND start_time < $3
         AND end_time > $4;`,
      [doctorId, date, end, start]
    );
    return result.rows;
  }

  async checkPatientOverlap(patientId, date, start, end) {
    const result = await pool.query(
      `SELECT id FROM appointments
       WHERE patient_id = $1
         AND appointment_date = $2
         AND status != 'cancelled'
         AND start_time < $3
         AND end_time > $4;`,
      [patientId, date, end, start]
    );
    return result.rows;
  }

  async createAppointment({ patientId, doctorId, date, start, end, reason }) {
    return this.create({
      patient_id: patientId,
      doctor_id: doctorId,
      appointment_date: date,
      start_time: start,
      end_time: end,
      reason: reason || null,
      status: 'pending',
    });
  }

  async fetchEmailDetails(doctorId, patientId) {
    const result = await pool.query(
      `SELECT 
         up.email AS patient_email, 
         up.first_name AS patient_first_name,
         ud.email AS doctor_email, 
         ud.first_name AS doctor_first_name,
         ud.last_name AS doctor_last_name
       FROM patients p
       JOIN users up ON p.user_id = up.id
       JOIN doctors d ON d.id = $1
       JOIN users ud ON d.user_id = ud.id
       WHERE p.id = $2;`,
      [doctorId, patientId]
    );
    return result.rows[0] || null;
  }

  async findAppointmentById(id) {
    const result = await pool.query(
      'SELECT patient_id, doctor_id, status FROM appointments WHERE id = $1;',
      [id]
    );
    return result.rows[0] || null;
  }

  async findAppointmentDetailsById(id) {
    const result = await pool.query(
      `SELECT 
         a.id,
         a.patient_id,
         a.doctor_id,
         a.appointment_date,
         a.start_time,
         a.end_time,
         a.status,
         a.reason,
         a.created_at,
         a.updated_at,
         -- Patient details
         up.first_name AS patient_first_name,
         up.last_name AS patient_last_name,
         up.email AS patient_email,
         -- Doctor details
         ud.first_name AS doctor_first_name,
         ud.last_name AS doctor_last_name,
         d.specialization AS doctor_specialization
       FROM appointments a
       JOIN patients p ON a.patient_id = p.id
       JOIN users up ON p.user_id = up.id
       JOIN doctors d ON a.doctor_id = d.id
       JOIN users ud ON d.user_id = ud.id
       WHERE a.id = $1;`,
      [id]
    );
    return result.rows[0] || null;
  }

  async findAppointmentsList(whereClause, queryParams) {
    const selectQuery = `
      SELECT 
        a.id,
        a.patient_id,
        a.doctor_id,
        a.appointment_date,
        a.start_time,
        a.end_time,
        a.status,
        a.reason,
        a.created_at,
        a.updated_at,
        -- Patient details
        up.first_name AS patient_first_name,
        up.last_name AS patient_last_name,
        up.email AS patient_email,
        -- Doctor details
        ud.first_name AS doctor_first_name,
        ud.last_name AS doctor_last_name,
        d.specialization AS doctor_specialization
      FROM appointments a
      JOIN patients p ON a.patient_id = p.id
      JOIN users up ON p.user_id = up.id
      JOIN doctors d ON a.doctor_id = d.id
      JOIN users ud ON d.user_id = ud.id
      ${whereClause}
      ORDER BY a.appointment_date ASC, a.start_time ASC;
    `;
    const result = await pool.query(selectQuery, queryParams);
    return result.rows;
  }

  async updateAppointmentStatus(id, status) {
    return this.update(id, { status });
  }
}

const appointmentsRepository = new AppointmentsRepository();
export default appointmentsRepository;
