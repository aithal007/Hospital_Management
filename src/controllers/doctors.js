import { query } from '../db/index.js';

export const createDoctorProfile = async (req, res, next) => {
  const { user_id, specialization, license_number, consultation_fee, bio } = req.body;
  const loggedInUser = req.user;

  try {
    let targetUserId;

    // 1. Enforce role-based validation (Option 1 hybrid)
    if (loggedInUser.role === 'doctor') {
      // Doctors can only create their own profile
      targetUserId = loggedInUser.id;
      if (user_id && user_id !== loggedInUser.id) {
        const error = new Error('Access denied. Doctors can only create their own profile.');
        error.statusCode = 403;
        throw error;
      }
    } else if (['receptionist', 'admin'].includes(loggedInUser.role)) {
      // Receptionist or Admin must supply a target user_id
      if (!user_id) {
        const error = new Error('user_id is required when creating a profile on behalf of a doctor.');
        error.statusCode = 400;
        throw error;
      }
      targetUserId = user_id;

      // Verify target user exists and has a 'doctor' role
      const userResult = await query('SELECT role FROM users WHERE id = $1', [targetUserId]);
      if (userResult.rows.length === 0) {
        const error = new Error('Target user does not exist.');
        error.statusCode = 404;
        throw error;
      }
      if (userResult.rows[0].role !== 'doctor') {
        const error = new Error('Target user is not a doctor. Only doctor roles can have doctor profiles.');
        error.statusCode = 400;
        throw error;
      }
    } else {
      // Patients or insurance agents cannot create doctor profiles
      const error = new Error('Access denied. Insufficient permissions to create a doctor profile.');
      error.statusCode = 403;
      throw error;
    }

    // 2. Check if a doctor profile already exists for the target user_id
    const existingProfile = await query('SELECT id FROM doctors WHERE user_id = $1', [targetUserId]);
    if (existingProfile.rows.length > 0) {
      const error = new Error('A doctor profile already exists for this user.');
      error.statusCode = 400;
      throw error;
    }

    // 3. Verify license number is unique
    const existingLicense = await query('SELECT id FROM doctors WHERE license_number = $1', [license_number]);
    if (existingLicense.rows.length > 0) {
      const error = new Error('License number is already registered to another doctor.');
      error.statusCode = 400;
      throw error;
    }

    // 4. Insert the new doctor profile
    const result = await query(
      `INSERT INTO doctors (user_id, specialization, license_number, consultation_fee, bio)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING id, user_id, specialization, license_number, consultation_fee, bio, created_at, updated_at;`,
      [targetUserId, specialization, license_number, consultation_fee, bio]
    );

    res.status(201).json({
      status: 'success',
      message: 'Doctor profile created successfully',
      data: result.rows[0]
    });
  } catch (error) {
    next(error);
  }
};

export const getDoctorById = async (req, res, next) => {
  const { id } = req.params;

  try {
    // Query doctor profile joined with user details for complete information
    const result = await query(
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

    if (result.rows.length === 0) {
      const error = new Error('Doctor profile not found.');
      error.statusCode = 404;
      throw error;
    }

    res.status(200).json({
      status: 'success',
      data: result.rows[0]
    });
  } catch (error) {
    next(error);
  }
};

export const getDoctors = async (req, res, next) => {
  const { specialization } = req.query;

  try {
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

    // Apply partial case-insensitive filtering if specialization parameter is provided
    if (specialization) {
      selectQuery += ` WHERE d.specialization ILIKE $1`;
      queryParams.push(`%${specialization}%`);
    }

    // Sort alphabetically by last name then first name
    selectQuery += ` ORDER BY u.last_name ASC, u.first_name ASC;`;

    const result = await query(selectQuery, queryParams);

    res.status(200).json({
      status: 'success',
      results: result.rows.length,
      data: result.rows
    });
  } catch (error) {
    next(error);
  }
};


