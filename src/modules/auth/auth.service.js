import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { JWT_SECRET } from '../../config/index.js';
import authRepository from './auth.repository.js';
import redis from '../../db/redis.js';

export const registerUser = async ({ email, password, role, first_name, last_name, phone }) => {
  // 1. Check if email is already taken
  const existingUser = await authRepository.findUserByEmail(email);
  if (existingUser) {
    const error = new Error('Email is already registered');
    error.statusCode = 400;
    throw error;
  }

  // 2. Hash password safely
  const saltRounds = 10;
  const hashedPassword = await bcrypt.hash(password, saltRounds);

  // 3. Create user
  return await authRepository.createUser({
    email,
    passwordHash: hashedPassword,
    role,
    firstName: first_name,
    lastName: last_name,
    phone,
  });
};

export const loginUser = async ({ email, password }) => {
  // 1. Fetch user by email
  const user = await authRepository.findUserByEmail(email);
  if (!user) {
    const error = new Error('Invalid email or password');
    error.statusCode = 401;
    throw error;
  }

  // 2. Verify password
  const isMatch = await bcrypt.compare(password, user.password_hash);
  if (!isMatch) {
    const error = new Error('Invalid email or password');
    error.statusCode = 401;
    throw error;
  }

  // 3. Sign JWT token (valid for 24h)
  const token = jwt.sign({ id: user.id, email: user.email, role: user.role }, JWT_SECRET, {
    expiresIn: '24h',
  });

  return token;
};

export const getUserDetails = async (userId) => {
  const user = await authRepository.findUserById(userId);
  if (!user) {
    const error = new Error('User not found');
    error.statusCode = 404;
    throw error;
  }

  // Fetch associated profile details depending on the user's role
  if (user.role === 'patient') {
    user.patient_profile = await authRepository.findPatientProfileByUserId(userId);
  } else if (user.role === 'doctor') {
    user.doctor_profile = await authRepository.findDoctorProfileByUserId(userId);
  }

  return user;
};

export const logoutUser = async (token) => {
  try {
    const decoded = jwt.decode(token);
    if (decoded && decoded.exp) {
      const nowSeconds = Math.floor(Date.now() / 1000);
      const remainingSeconds = decoded.exp - nowSeconds;
      if (remainingSeconds > 0) {
        await redis.set(`blacklist:${token}`, '1', 'EX', remainingSeconds);
      }
    }
  } catch (err) {
    // Suppress redis / decode failures
  }
};
