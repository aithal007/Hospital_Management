import policiesRepository from './policies.repository.js';

const coreAppUrl = process.env.CORE_APP_URL || 'http://localhost:5000';

const fetchMe = async (authToken) => {
  const response = await fetch(`${coreAppUrl}/auth/me`, {
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

// POST /policies — Create a policy for a patient (insurance_agent / admin)
export const createPolicy = async ({ patient_id, provider, policy_number, coverage_amount, valid_from, valid_until }) => {
  // Guard: one active policy per patient
  const existing = await policiesRepository.findByPatientId(patient_id);
  if (existing && new Date(existing.valid_until) >= new Date()) {
    const err = new Error(
      `Patient already has an active policy (expires ${existing.valid_until}). Revoke it first before issuing a new one.`
    );
    err.statusCode = 409;
    throw err;
  }

  const policy = await policiesRepository.create({
    patient_id,
    provider,
    policy_number,
    coverage_amount,
    valid_from,
    valid_until,
  });

  return policy;
};

// GET /policies — List all policies (admin/insurance_agent) or own policy (patient)
export const getPolicies = async ({ user, authToken }) => {
  if (user.role === 'patient') {
    const profile = await fetchMe(authToken);
    const patientId = profile?.patient_profile?.id;
    if (!patientId) return [];
    const own = await policiesRepository.findByPatientId(patientId);
    return own ? [own] : [];
  }

  return await policiesRepository.findAll();
};

// GET /policies/:id — Get a single policy
export const getPolicyById = async (id, { user, authToken }) => {
  const policy = await policiesRepository.findById(id);
  if (!policy) {
    const err = new Error('Policy not found');
    err.statusCode = 404;
    throw err;
  }

  // Patients may only see their own policy
  if (user.role === 'patient') {
    const profile = await fetchMe(authToken);
    const patientId = profile?.patient_profile?.id;
    if (!patientId || policy.patient_id !== patientId) {
      const err = new Error('Access denied. Insufficient permissions.');
      err.statusCode = 403;
      throw err;
    }
  }

  return policy;
};

// DELETE /policies/:id — Revoke / delete a policy (admin / insurance_agent)
export const deletePolicy = async (id) => {
  const policy = await policiesRepository.findById(id);
  if (!policy) {
    const err = new Error('Policy not found');
    err.statusCode = 404;
    throw err;
  }

  await policiesRepository.deleteById(id);
  return { message: `Policy ${id} has been revoked successfully.` };
};
