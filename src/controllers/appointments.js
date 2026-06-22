import { query } from '../db/index.js';

export const createAppointment = async (req, res, next) => {
  const { patient_id, doctor_id, appointment_date, start_time, end_time, reason } = req.body;
  const loggedInUser = req.user;

  try {
    let targetPatientId;

    // 1. Role-based check and patient_id resolution
    if (loggedInUser.role === 'patient') {
      // Patients can only book for themselves. Resolve their patient profile ID.
      const patientProfile = await query('SELECT id FROM patients WHERE user_id = $1', [loggedInUser.id]);
      if (patientProfile.rows.length === 0) {
        const error = new Error('Patient profile must be created before booking an appointment.');
        error.statusCode = 400;
        throw error;
      }
      
      targetPatientId = patientProfile.rows[0].id;

      // If a patient_id was supplied in the body, ensure it matches their profile ID
      if (patient_id && patient_id !== targetPatientId) {
        const error = new Error('Access denied. Patients can only book appointments for themselves.');
        error.statusCode = 403;
        throw error;
      }
    } else if (['receptionist', 'admin'].includes(loggedInUser.role)) {
      // Staff (receptionist or admin) can book on behalf of any patient
      if (!patient_id) {
        const error = new Error('patient_id is required for booking on behalf of a patient.');
        error.statusCode = 400;
        throw error;
      }
      
      targetPatientId = patient_id;

      // Verify that the patient profile exists
      const patientCheck = await query('SELECT id FROM patients WHERE id = $1', [targetPatientId]);
      if (patientCheck.rows.length === 0) {
        const error = new Error('Patient profile not found.');
        error.statusCode = 404;
        throw error;
      }
    } else {
      // Other roles (e.g. doctor, insurance agent) are blocked
      const error = new Error('Access denied. Insufficient permissions to book appointments.');
      error.statusCode = 403;
      throw error;
    }

    // 2. Verify that the doctor exists
    const doctorCheck = await query('SELECT id FROM doctors WHERE id = $1', [doctor_id]);
    if (doctorCheck.rows.length === 0) {
      const error = new Error('Doctor profile not found.');
      error.statusCode = 404;
      throw error;
    }

    // 3. Chronological validation: start_time < end_time
    if (start_time >= end_time) {
      const error = new Error('Start time must be before end time.');
      error.statusCode = 400;
      throw error;
    }

    // 3.5. Double-booking / overlap validation checks
    // Check if the doctor has any overlapping non-cancelled appointments
    const doctorOverlap = await query(
      `SELECT id FROM appointments
       WHERE doctor_id = $1
         AND appointment_date = $2
         AND status != 'cancelled'
         AND start_time < $3
         AND end_time > $4;`,
      [doctor_id, appointment_date, end_time, start_time]
    );

    if (doctorOverlap.rows.length > 0) {
      const error = new Error('The doctor is not available at the selected time slot.');
      error.statusCode = 409;
      throw error;
    }

    // Check if the patient has any overlapping non-cancelled appointments
    const patientOverlap = await query(
      `SELECT id FROM appointments
       WHERE patient_id = $1
         AND appointment_date = $2
         AND status != 'cancelled'
         AND start_time < $3
         AND end_time > $4;`,
      [targetPatientId, appointment_date, end_time, start_time]
    );

    if (patientOverlap.rows.length > 0) {
      const error = new Error('The patient already has another appointment scheduled during this time slot.');
      error.statusCode = 409;
      throw error;
    }

    // 4. Insert the new appointment record
    const result = await query(
      `INSERT INTO appointments (patient_id, doctor_id, appointment_date, start_time, end_time, reason, status)
       VALUES ($1, $2, $3, $4, $5, $6, 'pending')
       RETURNING id, patient_id, doctor_id, appointment_date, start_time, end_time, status, reason, created_at, updated_at;`,
      [targetPatientId, doctor_id, appointment_date, start_time, end_time, reason || null]
    );

    // 5. Fetch patient and doctor email details to output the email notification stub
    try {
      const emailInfo = await query(
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
        [doctor_id, targetPatientId]
      );

      if (emailInfo.rows.length > 0) {
        const { patient_email, patient_first_name, doctor_email, doctor_first_name, doctor_last_name } = emailInfo.rows[0];
        console.log(`\n============================================================`);
        console.log(`[EMAIL STUB] Sending Appointment Confirmation Request`);
        console.log(`To Patient: ${patient_email} (${patient_first_name})`);
        console.log(`To Doctor: ${doctor_email} (Dr. ${doctor_first_name} ${doctor_last_name})`);
        console.log(`Details: Appointment with Dr. ${doctor_last_name} scheduled on ${appointment_date} at ${start_time}. Status: Pending Approval.`);
        console.log(`============================================================\n`);
      }
    } catch (emailErr) {
      // Log notification error but do not disrupt the successful booking transaction
      console.error('[EMAIL STUB ERROR] Failed to generate console log stub:', emailErr.message);
    }

    res.status(201).json({
      status: 'success',
      message: 'Appointment booked successfully',
      data: result.rows[0]
    });
  } catch (error) {
    next(error);
  }
};

