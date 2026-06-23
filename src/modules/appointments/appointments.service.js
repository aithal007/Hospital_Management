import appointmentsRepository from './appointments.repository.js';

export const scheduleAppointment = async (
  loggedInUser,
  { patient_id, doctor_id, appointment_date, start_time, end_time, reason }
) => {
  let targetPatientId;

  // 1. Role-based check and patient_id resolution
  if (loggedInUser.role === 'patient') {
    const patientProfile = await appointmentsRepository.findPatientProfileByUserId(loggedInUser.id);
    if (!patientProfile) {
      const error = new Error('Patient profile must be created before booking an appointment.');
      error.statusCode = 400;
      throw error;
    }
    targetPatientId = patientProfile.id;

    if (patient_id && patient_id !== targetPatientId) {
      const error = new Error('Access denied. Patients can only book appointments for themselves.');
      error.statusCode = 403;
      throw error;
    }
  } else if (['receptionist', 'admin'].includes(loggedInUser.role)) {
    if (!patient_id) {
      const error = new Error('patient_id is required for booking on behalf of a patient.');
      error.statusCode = 400;
      throw error;
    }
    targetPatientId = patient_id;

    const patientCheck = await appointmentsRepository.findPatientById(targetPatientId);
    if (!patientCheck) {
      const error = new Error('Patient profile not found.');
      error.statusCode = 404;
      throw error;
    }
  } else {
    const error = new Error('Access denied. Insufficient permissions to book appointments.');
    error.statusCode = 403;
    throw error;
  }

  // 2. Verify that the doctor exists
  const doctorCheck = await appointmentsRepository.findDoctorById(doctor_id);
  if (!doctorCheck) {
    const error = new Error('Doctor profile not found.');
    error.statusCode = 404;
    throw error;
  }

  // 3. Chronological validation
  if (start_time >= end_time) {
    const error = new Error('Start time must be before end time.');
    error.statusCode = 400;
    throw error;
  }

  // 4. Double-booking / overlap validation checks
  const doctorOverlap = await appointmentsRepository.checkDoctorOverlap(
    doctor_id,
    appointment_date,
    start_time,
    end_time
  );
  if (doctorOverlap.length > 0) {
    const error = new Error('The doctor is not available at the selected time slot.');
    error.statusCode = 409;
    throw error;
  }

  const patientOverlap = await appointmentsRepository.checkPatientOverlap(
    targetPatientId,
    appointment_date,
    start_time,
    end_time
  );
  if (patientOverlap.length > 0) {
    const error = new Error(
      'The patient already has another appointment scheduled during this time slot.'
    );
    error.statusCode = 409;
    throw error;
  }

  // 5. Insert new appointment
  const appt = await appointmentsRepository.createAppointment({
    patientId: targetPatientId,
    doctorId: doctor_id,
    date: appointment_date,
    start: start_time,
    end: end_time,
    reason,
  });

  // 6. Trigger notification stub (logs to console)
  try {
    const details = await appointmentsRepository.fetchEmailDetails(doctor_id, targetPatientId);
    if (details) {
      console.log(`\n============================================================`);
      console.log(`[EMAIL STUB] Sending Appointment Confirmation Request`);
      console.log(`To Patient: ${details.patient_email} (${details.patient_first_name})`);
      console.log(
        `To Doctor: ${details.doctor_email} (Dr. ${details.doctor_first_name} ${details.doctor_last_name})`
      );
      console.log(
        `Details: Appointment with Dr. ${details.doctor_last_name} scheduled on ${appointment_date} at ${start_time}. Status: Pending Approval.`
      );
      console.log(`============================================================\n`);
    }
  } catch (emailErr) {
    console.error('[EMAIL STUB ERROR] Failed to generate console log stub:', emailErr.message);
  }

  return appt;
};

export const listAppointments = async (loggedInUser) => {
  let whereClause = '';
  const queryParams = [];

  if (loggedInUser.role === 'patient') {
    const patientProfile = await appointmentsRepository.findPatientProfileByUserId(loggedInUser.id);
    if (!patientProfile) {
      return [];
    }
    whereClause = 'WHERE a.patient_id = $1';
    queryParams.push(patientProfile.id);
  } else if (loggedInUser.role === 'doctor') {
    const doctorProfile = await appointmentsRepository.findDoctorProfileByUserId(loggedInUser.id);
    if (!doctorProfile) {
      return [];
    }
    whereClause = 'WHERE a.doctor_id = $1';
    queryParams.push(doctorProfile.id);
  } else if (['receptionist', 'admin'].includes(loggedInUser.role)) {
    whereClause = '';
  } else {
    const error = new Error('Access denied. Insufficient permissions to view appointments.');
    error.statusCode = 403;
    throw error;
  }

  return await appointmentsRepository.findAppointmentsList(whereClause, queryParams);
};

