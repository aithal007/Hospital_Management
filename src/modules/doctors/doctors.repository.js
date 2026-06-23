import pool from '../../db/index.js';
import BaseRepository from '../../db/base.repository.js';
import redis from '../../db/redis.js';

class DoctorsRepository extends BaseRepository {
  constructor() {
    super('doctors');
  }

  async findUserRoleById(userId) {
    const result = await pool.query('SELECT role FROM users WHERE id = $1', [userId]);
    return result.rows[0] || null;
  }

  async findDoctorProfileByUserId(userId) {
    const result = await pool.query('SELECT id FROM doctors WHERE user_id = $1', [userId]);
    return result.rows[0] || null;
  }

  async findDoctorProfileById(id) {
    const result = await pool.query('SELECT user_id, license_number FROM doctors WHERE id = $1', [
      id,
    ]);
    return result.rows[0] || null;
  }

  async findDoctorProfileByLicense(licenseNumber) {
    const result = await pool.query('SELECT id FROM doctors WHERE license_number = $1', [
      licenseNumber,
    ]);
    return result.rows[0] || null;
  }

  async findDoctorProfileWithUserDetails(id) {
    const cacheKey = `doctor:details:${id}`;
    try {
      const cached = await redis.get(cacheKey);
      if (cached) {
        return JSON.parse(cached);
      }
    } catch (err) {
      // Suppress redis failures
    }

    const result = await pool.query(
      `SELECT 
        d.id, 
        d.user_id, 
        u.first_name, 
        u.last_name, 
        u.email, 
        u.phone, 
        d.specialization, 
        d.license_number, 
        d.consultation_fee, 
        d.bio, 
        d.created_at, 
        d.updated_at
       FROM doctors d
       JOIN users u ON d.user_id = u.id
       WHERE d.id = $1;`,
      [id]
    );

    const doctorProfile = result.rows[0] || null;

    if (doctorProfile) {
      try {
        await redis.set(cacheKey, JSON.stringify(doctorProfile), 'EX', 300);
      } catch (err) {
        // Suppress redis failures
      }
    }

    return doctorProfile;
  }

  async countDoctors(specialization) {
    let countQuery = `
      SELECT COUNT(*) 
      FROM doctors d
      JOIN users u ON d.user_id = u.id
    `;
    const countParams = [];

    if (specialization) {
      countQuery += ` WHERE d.specialization ILIKE $1`;
      countParams.push(`%${specialization}%`);
    }

    const result = await pool.query(countQuery, countParams);
    return parseInt(result.rows[0].count);
  }

  async findDoctorsList(specialization, limit, offset) {
    let selectQuery = `
      SELECT 
        d.id, 
        d.user_id, 
        u.first_name, 
        u.last_name, 
        u.email, 
        u.phone, 
        d.specialization, 
        d.license_number, 
        d.consultation_fee, 
        d.bio, 
        d.created_at, 
        d.updated_at
      FROM doctors d
      JOIN users u ON d.user_id = u.id
    `;
    const queryParams = [];

    if (specialization) {
      selectQuery += ` WHERE d.specialization ILIKE $1`;
      queryParams.push(`%${specialization}%`);
    }

    selectQuery += ` ORDER BY u.last_name ASC, u.first_name ASC`;

    const paramIndex = queryParams.length + 1;
    selectQuery += ` LIMIT $${paramIndex} OFFSET $${paramIndex + 1};`;
    queryParams.push(limit, offset);

    const result = await pool.query(selectQuery, queryParams);
    return result.rows;
  }

  async createDoctorProfile(profile) {
    const { userId, specialization, licenseNumber, consultationFee, bio } = profile;
    return this.create({
      user_id: userId,
      specialization,
      license_number: licenseNumber,
      consultation_fee: consultationFee,
      bio: bio || null,
    });
  }

  async updateDoctorProfile(id, updates) {
    const result = await this.update(id, updates);
    const cacheKey = `doctor:details:${id}`;
    try {
      await redis.del(cacheKey);
    } catch (err) {
      // Suppress redis failures
    }
    return result;
  }
}

const doctorsRepository = new DoctorsRepository();
export default doctorsRepository;
