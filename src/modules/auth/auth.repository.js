import pool from '../../db/index.js';
import BaseRepository from '../../db/base.repository.js';

class AuthRepository extends BaseRepository {
  constructor() {
    super('users');
  }

  async findUserByEmail(email) {
    const result = await pool.query(
      'SELECT id, email, password_hash, role, first_name, last_name, phone, created_at, updated_at FROM users WHERE email = $1;',
      [email]
    );
    return result.rows[0] || null;
  }

  async findUserById(id) {
    const result = await pool.query(
      'SELECT id, email, role, first_name, last_name, phone, created_at, updated_at FROM users WHERE id = $1;',
      [id]
    );
    return result.rows[0] || null;
  }

  async createUser(user) {
    const { email, passwordHash, role, firstName, lastName, phone } = user;
    return this.create({
      email,
      password_hash: passwordHash,
      role,
      first_name: firstName,
      last_name: lastName,
      phone: phone || null,
    });
  }

  async findPatientProfileByUserId(userId) {
    const result = await pool.query(
      `SELECT id, date_of_birth, gender, address, insurance_provider, insurance_policy_number, created_at, updated_at
       FROM patients
       WHERE user_id = $1;`,
      [userId]
    );
    return result.rows[0] || null;
  }

  async findDoctorProfileByUserId(userId) {
    const result = await pool.query(
      `SELECT id, specialization, license_number, consultation_fee, bio, created_at, updated_at
       FROM doctors
       WHERE user_id = $1;`,
      [userId]
    );
    return result.rows[0] || null;
  }
}

const authRepository = new AuthRepository();
export default authRepository;
