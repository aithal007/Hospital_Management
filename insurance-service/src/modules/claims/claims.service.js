import claimsRepository from './claims.repository.js';
import policiesRepository from '../policies/policies.repository.js';
import { publishMessage } from '../../db/kafka.js';

const APPOINTMENT_SERVICE_URL = process.env.APPOINTMENT_SERVICE_URL || 'http://localhost:3020';
const MONOLITH_URL = process.env.MONOLITH_URL || 'http://localhost:5000';

// Helper: fetch the caller's profile from monolith
const fetchMe = async (authToken) => {
  const response = await fetch(`${MONOLITH_URL}/auth/me`, {
    headers: { Authorization: authToken },
  });
  if (!response.ok) {
    const err = new Error('Failed to fetch user profile');
    err.statusCode = 401;
    throw err;
  }
  const body = await response.json();
  return body.data;
};

// Helper: fetch appointment from appointment-service
const fetchAppointment = async (appointmentId, authToken) => {
  const response = await fetch(`${APPOINTMENT_SERVICE_URL}/appointments/${appointmentId}`, {
    headers: { Authorization: authToken },
  });

  if (!response.ok) {
    if (response.status === 404) {
      const err = new Error('Appointment not found');
      err.statusCode = 404;
      throw err;
    }
    const errData = await response.json().catch(() => ({}));
    const err = new Error(errData.message || 'Failed to verify appointment');
    err.statusCode = response.status;
    throw err;
  }

  const body = await response.json();
  return body.data;
};

// POST /claims — Patient submits an insurance claim for a completed appointment
export const submitClaim = async ({ user, authToken, appointment_id, amount }) => {
  // 1. Get the caller's full profile to resolve patient_id
  const profile = await fetchMe(authToken);
  const patientId = profile?.patient_profile?.id;
  if (!patientId) {
    const err = new Error('Patient profile not found. Please complete your profile first.');
    err.statusCode = 422;
    throw err;
  }

  // 2. Verify the appointment exists and belongs to this patient
  const appointment = await fetchAppointment(appointment_id, authToken);
  if (appointment.patient_id !== patientId) {
    const err = new Error('Access denied. This appointment does not belong to you.');
    err.statusCode = 403;
    throw err;
  }

  if (appointment.status !== 'completed') {
    const err = new Error(
      `Claims can only be filed for completed appointments. Current status: '${appointment.status}'`
    );
    err.statusCode = 400;
    throw err;
  }

  // 3. Check for duplicate claim on the same appointment
  const existing = await claimsRepository.findByAppointmentId(appointment_id);
  if (existing) {
    const err = new Error('A claim has already been submitted for this appointment.');
    err.statusCode = 409;
    throw err;
  }

  // 4. Find patient's active (non-expired) policy
  const policy = await policiesRepository.findByPatientId(patientId);
  if (!policy) {
    const err = new Error('No insurance policy found for this patient.');
    err.statusCode = 404;
    throw err;
  }

  if (new Date(policy.valid_until) < new Date()) {
    const err = new Error('Your insurance policy has expired and cannot be used for new claims.');
    err.statusCode = 400;
    throw err;
  }

  if (amount > parseFloat(policy.coverage_amount)) {
    const err = new Error(
      `Claim amount ($${amount}) exceeds policy coverage limit ($${policy.coverage_amount}).`
    );
    err.statusCode = 400;
    throw err;
  }

  // 5. Create the claim
  const claim = await claimsRepository.create({
    policy_id: policy.id,
    patient_id: patientId,
    appointment_id,
    amount,
    status: 'pending',
  });

  // 6. Publish claim-created event to Kafka
  await publishMessage('claim-created', {
    claim_id: claim.id,
    patient_id: claim.patient_id,
    policy_id: claim.policy_id,
    appointment_id: claim.appointment_id,
    amount: claim.amount,
    created_at: claim.created_at,
  });

  return claim;
};

// GET /claims/:id
export const getClaimById = async (id, { user, authToken }) => {
  const claim = await claimsRepository.findById(id);
  if (!claim) {
    const err = new Error('Claim not found');
    err.statusCode = 404;
    throw err;
  }

  // Patients can only view their own claims
  if (user.role === 'patient') {
    const profile = await fetchMe(authToken);
    const patientId = profile?.patient_profile?.id;
    if (!patientId || claim.patient_id !== patientId) {
      const err = new Error('Access denied. Insufficient permissions.');
      err.statusCode = 403;
      throw err;
    }
  }

  return claim;
};

// GET /claims?patientId=  or  GET /claims (admin sees all)
export const getClaims = async ({ user, authToken, patientId }) => {
  if (user.role === 'patient') {
    const profile = await fetchMe(authToken);
    const resolvedPatientId = profile?.patient_profile?.id;
    if (!resolvedPatientId) return [];
    return await claimsRepository.findByPatientId(resolvedPatientId);
  }

  // insurance_agent / admin: filter by patientId query param if provided
  if (patientId) {
    return await claimsRepository.findByPatientId(patientId);
  }

  return await claimsRepository.findAll();
};