export const getAppointments = async (req, res, next) => {
  const loggedInUser = req.user;

  try {
    let whereClause = '';
    const queryParams = [];

    // Role-based visibility logic
    if (loggedInUser.role === 'patient') {
      // 1. Resolve patient profile ID
      const patientProfile = await query('SELECT id FROM patients WHERE user_id = $1', [loggedInUser.id]);
      if (patientProfile.rows.length === 0) {
        // Return empty array if patient has no profile created yet
        return res.status(200).json({
          status: 'success',
          data: []
        });
      }
      whereClause = 'WHERE a.patient_id = $1';
      queryParams.push(patientProfile.rows[0].id);
    } else if (loggedInUser.role === 'doctor') {
      // 2. Resolve doctor profile ID
      const doctorProfile = await query('SELECT id FROM doctors WHERE user_id = $1', [loggedInUser.id]);
      if (doctorProfile.rows.length === 0) {
        // Return empty array if doctor has no profile created yet
        return res.status(200).json({
          status: 'success',
          data: []
        });
      }
      whereClause = 'WHERE a.doctor_id = $1';
      queryParams.push(doctorProfile.rows[0].id);
    } else if (['receptionist', 'admin'].includes(loggedInUser.role)) {
      // Staff roles see all appointments
      whereClause = '';
    } else {
      // Insurance agents and other roles are blocked
      const error = new Error('Access denied. Insufficient permissions to view appointments.');
      error.statusCode = 403;
      throw error;
    }

    // Query appointments with joined patient and doctor details
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

    const result = await query(selectQuery, queryParams);

    res.status(200).json({
      status: 'success',
      data: result.rows
    });
  } catch (error) {
    next(error);
  }
};

