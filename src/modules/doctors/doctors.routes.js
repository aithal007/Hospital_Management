import { Router } from 'express';
import {
  createDoctorProfile,
  getDoctorById,
  getDoctors,
  updateDoctorProfile,
} from './doctors.controller.js';
import { validate } from '../../middleware/validate.js';
import { authenticate } from '../../middleware/auth.js';
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

// Zod Schema to validate doctor profile lookup parameters
const doctorGetSchema = z.object({
  params: z.object({
    id: z.string().uuid('Invalid doctor profile ID format'),
  }),
});

// Zod Schema to validate doctor list query parameters
const doctorListSchema = z.object({
  query: z.object({
    specialization: z.string().optional(),
    page: z.coerce.number().int().positive('Page number must be positive').optional(),
    limit: z.coerce.number().int().positive('Limit must be positive').optional(),
  }),
});

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

// Route mappings
router.post('/', authenticate, validate(doctorCreateSchema), createDoctorProfile);
router.get('/:id', authenticate, validate(doctorGetSchema), getDoctorById);
router.get('/', authenticate, validate(doctorListSchema), getDoctors);
router.put('/:id', authenticate, validate(doctorUpdateSchema), updateDoctorProfile);

export default router;
