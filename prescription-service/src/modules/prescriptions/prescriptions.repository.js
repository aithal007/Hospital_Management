import pool from '../../db/index.js';
import BaseRepository from '../../db/base.repository.js';

class PrescriptionsRepository extends BaseRepository {
  constructor() {
    super('prescriptions');
  }

  async findByAppointmentId(appointmentId) {
    const result = await pool.query(
      `SELECT * FROM prescriptions WHERE appointment_id = $1`,
      [appointmentId]
    );
    return result.rows[0] || null;
  }

  async findItemsByPrescriptionId(prescriptionId) {
    const result = await pool.query(
      `SELECT * FROM prescription_items WHERE prescription_id = $1 ORDER BY medicine_name ASC`,
      [prescriptionId]
    );
    return result.rows;
  }

  async findByIdWithItems(id) {
    const prescription = await this.findById(id);
    if (!prescription) return null;

    const items = await this.findItemsByPrescriptionId(id);
    return { ...prescription, items };
  }

  async findByPatientIdWithItems(patientId) {
    const result = await pool.query(
      `SELECT * FROM prescriptions WHERE patient_id = $1 ORDER BY created_at DESC`,
      [patientId]
    );

    const prescriptions = [];
    for (const prescription of result.rows) {
      const items = await this.findItemsByPrescriptionId(prescription.id);
      prescriptions.push({ ...prescription, items });
    }

    return prescriptions;
  }

  async findByDoctorIdWithItems(doctorId) {
    const result = await pool.query(
      `SELECT * FROM prescriptions WHERE doctor_id = $1 ORDER BY created_at DESC`,
      [doctorId]
    );

    const prescriptions = [];
    for (const prescription of result.rows) {
      const items = await this.findItemsByPrescriptionId(prescription.id);
      prescriptions.push({ ...prescription, items });
    }

    return prescriptions;
  }

  async createWithItems({ appointment_id, doctor_id, patient_id, notes, items }) {
    const client = await pool.connect();

    try {
      await client.query('BEGIN');

      const prescriptionResult = await client.query(
        `INSERT INTO prescriptions (appointment_id, doctor_id, patient_id, notes)
         VALUES ($1, $2, $3, $4)
         RETURNING *`,
        [appointment_id, doctor_id, patient_id, notes ?? null]
      );
      const prescription = prescriptionResult.rows[0];

      const savedItems = [];
      for (const item of items) {
        const itemResult = await client.query(
          `INSERT INTO prescription_items
           (prescription_id, medicine_name, dosage, frequency, duration_days)
           VALUES ($1, $2, $3, $4, $5)
           RETURNING *`,
          [
            prescription.id,
            item.medicine_name,
            item.dosage,
            item.frequency,
            item.duration_days,
          ]
        );
        savedItems.push(itemResult.rows[0]);
      }

      await client.query('COMMIT');
      return { ...prescription, items: savedItems };
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }
}

export default new PrescriptionsRepository();
