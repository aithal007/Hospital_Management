import doctorsRepository from './doctors.repository.js';
import redis from '../../db/redis.js';

export const createProfile = async (
  loggedInUser,
  { user_id, specialization, license_number, consultation_fee, bio }
) => {
  let targetUserId;

  // 1. Enforce role-based validation
  if (loggedInUser.role === 'doctor') {
    targetUserId = loggedInUser.id;
    if (user_id && user_id !== loggedInUser.id) {
      const error = new Error('Access denied. Doctors can only create their own profile.');
      error.statusCode = 403;
      throw error;
    }
  } else if (['receptionist', 'admin'].includes(loggedInUser.role)) {
    if (!user_id) {
      const error = new Error('user_id is required when creating a profile on behalf of a doctor.');
      error.statusCode = 400;
      throw error;
    }
    targetUserId = user_id;

    // Verify target user exists and has a 'doctor' role
    const userRole = await doctorsRepository.findUserRoleById(targetUserId);
    if (!userRole) {
      const error = new Error('Target user does not exist.');
      error.statusCode = 404;
      throw error;
    }
    if (userRole.role !== 'doctor') {
      const error = new Error(
        'Target user is not a doctor. Only doctor roles can have doctor profiles.'
      );
      error.statusCode = 400;
      throw error;
    }
  } else {
    const error = new Error('Access denied. Insufficient permissions to create a doctor profile.');
    error.statusCode = 403;
    throw error;
  }

  // 2. Check if a doctor profile already exists for the target user_id
  const existingProfile = await doctorsRepository.findDoctorProfileByUserId(targetUserId);
  if (existingProfile) {
    const error = new Error('A doctor profile already exists for this user.');
    error.statusCode = 400;
    throw error;
  }

  // 3. Verify license number is unique
  const existingLicense = await doctorsRepository.findDoctorProfileByLicense(license_number);
  if (existingLicense) {
    const error = new Error('License number is already registered to another doctor.');
    error.statusCode = 400;
    throw error;
  }

  // 4. Create profile
  return await doctorsRepository.createDoctorProfile({
    userId: targetUserId,
    specialization,
    licenseNumber: license_number,
    consultationFee: consultation_fee,
    bio,
  });
};

export const getProfileById = async (id) => {
  const doctor = await doctorsRepository.findDoctorProfileWithUserDetails(id);
  if (!doctor) {
    const error = new Error('Doctor profile not found.');
    error.statusCode = 404;
    throw error;
  }

  try {
    await redis.zincrby('doctors:views', 1, id);
  } catch (err) {
    // Suppress redis failures
  }

  return doctor;
};

export const getPopularDoctors = async () => {
  try {
    const topDoctorIds = await redis.zrevrange('doctors:views', 0, 4);
    if (!topDoctorIds || topDoctorIds.length === 0) {
      return [];
    }

    const popularDoctors = [];
    for (const id of topDoctorIds) {
      const doc = await doctorsRepository.findDoctorProfileWithUserDetails(id);
      if (doc) {
        popularDoctors.push(doc);
      }
    }
    return popularDoctors;
  } catch (err) {
    // Suppress redis failures and return empty list
    return [];
  }
};

export const listDoctors = async ({ specialization, page = 1, limit = 10 }) => {
  const offset = (page - 1) * limit;
  const totalCount = await doctorsRepository.countDoctors(specialization);
  const doctorsList = await doctorsRepository.findDoctorsList(specialization, limit, offset);

  return {
    results: doctorsList.length,
    pagination: {
      totalCount,
      totalPages: Math.ceil(totalCount / limit),
      currentPage: Number(page),
      limit: Number(limit),
    },
    data: doctorsList,
  };
};

export const updateProfile = async (
  loggedInUser,
  id,
  { specialization, license_number, consultation_fee, bio }
) => {
  // 1. Fetch current profile first to verify existence and check ownership
  const doctor = await doctorsRepository.findDoctorProfileById(id);
  if (!doctor) {
    const error = new Error('Doctor profile not found.');
    error.statusCode = 404;
    throw error;
  }

  // 2. Access control check:
  if (loggedInUser.role === 'doctor' && loggedInUser.id !== doctor.user_id) {
    const error = new Error('Access denied. Doctors can only update their own profile.');
    error.statusCode = 403;
    throw error;
  }

  const allowedRoles = ['doctor', 'receptionist', 'admin'];
  if (!allowedRoles.includes(loggedInUser.role)) {
    const error = new Error('Access denied. Insufficient permissions.');
    error.statusCode = 403;
    throw error;
  }

  // 3. If license_number is changing, verify the new one is unique
  if (license_number !== undefined && license_number !== doctor.license_number) {
    const existingLicense = await doctorsRepository.findDoctorProfileByLicense(license_number);
    if (existingLicense) {
      const error = new Error('License number is already registered to another doctor.');
      error.statusCode = 400;
      throw error;
    }
  }

  // 4. Construct updates object dynamically
  const updates = {};
  if (specialization !== undefined) updates.specialization = specialization;
  if (license_number !== undefined) updates.license_number = license_number;
  if (consultation_fee !== undefined) updates.consultation_fee = consultation_fee;
  if (bio !== undefined) updates.bio = bio;

  if (Object.keys(updates).length === 0) {
    const error = new Error('No update fields provided.');
    error.statusCode = 400;
    throw error;
  }

  return await doctorsRepository.updateDoctorProfile(id, updates);
};
