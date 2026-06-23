import appointmentsRepository from './appointments.repository.js';
import { appointmentReminderQueue } from '../../queues/appointment-reminder.queue.js';
import { publishMessage } from '../../db/kafka.js';

const fetchFromMonolith = async (path, token) => {
  const monolithUrl = process.env.MONOLITH_URL || 'http://localhost:5000';
  const response = await fetch(`${monolithUrl}${path}`, {
    headers: {
      'Authorization': token,
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok) {
    if (response.status === 404) return null;
    const errData = await response.json().catch(() => ({}));
    const error = new Error(errData.message || `Monolith request failed with status ${response.status}`);
    error.statusCode = response.status;
    throw error;
  }

  const body = await response.json();
  return body.data;
};

export const scheduleAppointment = async (
  loggedInUser,
  authToken,
  { patient_id, doctor_id, appointment_date, start_time, end_time, reason }
) => {
  let targetPatientId;

  // 1. Role-based check and patient_id resolution
  if (loggedInUser.role === 'patient') {
    const patientProfile = await fetchFromMonolith('/auth/me', authToken);
    if (!patientProfile || !patientProfile.patient_profile) {
      const error = new Error('Patient profile must be created before booking an appointment.');
      error.statusCode = 400;
      throw error;
    }
    targetPatientId = patientProfile.patient_profile.id;

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

    const patientCheck = await fetchFromMonolith(`/patients/${targetPatientId}`, authToken);
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
  const doctorCheck = await fetchFromMonolith(`/doctors/${doctor_id}`, authToken);
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

  // Publish Kafka appointment-created event with details
  try {
    const patientDetails = await fetchFromMonolith(`/patients/${targetPatientId}`, authToken);
    const doctorDetails = await fetchFromMonolith(`/doctors/${doctor_id}`, authToken);
    const eventPayload = {
      ...appt,
      patient_email: patientDetails?.email,
      patient_first_name: patientDetails?.first_name,
      doctor_first_name: doctorDetails?.first_name,
      doctor_last_name: doctorDetails?.last_name,
    };
    await publishMessage('appointment-created', eventPayload);
  } catch (eventErr) {
    console.error('[Kafka Event Error] Failed to enrich appointment event:', eventErr.message);
    await publishMessage('appointment-created', appt);
  }

  return appt;
};

export const listAppointments = async (loggedInUser, authToken) => {
  let whereClause = '';
  const queryParams = [];

  if (loggedInUser.role === 'patient') {
    const patientProfile = await fetchFromMonolith('/auth/me', authToken);
    if (!patientProfile || !patientProfile.patient_profile) {
      return [];
    }
    whereClause = 'WHERE patient_id = $1';
    queryParams.push(patientProfile.patient_profile.id);
  } else if (loggedInUser.role === 'doctor') {
    const doctorProfile = await fetchFromMonolith('/auth/me', authToken);
    if (!doctorProfile || !doctorProfile.doctor_profile) {
      return [];
    }
    whereClause = 'WHERE doctor_id = $1';
    queryParams.push(doctorProfile.doctor_profile.id);
  } else if (['receptionist', 'admin'].includes(loggedInUser.role)) {
    whereClause = '';
  } else {
    const error = new Error('Access denied. Insufficient permissions to view appointments.');
    error.statusCode = 403;
    throw error;
  }

  const appointments = await appointmentsRepository.findAppointmentsList(whereClause, queryParams);

  // Enrich appointments list with patient and doctor details from the Monolith
  const enrichedAppointments = [];
  const patientCache = {};
  const doctorCache = {};

  for (const appt of appointments) {
    const pId = appt.patient_id;
    const dId = appt.doctor_id;

    if (!patientCache[pId]) {
      patientCache[pId] = await fetchFromMonolith(`/patients/${pId}`, authToken).catch(() => null);
    }
    if (!doctorCache[dId]) {
      doctorCache[dId] = await fetchFromMonolith(`/doctors/${dId}`, authToken).catch(() => null);
    }

    const patient = patientCache[pId];
    const doctor = doctorCache[dId];

    enrichedAppointments.push({
      ...appt,
      patient_first_name: patient?.first_name || null,
      patient_last_name: patient?.last_name || null,
      patient_email: patient?.email || null,
      doctor_first_name: doctor?.first_name || null,
      doctor_last_name: doctor?.last_name || null,
      doctor_specialization: doctor?.specialization || null,
    });
  }

  return enrichedAppointments;
};

export const getAppointmentDetails = async (loggedInUser, authToken, id) => {
  const appt = await appointmentsRepository.findAppointmentDetailsById(id);
  if (!appt) {
    const error = new Error('Appointment not found.');
    error.statusCode = 404;
    throw error;
  }

  // Access control checks
  if (loggedInUser.role === 'patient') {
    const patientProfile = await fetchFromMonolith('/auth/me', authToken);
    if (!patientProfile || !patientProfile.patient_profile || patientProfile.patient_profile.id !== appt.patient_id) {
      const error = new Error(
        'Access denied. You do not have permission to view this appointment.'
      );
      error.statusCode = 403;
      throw error;
    }
  } else if (loggedInUser.role === 'doctor') {
    const doctorProfile = await fetchFromMonolith('/auth/me', authToken);
    if (!doctorProfile || !doctorProfile.doctor_profile || doctorProfile.doctor_profile.id !== appt.doctor_id) {
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

  // Enrich single record details from the Monolith
  const patient = await fetchFromMonolith(`/patients/${appt.patient_id}`, authToken).catch(() => null);
  const doctor = await fetchFromMonolith(`/doctors/${appt.doctor_id}`, authToken).catch(() => null);

  return {
    ...appt,
    patient_first_name: patient?.first_name || null,
    patient_last_name: patient?.last_name || null,
    patient_email: patient?.email || null,
    doctor_first_name: doctor?.first_name || null,
    doctor_last_name: doctor?.last_name || null,
    doctor_specialization: doctor?.specialization || null,
  };
};

export const changeAppointmentStatus = async (loggedInUser, authToken, id, newStatus) => {
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
    const patientProfile = await fetchFromMonolith('/auth/me', authToken);
    if (!patientProfile || !patientProfile.patient_profile || patientProfile.patient_profile.id !== appt.patient_id) {
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
    const doctorProfile = await fetchFromMonolith('/auth/me', authToken);
    if (!doctorProfile || !doctorProfile.doctor_profile || doctorProfile.doctor_profile.id !== appt.doctor_id) {
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
  const updatedAppointment = await appointmentsRepository.updateAppointmentStatus(id, newStatus);

  if (newStatus === 'cancelled') {
    await publishMessage('appointment-cancelled', updatedAppointment);
  }

  if (newStatus === 'completed') {
    await publishMessage('appointment-completed', updatedAppointment);
  }

  if (newStatus === 'approved') {
    try {
      const patientDetails = await fetchFromMonolith(`/patients/${updatedAppointment.patient_id}`, authToken);
      const doctorDetails = await fetchFromMonolith(`/doctors/${updatedAppointment.doctor_id}`, authToken);
      
      if (patientDetails && doctorDetails) {
        const apptDateStr =
          updatedAppointment.appointment_date instanceof Date
            ? updatedAppointment.appointment_date.toISOString().split('T')[0]
            : updatedAppointment.appointment_date;
        const apptDateTime = new Date(`${apptDateStr}T${updatedAppointment.start_time}`);
        const targetTime = apptDateTime.getTime() - 24 * 60 * 60 * 1000;
        const now = Date.now();
        const delay = targetTime > now ? targetTime - now : 10000;

        await appointmentReminderQueue.add(
          `reminder-${id}`,
          {
            appointmentId: id,
            patientName: `${patientDetails.first_name} ${patientDetails.last_name}`,
            patientEmail: patientDetails.email,
            doctorName: `Dr. ${doctorDetails.first_name} ${doctorDetails.last_name}`,
            date: apptDateStr,
            time: updatedAppointment.start_time,
          },
          {
            delay,
            jobId: `reminder-${id}`,
            attempts: 3,
            backoff: {
              type: 'exponential',
              delay: 5000,
            },
          }
        );
      }
    } catch (queueErr) {
      console.error('Failed to enqueue appointment reminder job:', queueErr.message);
    }
  } else if (newStatus === 'cancelled') {
    try {
      const job = await appointmentReminderQueue.getJob(`reminder-${id}`);
      if (job) {
        await job.remove();
      }
    } catch (queueErr) {
      // Suppress queue errors
    }
  }

  return updatedAppointment;
};