export const getAppointmentById = async (req, res, next) => {
  const { id } = req.params;
  const loggedInUser = req.user;

  try {
    // 1. Fetch appointment details joined with patient and doctor profiles
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
        up.id AS patient_user_id,
        up.first_name AS patient_first_name,
        up.last_name AS patient_last_name,
        up.email AS patient_email,
        up.phone AS patient_phone,
        -- Doctor details
        ud.id AS doctor_user_id,
        ud.first_name AS doctor_first_name,
        ud.last_name AS doctor_last_name,
        d.specialization AS doctor_specialization
      FROM appointments a
      JOIN patients p ON a.patient_id = p.id
      JOIN users up ON p.user_id = up.id
      JOIN doctors d ON a.doctor_id = d.id
      JOIN users ud ON d.user_id = ud.id
      WHERE a.id = $1;
    `;

    const result = await query(selectQuery, [id]);
    if (result.rows.length === 0) {
      const error = new Error('Appointment not found.');
      error.statusCode = 404;
      throw error;
    }

    const appointment = result.rows[0];

    // 2. Role-based access control check
    if (loggedInUser.role === 'patient') {
      // Patients can only view their own appointments
      const patientProfile = await query('SELECT id FROM patients WHERE user_id = $1', [loggedInUser.id]);
      if (patientProfile.rows.length === 0 || patientProfile.rows[0].id !== appointment.patient_id) {
        const error = new Error('Access denied. You do not have permission to view this appointment.');
        error.statusCode = 403;
        throw error;
      }
    } else if (loggedInUser.role === 'doctor') {
      // Doctors can only view their own appointments
      const doctorProfile = await query('SELECT id FROM doctors WHERE user_id = $1', [loggedInUser.id]);
      if (doctorProfile.rows.length === 0 || doctorProfile.rows[0].id !== appointment.doctor_id) {
        const error = new Error('Access denied. You do not have permission to view this appointment.');
        error.statusCode = 403;
        throw error;
      }
    } else if (['receptionist', 'admin'].includes(loggedInUser.role)) {
      // Staff has full access
    } else {
      // Other roles are blocked
      const error = new Error('Access denied. Insufficient permissions.');
      error.statusCode = 403;
      throw error;
    }

    res.status(200).json({
      status: 'success',
      data: appointment
    });
  } catch (error) {
    next(error);
  }
};

export const updateAppointmentStatus = async (req, res, next) => {
  const { id } = req.params;
  const { status } = req.body;
  const loggedInUser = req.user;

  try {
    // 1. Fetch current appointment
    const currentAppointment = await query('SELECT patient_id, doctor_id, status FROM appointments WHERE id = $1', [id]);
    if (currentAppointment.rows.length === 0) {
      const error = new Error('Appointment not found.');
      error.statusCode = 404;
      throw error;
    }

    const appointment = currentAppointment.rows[0];

    // 2. Terminal state validation
    if (['completed', 'cancelled'].includes(appointment.status)) {
      const error = new Error('Cannot update status of a completed or cancelled appointment.');
      error.statusCode = 400;
      throw error;
    }

    // 3. Role-based access control and status transition validation
    if (loggedInUser.role === 'patient') {
      // Patients can only cancel their own appointments
      const patientProfile = await query('SELECT id FROM patients WHERE user_id = $1', [loggedInUser.id]);
      if (patientProfile.rows.length === 0 || patientProfile.rows[0].id !== appointment.patient_id) {
        const error = new Error('Access denied. You do not have permission to modify this appointment.');
        error.statusCode = 403;
        throw error;
      }
      if (status !== 'cancelled') {
        const error = new Error('Access denied. Patients can only cancel their own appointments.');
        error.statusCode = 403;
        throw error;
      }
    } else if (loggedInUser.role === 'doctor') {
      // Doctors can only manage their assigned appointments
      const doctorProfile = await query('SELECT id FROM doctors WHERE user_id = $1', [loggedInUser.id]);
      if (doctorProfile.rows.length === 0 || doctorProfile.rows[0].id !== appointment.doctor_id) {
        const error = new Error('Access denied. You do not have permission to modify this appointment.');
        error.statusCode = 403;
        throw error;
      }
      // Allowed statuses for doctor
      if (!['approved', 'cancelled', 'completed'].includes(status)) {
        const error = new Error('Access denied. Invalid status transition.');
        error.statusCode = 403;
        throw error;
      }
    } else if (['receptionist', 'admin'].includes(loggedInUser.role)) {
      // Staff can approve or cancel
      if (!['approved', 'cancelled'].includes(status)) {
        const error = new Error('Access denied. Invalid status transition for staff.');
        error.statusCode = 403;
        throw error;
      }
    } else {
      // Other roles are blocked
      const error = new Error('Access denied. Insufficient permissions.');
      error.statusCode = 403;
      throw error;
    }

    // 4. Update status in the database
    const updateResult = await query(
      `UPDATE appointments
       SET status = $1, updated_at = CURRENT_TIMESTAMP
       WHERE id = $2
       RETURNING id, patient_id, doctor_id, appointment_date, start_time, end_time, status, reason, created_at, updated_at;`,
      [status, id]
    );

    res.status(200).json({
      status: 'success',
      message: `Appointment status updated to ${status} successfully`,
      data: updateResult.rows[0]
    });
  } catch (error) {
    next(error);
  }
};



