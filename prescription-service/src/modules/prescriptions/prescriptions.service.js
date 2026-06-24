import prescriptionsRepository from './prescriptions.repository.js';
import { publishMessage } from '../../db/kafka.js';

const MONOLITH_URL = process.env.MONOLITH_URL || 'http://localhost:5000';
const APPOINTMENT_SERVICE_URL = process.env.APPOINTMENT_SERVICE_URL || 'http://localhost:3020';

const fetchFromMonolith = async (path, token) => {
  const response = await fetch(`${MONOLITH_URL}${path}`, {
    headers: {
      Authorization: token,
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

const fetchAppointment = async (appointmentId, token) => {
  const response = await fetch(`${APPOINTMENT_SERVICE_URL}/appointments/${appointmentId}`, {
    headers: {
      Authorization: token,
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok) {
    if (response.status === 404) {
      const error = new Error('Appointment not found');
      error.statusCode = 404;
      throw error;
    }
    const errData = await response.json().catch(() => ({}));
    const error = new Error(errData.message || 'Failed to verify appointment details');
    error.statusCode = response.status;
    throw error;
  }

  const body = await response.json();
  return body.data;
};

export const createPrescription = async ({ user, authToken, appointment_id, notes, items }) => {
  const doctorProfile = await fetchFromMonolith('/auth/me', authToken);
  if (!doctorProfile?.doctor_profile?.id) {
    const error = new Error('Doctor profile not found. Complete your doctor profile first.');
    error.statusCode = 422;
    throw error;
  }

  const doctorId = doctorProfile.doctor_profile.id;

  const appointment = await fetchAppointment(appointment_id, authToken);

  if (appointment.status !== 'completed') {
    const error = new Error(
      `Prescription can only be created for a completed appointment. Current status: '${appointment.status}'`
    );
    error.statusCode = 400;
    throw error;
  }

  if (appointment.doctor_id !== doctorId) {
    const error = new Error('Access denied. This appointment is not assigned to you.');
    error.statusCode = 403;
    throw error;
  }

  const existing = await prescriptionsRepository.findByAppointmentId(appointment_id);
  if (existing) {
    const error = new Error('A prescription already exists for this appointment');
    error.statusCode = 409;
    throw error;
  }

  const prescription = await prescriptionsRepository.createWithItems({
    appointment_id,
    doctor_id: doctorId,
    patient_id: appointment.patient_id,
    notes,
    items,
  });

  const eventPayload = {
    id: prescription.id,
    appointment_id: prescription.appointment_id,
    doctor_id: prescription.doctor_id,
    patient_id: prescription.patient_id,
    medications: prescription.items.map((item) => ({
      name: item.medicine_name,
      dosage: item.dosage,
      frequency: item.frequency,
    })),
  };

  await publishMessage('prescription-created', eventPayload);

  return prescription;
};

const resolvePatientProfileId = async (authToken) => {
  const profile = await fetchFromMonolith('/auth/me', authToken);
  return profile?.patient_profile?.id ?? null;
};

const resolveDoctorProfileId = async (authToken) => {
  const profile = await fetchFromMonolith('/auth/me', authToken);
  return profile?.doctor_profile?.id ?? null;
};

export const getPrescriptionById = async (id, { user, authToken }) => {
  const prescription = await prescriptionsRepository.findByIdWithItems(id);
  if (!prescription) {
    const error = new Error('Prescription not found');
    error.statusCode = 404;
    throw error;
  }

  if (user.role === 'patient') {
    const patientProfileId = await resolvePatientProfileId(authToken);
    if (!patientProfileId || prescription.patient_id !== patientProfileId) {
      const error = new Error('Access denied. Insufficient permissions.');
      error.statusCode = 403;
      throw error;
    }
  } else if (user.role === 'doctor') {
    const doctorProfileId = await resolveDoctorProfileId(authToken);
    if (!doctorProfileId || prescription.doctor_id !== doctorProfileId) {
      const error = new Error('Access denied. Insufficient permissions.');
      error.statusCode = 403;
      throw error;
    }
  } else if (!['receptionist', 'admin'].includes(user.role)) {
    const error = new Error('Access denied. Insufficient permissions.');
    error.statusCode = 403;
    throw error;
  }

  return prescription;
};

export const getPrescriptionsByPatient = async ({ user, authToken, patientId }) => {
  let targetPatientId = patientId;

  if (user.role === 'patient') {
    const ownPatientId = await resolvePatientProfileId(authToken);
    if (!ownPatientId) {
      return [];
    }
    if (patientId && patientId !== ownPatientId) {
      const error = new Error('Access denied. Insufficient permissions.');
      error.statusCode = 403;
      throw error;
    }
    targetPatientId = ownPatientId;
  } else if (['receptionist', 'admin'].includes(user.role)) {
    if (!patientId) {
      const error = new Error('patientId query parameter is required');
      error.statusCode = 400;
      throw error;
    }
    targetPatientId = patientId;
  } else {
    const error = new Error('Access denied. Insufficient permissions.');
    error.statusCode = 403;
    throw error;
  }

  return await prescriptionsRepository.findByPatientIdWithItems(targetPatientId);
};

export const getPrescriptionsByDoctor = async ({ user, authToken, doctorId }) => {
  let targetDoctorId = doctorId;

  if (user.role === 'doctor') {
    const ownDoctorId = await resolveDoctorProfileId(authToken);
    if (!ownDoctorId) {
      return [];
    }
    if (doctorId && doctorId !== ownDoctorId) {
      const error = new Error('Access denied. Insufficient permissions.');
      error.statusCode = 403;
      throw error;
    }
    targetDoctorId = ownDoctorId;
  } else if (['receptionist', 'admin'].includes(user.role)) {
    if (!doctorId) {
      const error = new Error('doctorId query parameter is required');
      error.statusCode = 400;
      throw error;
    }
    targetDoctorId = doctorId;
  } else {
    const error = new Error('Access denied. Insufficient permissions.');
    error.statusCode = 403;
    throw error;
  }

  return await prescriptionsRepository.findByDoctorIdWithItems(targetDoctorId);
};

export const listPrescriptions = async ({ user, authToken, patientId, doctorId }) => {
  if (patientId && doctorId) {
    const error = new Error('Provide only one of patientId or doctorId, not both');
    error.statusCode = 400;
    throw error;
  }

  if (doctorId || user.role === 'doctor') {
    return getPrescriptionsByDoctor({ user, authToken, doctorId });
  }

  if (patientId || user.role === 'patient') {
    return getPrescriptionsByPatient({ user, authToken, patientId });
  }

  const error = new Error('patientId or doctorId query parameter is required');
  error.statusCode = 400;
  throw error;
};
