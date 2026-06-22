import { Router } from 'express';
import { createDoctorProfile, getDoctorById, getDoctors } from '../controllers/doctors.js';
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
  }),
});

// Route: Get All Doctors (accessible by authenticated users, supports ?specialization= query filter)
router.get('/', authenticate, validate(doctorListSchema), getDoctors);

export default router;
