import { query } from '../db/index.js';

export const createPatientProfile = async (req, res, next) => {
  const { user_id, date_of_birth, gender, address, insurance_provider, insurance_policy_number } = req.body;
  const loggedInUser = req.user;

  try {
    let targetUserId;

    // 1. Enforce role-based validation (Option 3 hybrid)
    if (loggedInUser.role === 'patient') {
      // Patients can only create their own profile
      targetUserId = loggedInUser.id;
      if (user_id && user_id !== loggedInUser.id) {
        const error = new Error('Access denied. Patients can only create their own profile.');
        error.statusCode = 403;
        throw error;
      }
    } else if (['receptionist', 'admin'].includes(loggedInUser.role)) {
      // Receptionist or Admin must supply a target user_id
      if (!user_id) {
        const error = new Error('user_id is required when creating a profile on behalf of a patient.');
        error.statusCode = 400;
        throw error;
      }
      targetUserId = user_id;

      // Verify target user exists and has a 'patient' role
      const userResult = await query('SELECT role FROM users WHERE id = $1', [targetUserId]);
      if (userResult.rows.length === 0) {
        const error = new Error('Target user does not exist.');
        error.statusCode = 404;
        throw error;
      }
      if (userResult.rows[0].role !== 'patient') {
        const error = new Error('Target user is not a patient. Only patient roles can have patient profiles.');
        error.statusCode = 400;
        throw error;
      }
    } else {
      // Doctors or insurance agents cannot create patient profiles
      const error = new Error('Access denied. Insufficient permissions to create a patient profile.');
      error.statusCode = 403;
      throw error;
    }

    // 2. Check if a patient profile already exists for the target user_id
    const existingProfile = await query('SELECT id FROM patients WHERE user_id = $1', [targetUserId]);
    if (existingProfile.rows.length > 0) {
      const error = new Error('A patient profile already exists for this user.');
      error.statusCode = 400;
      throw error;
    }

    // 3. Insert the new patient profile
    const result = await query(
      `INSERT INTO patients (user_id, date_of_birth, gender, address, insurance_provider, insurance_policy_number)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING id, user_id, date_of_birth, gender, address, insurance_provider, insurance_policy_number, created_at, updated_at;`,
      [targetUserId, date_of_birth, gender, address, insurance_provider, insurance_policy_number]
    );

    res.status(201).json({
      status: 'success',
      message: 'Patient profile created successfully',
      data: result.rows[0]
    });
  } catch (error) {
    next(error);
  }
};

export const getPatientById = async (req, res, next) => {
  const { id } = req.params;
  const loggedInUser = req.user;

  try {
    // Query patient profile joined with user details for complete information
    const result = await query(
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

    if (result.rows.length === 0) {
      const error = new Error('Patient profile not found.');
      error.statusCode = 404;
      throw error;
    }

    const patient = result.rows[0];

    // Access control: Patients can only view their own profile.
    // Doctors, receptionists, and admins can access any patient profile.
    if (loggedInUser.role === 'patient' && loggedInUser.id !== patient.user_id) {
      const error = new Error('Access denied. Patients can only view their own profile.');
      error.statusCode = 403;
      throw error;
    }

    // Role check for other roles
    const allowedRoles = ['patient', 'doctor', 'receptionist', 'admin'];
    if (!allowedRoles.includes(loggedInUser.role)) {
      const error = new Error('Access denied. Insufficient permissions.');
      error.statusCode = 403;
      throw error;
    }

    res.status(200).json({
      status: 'success',
      data: patient
    });
  } catch (error) {
    next(error);
  }
};

export const updatePatientProfile = async (req, res, next) => {
  const { id } = req.params;
  const { date_of_birth, gender, address, insurance_provider, insurance_policy_number } = req.body;
  const loggedInUser = req.user;

  try {
    // 1. Fetch current profile first to verify existence and check ownership
    const currentProfile = await query('SELECT user_id FROM patients WHERE id = $1', [id]);
    if (currentProfile.rows.length === 0) {
      const error = new Error('Patient profile not found.');
      error.statusCode = 404;
      throw error;
    }

    const patient = currentProfile.rows[0];

    // 2. Access control check:
    // Patients can only update their own profile
    if (loggedInUser.role === 'patient' && loggedInUser.id !== patient.user_id) {
      const error = new Error('Access denied. Patients can only update their own profile.');
      error.statusCode = 403;
      throw error;
    }

    // Role check: Only patient, receptionist, and admin are allowed
    const allowedRoles = ['patient', 'receptionist', 'admin'];
    if (!allowedRoles.includes(loggedInUser.role)) {
      const error = new Error('Access denied. Insufficient permissions.');
      error.statusCode = 403;
      throw error;
    }

    // 3. Dynamically build update fields
    const fields = [];
    const values = [];
    let queryIndex = 1;

    if (date_of_birth !== undefined) {
      fields.push(`date_of_birth = $${queryIndex++}`);
      values.push(date_of_birth);
    }
    if (gender !== undefined) {
      fields.push(`gender = $${queryIndex++}`);
      values.push(gender);
    }
    if (address !== undefined) {
      fields.push(`address = $${queryIndex++}`);
      values.push(address);
    }
    if (insurance_provider !== undefined) {
      fields.push(`insurance_provider = $${queryIndex++}`);
      values.push(insurance_provider);
    }
    if (insurance_policy_number !== undefined) {
      fields.push(`insurance_policy_number = $${queryIndex++}`);
      values.push(insurance_policy_number);
    }

    if (fields.length === 0) {
      const error = new Error('No update fields provided.');
      error.statusCode = 400;
      throw error;
    }

    // Append updated_at timestamp
    fields.push(`updated_at = CURRENT_TIMESTAMP`);

    // Add id parameter for the WHERE clause
    values.push(id);

    const updateQuery = `
      UPDATE patients 
      SET ${fields.join(', ')} 
      WHERE id = $${queryIndex} 
      RETURNING id, user_id, date_of_birth, gender, address, insurance_provider, insurance_policy_number, created_at, updated_at;
    `;

    const result = await query(updateQuery, values);

    res.status(200).json({
      status: 'success',
      message: 'Patient profile updated successfully',
      data: result.rows[0]
    });
  } catch (error) {
    next(error);
  }
};


