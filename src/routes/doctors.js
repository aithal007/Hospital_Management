import { Router } from 'express';
import { createDoctorProfile, getDoctorById, getDoctors, updateDoctorProfile } from '../controllers/doctors.js';
import { validate } from '../middleware/validate.js';
import { authenticate } from '../middleware/auth.js';
import { z } from 'zod';

const router = Router();

// Zod Schema to validate incoming doctor profile data
const doctorCreateSchema = z.object({
  body: z.object({
    user_id: z.string().uuid('Invalid user ID format').optional(),
    specialization: z.string().min(1, 'Specialization is required'),
    license_number: z.string().min(1, 'License number is required'),
    consultation_fee: z.number().positive('Consultation fee must be a positive number'),
    bio: z.string().optional().nullable(),
  }),
});

// Route: Create Doctor Profile (accessible by authenticated users, role-validated inside controller)
router.post('/', authenticate, validate(doctorCreateSchema), createDoctorProfile);

// Zod Schema to validate doctor profile lookup parameters
const doctorGetSchema = z.object({
  params: z.object({
    id: z.string().uuid('Invalid doctor profile ID format'),
  }),
});

// Route: Get Doctor Profile by ID (accessible by authenticated users, public details)
router.get('/:id', authenticate, validate(doctorGetSchema), getDoctorById);

// Zod Schema to validate doctor list query parameters
const doctorListSchema = z.object({
  query: z.object({
    specialization: z.string().optional(),
    page: z.coerce.number().int().positive('Page number must be positive').optional(),
    limit: z.coerce.number().int().positive('Limit must be positive').optional(),
  }),
});

// Route: Get All Doctors (accessible by authenticated users, supports ?specialization= query filter)
router.get('/', authenticate, validate(doctorListSchema), getDoctors);

// Zod Schema to validate doctor profile update inputs
const doctorUpdateSchema = z.object({
  params: z.object({
    id: z.string().uuid('Invalid doctor profile ID format'),
  }),
  body: z.object({
    specialization: z.string().min(1, 'Specialization cannot be empty').optional(),
    license_number: z.string().min(1, 'License number cannot be empty').optional(),
    consultation_fee: z.number().positive('Consultation fee must be a positive number').optional(),
    bio: z.string().optional().nullable(),
  }),
});

// Route: Update Doctor Profile (accessible by authenticated users, authorization-checked inside controller)
router.put('/:id', authenticate, validate(doctorUpdateSchema), updateDoctorProfile);

export default router;
