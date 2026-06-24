import { Router } from 'express';
import {
  createPatientProfile,
  getPatientById,
  updatePatientProfile,
  getPatientEmail,
} from './patients.controller.js';
import { validate } from '../../middleware/validate.js';
import { authenticate } from '../../middleware/auth.js';
import { z } from 'zod';

const router = Router();

// Zod Schema to validate incoming patient profile data
const patientCreateSchema = z.object({
  body: z.object({
    user_id: z.string().uuid('Invalid user ID format').optional(),
    date_of_birth: z.string().refine((val) => !isNaN(Date.parse(val)), {
      message: 'Invalid date of birth format (must be YYYY-MM-DD)',
    }),
    gender: z.string().min(1, 'Gender is required'),
    address: z.string().optional().nullable(),
    insurance_provider: z.string().optional().nullable(),
    insurance_policy_number: z.string().optional().nullable(),
  }),
});

// Zod Schema to validate patient profile lookup parameters
const patientGetSchema = z.object({
  params: z.object({
    id: z.string().uuid('Invalid patient profile ID format'),
  }),
});

// Zod Schema to validate patient profile update inputs
const patientUpdateSchema = z.object({
  params: z.object({
    id: z.string().uuid('Invalid patient profile ID format'),
  }),
  body: z.object({
    date_of_birth: z
      .string()
      .refine((val) => !isNaN(Date.parse(val)), {
        message: 'Invalid date of birth format (must be YYYY-MM-DD)',
      })
      .optional(),
    gender: z.string().min(1, 'Gender cannot be empty').optional(),
    address: z.string().optional().nullable(),
    insurance_provider: z.string().optional().nullable(),
    insurance_policy_number: z.string().optional().nullable(),
  }),
});

// Route mappings
router.post('/', authenticate, validate(patientCreateSchema), createPatientProfile);
router.get('/:id', authenticate, validate(patientGetSchema), getPatientById);
router.put('/:id', authenticate, validate(patientUpdateSchema), updatePatientProfile);

// Internal service-to-service: get patient email by patient profile ID (no auth required; restrict by network in production)
router.get('/:id/email', validate(patientGetSchema), getPatientEmail);

export default router;
