import pool from '../../db/index.js';
import BaseRepository from '../../db/base.repository.js';
import redis from '../../db/redis.js';

class AppointmentsRepository extends BaseRepository {
  constructor() {
    super('appointments');
  }

  async checkDoctorOverlap(doctorId, date, start, end) {
    const cacheKey = `doctor:availability:${doctorId}:${date}`;
    try {
      const cached = await redis.get(cacheKey);
      if (cached) {
        const appointments = JSON.parse(cached);
        return appointments.filter((a) => a.start_time < end && a.end_time > start);
      }
    } catch (err) {
      // Suppress redis failures and fallback to database query
    }

    const result = await pool.query(
      `SELECT id, start_time, end_time FROM appointments
       WHERE doctor_id = $1
         AND appointment_date = $2
         AND status != 'cancelled';`,
      [doctorId, date]
    );

    try {
      await redis.set(cacheKey, JSON.stringify(result.rows), 'EX', 60);
    } catch (err) {
      // Suppress redis failures
    }

    return result.rows.filter((a) => a.start_time < end && a.end_time > start);
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
    const appointment = await this.create({
      patient_id: patientId,
      doctor_id: doctorId,
      appointment_date: date,
      start_time: start,
      end_time: end,
      reason: reason || null,
      status: 'pending',
    });

    const cacheKey = `doctor:availability:${doctorId}:${date}`;
    try {
      await redis.del(cacheKey);
    } catch (err) {
      // Suppress redis failures
    }

    return appointment;
  }

  async findAppointmentById(id) {
    const result = await pool.query(
      'SELECT id, patient_id, doctor_id, appointment_date, start_time, end_time, status, reason, created_at, updated_at FROM appointments WHERE id = $1;',
      [id]
    );
    return result.rows[0] || null;
  }

  async findAppointmentDetailsById(id) {
    // Decoupled from users/patients/doctors tables. Simply returns the appointment record.
    // The service layer will fetch profile details from the Monolith over REST/gRPC.
    return this.findAppointmentById(id);
  }

  async findAppointmentsList(whereClause, queryParams) {
    // Decoupled query operating only on the appointments table
    const selectQuery = `
      SELECT 
        id,
        patient_id,
        doctor_id,
        appointment_date,
        start_time,
        end_time,
        status,
        reason,
        created_at,
        updated_at
      FROM appointments
      ${whereClause}
      ORDER BY appointment_date ASC, start_time ASC;
    `;
    const result = await pool.query(selectQuery, queryParams);
    return result.rows;
  }

  async updateAppointmentStatus(id, status) {
    const appointment = await this.findById(id);
    const updated = await this.update(id, { status });

    if (appointment) {
      let dateStr = appointment.appointment_date;
      if (dateStr instanceof Date) {
        dateStr = dateStr.toISOString().split('T')[0];
      }
      const cacheKey = `doctor:availability:${appointment.doctor_id}:${dateStr}`;
      try {
        await redis.del(cacheKey);
      } catch (err) {
        // Suppress redis failures
      }
    }

    return updated;
  }
}

const appointmentsRepository = new AppointmentsRepository();
export default appointmentsRepository;