export const getAppointmentDetails = async (loggedInUser, id) => {
  const appt = await appointmentsRepository.findAppointmentDetailsById(id);
  if (!appt) {
    const error = new Error('Appointment not found.');
    error.statusCode = 404;
    throw error;
  }

  // Access control checks
  if (loggedInUser.role === 'patient') {
    const patientProfile = await appointmentsRepository.findPatientProfileByUserId(loggedInUser.id);
    if (!patientProfile || patientProfile.id !== appt.patient_id) {
      const error = new Error(
        'Access denied. You do not have permission to view this appointment.'
      );
      error.statusCode = 403;
      throw error;
    }
  } else if (loggedInUser.role === 'doctor') {
    const doctorProfile = await appointmentsRepository.findDoctorProfileByUserId(loggedInUser.id);
    if (!doctorProfile || doctorProfile.id !== appt.doctor_id) {
      const error = new Error(
        'Access denied. You do not have permission to view this appointment.'
      );
      error.statusCode = 403;
      throw error;
    }
  } else if (!['receptionist', 'admin'].includes(loggedInUser.role)) {
    const error = new Error('Access denied. Insufficient permissions.');
    error.statusCode = 403;
    throw error;
  }

  return appt;
};

export const changeAppointmentStatus = async (loggedInUser, id, newStatus) => {
  // 1. Fetch current appointment state to check transitions
  const appt = await appointmentsRepository.findAppointmentById(id);
  if (!appt) {
    const error = new Error('Appointment not found.');
    error.statusCode = 404;
    throw error;
  }

  // 2. Transition validations: cannot update completed or cancelled appointments
  if (appt.status === 'completed') {
    const error = new Error('Cannot update status of a completed appointment.');
    error.statusCode = 400;
    throw error;
  }
  if (appt.status === 'cancelled') {
    const error = new Error('Cannot update status of a cancelled appointment.');
    error.statusCode = 400;
    throw error;
  }

  // 3. Permission checks per role:
  if (loggedInUser.role === 'patient') {
    const patientProfile = await appointmentsRepository.findPatientProfileByUserId(loggedInUser.id);
    if (!patientProfile || patientProfile.id !== appt.patient_id) {
      const error = new Error(
        'Access denied. You do not have permission to update this appointment.'
      );
      error.statusCode = 403;
      throw error;
    }
    // Patients can only cancel appointments
    if (newStatus !== 'cancelled') {
      const error = new Error('Access denied. Patients can only cancel appointments.');
      error.statusCode = 403;
      throw error;
    }
  } else if (loggedInUser.role === 'doctor') {
    const doctorProfile = await appointmentsRepository.findDoctorProfileByUserId(loggedInUser.id);
    if (!doctorProfile || doctorProfile.id !== appt.doctor_id) {
      const error = new Error(
        'Access denied. You do not have permission to update this appointment.'
      );
      error.statusCode = 403;
      throw error;
    }
    // Doctors can approve, cancel, or complete
    const validDoctorStatuses = ['approved', 'cancelled', 'completed'];
    if (!validDoctorStatuses.includes(newStatus)) {
      const error = new Error(`Access denied. Doctors cannot transition status to ${newStatus}.`);
      error.statusCode = 403;
      throw error;
    }
  } else if (['receptionist', 'admin'].includes(loggedInUser.role)) {
    // Receptionist/admin can only approve or cancel
    const validStaffStatuses = ['approved', 'cancelled'];
    if (!validStaffStatuses.includes(newStatus)) {
      const error = new Error(`Access denied. Staff cannot transition status to ${newStatus}.`);
      error.statusCode = 403;
      throw error;
    }
  } else {
    const error = new Error('Access denied. Insufficient permissions.');
    error.statusCode = 403;
    throw error;
  }

  // 4. Perform the update
  return await appointmentsRepository.updateAppointmentStatus(id, newStatus);
};
