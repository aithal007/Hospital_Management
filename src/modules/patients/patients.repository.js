import pool from '../../db/index.js';
import BaseRepository from '../../db/base.repository.js';

class PatientsRepository extends BaseRepository {
  constructor() {
    super('patients');
  }

  async findUserRoleById(userId) {
    const result = await pool.query('SELECT role FROM users WHERE id = $1', [userId]);
    return result.rows[0] || null;
  }

  async findPatientProfileByUserId(userId) {
    const result = await pool.query('SELECT id FROM patients WHERE user_id = $1', [userId]);
    return result.rows[0] || null;
  }

  async findPatientProfileById(id) {
    const result = await pool.query('SELECT user_id FROM patients WHERE id = $1', [id]);
    return result.rows[0] || null;
  }

  async findPatientProfileWithUserDetails(id) {
    const result = await pool.query(
      `SELECT 
        p.id, 
        p.user_id, 
        u.first_name, 
        u.last_name, 
        u.email, 
        u.phone, 
        p.date_of_birth, 
        p.gender, 
        p.address, 
        p.insurance_provider, 
        p.insurance_policy_number, 
        p.created_at, 
        p.updated_at
       FROM patients p
       JOIN users u ON p.user_id = u.id
       WHERE p.id = $1;`,
      [id]
    );
    return result.rows[0] || null;
  }

  async createPatientProfile(profile) {
    const { userId, dateOfBirth, gender, address, insuranceProvider, insurancePolicyNumber } = profile;
    return this.create({
      user_id: userId,
      date_of_birth: dateOfBirth,
      gender,
      address: address || null,
      insurance_provider: insuranceProvider || null,
      insurance_policy_number: insurancePolicyNumber || null
    });
  }

  async updatePatientProfile(id, updates) {
    return this.update(id, updates);
  }
}

const patientsRepository = new PatientsRepository();
export default patientsRepository;
