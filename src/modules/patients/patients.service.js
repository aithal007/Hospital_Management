import patientsRepository from './patients.repository.js';

export const createProfile = async (loggedInUser, { user_id, date_of_birth, gender, address, insurance_provider, insurance_policy_number }) => {
  let targetUserId;

  // 1. Enforce role-based validation rules
  if (loggedInUser.role === 'patient') {
    targetUserId = loggedInUser.id;
    if (user_id && user_id !== loggedInUser.id) {
      const error = new Error('Access denied. Patients can only create their own profile.');
      error.statusCode = 403;
      throw error;
    }
  } else if (['receptionist', 'admin'].includes(loggedInUser.role)) {
    if (!user_id) {
      const error = new Error('user_id is required when creating a profile on behalf of a patient.');
      error.statusCode = 400;
      throw error;
    }
    targetUserId = user_id;

    // Verify target user exists and has a 'patient' role
    const userRole = await patientsRepository.findUserRoleById(targetUserId);
    if (!userRole) {
      const error = new Error('Target user does not exist.');
      error.statusCode = 404;
      throw error;
    }
    if (userRole.role !== 'patient') {
      const error = new Error('Target user is not a patient. Only patient roles can have patient profiles.');
      error.statusCode = 400;
      throw error;
    }
  } else {
    const error = new Error('Access denied. Insufficient permissions to create a patient profile.');
    error.statusCode = 403;
    throw error;
  }

  // 2. Check if a patient profile already exists for the target user_id
  const existingProfile = await patientsRepository.findPatientProfileByUserId(targetUserId);
  if (existingProfile) {
    const error = new Error('A patient profile already exists for this user.');
    error.statusCode = 400;
    throw error;
  }

  // 3. Create profile
  return await patientsRepository.createPatientProfile({
    userId: targetUserId,
    dateOfBirth: date_of_birth,
    gender,
    address,
    insuranceProvider: insurance_provider,
    insurancePolicyNumber: insurance_policy_number
  });
};

export const getProfileById = async (loggedInUser, id) => {
  const patient = await patientsRepository.findPatientProfileWithUserDetails(id);
  if (!patient) {
    const error = new Error('Patient profile not found.');
    error.statusCode = 404;
    throw error;
  }

  // Access control: Patients can only view their own profile.
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

  return patient;
};

export const updateProfile = async (loggedInUser, id, { date_of_birth, gender, address, insurance_provider, insurance_policy_number }) => {
  // 1. Fetch current profile first to verify existence and check ownership
  const patient = await patientsRepository.findPatientProfileById(id);
  if (!patient) {
    const error = new Error('Patient profile not found.');
    error.statusCode = 404;
    throw error;
  }

  // 2. Access control check:
  if (loggedInUser.role === 'patient' && loggedInUser.id !== patient.user_id) {
    const error = new Error('Access denied. Patients can only update their own profile.');
    error.statusCode = 403;
    throw error;
  }

  const allowedRoles = ['patient', 'receptionist', 'admin'];
  if (!allowedRoles.includes(loggedInUser.role)) {
    const error = new Error('Access denied. Insufficient permissions.');
    error.statusCode = 403;
    throw error;
  }

  // 3. Construct updates object dynamically
  const updates = {};
  if (date_of_birth !== undefined) updates.date_of_birth = date_of_birth;
  if (gender !== undefined) updates.gender = gender;
  if (address !== undefined) updates.address = address;
  if (insurance_provider !== undefined) updates.insurance_provider = insurance_provider;
  if (insurance_policy_number !== undefined) updates.insurance_policy_number = insurance_policy_number;

  if (Object.keys(updates).length === 0) {
    const error = new Error('No update fields provided.');
    error.statusCode = 400;
    throw error;
  }

  return await patientsRepository.updatePatientProfile(id, updates);
};
