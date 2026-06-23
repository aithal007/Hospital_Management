import { Router } from 'express';
import { z } from 'zod';
import { createPrescriptionHandler, getPrescriptionByIdHandler, getPrescriptionsHandler } from './prescriptions.controller.js';
import { validate } from '../../middleware/validate.js';
import { authenticate, requireRole } from '../../middleware/auth.js';

const router = Router();

const prescriptionItemSchema = z.object({
  medicine_name: z.string().min(1, 'Medicine name is required'),
  dosage: z.string().min(1, 'Dosage is required'),
  frequency: z.string().min(1, 'Frequency is required'),
  duration_days: z.number().int().positive('Duration must be a positive integer'),
});

const prescriptionCreateSchema = z.object({
  body: z.object({
    appointment_id: z.string().uuid('Invalid appointment ID format'),
    notes: z.string().optional().nullable(),
    items: z
      .array(prescriptionItemSchema)
      .min(1, 'At least one medicine item is required'),
  }),
});

const prescriptionIdSchema = z.object({
  params: z.object({
    id: z.string().uuid('Invalid prescription ID format'),
  }),
});

const prescriptionListSchema = z.object({
  query: z.object({
    patientId: z.string().uuid('Invalid patient ID format').optional(),
    doctorId: z.string().uuid('Invalid doctor ID format').optional(),
  }),
});

router.post(
  '/',
  authenticate,
  requireRole('doctor'),
  validate(prescriptionCreateSchema),
  createPrescriptionHandler
);

router.get(
  '/',
  authenticate,
  requireRole('patient', 'doctor', 'receptionist', 'admin'),
  validate(prescriptionListSchema),
  getPrescriptionsHandler
);

router.get(
  '/:id',
  authenticate,
  requireRole('patient', 'doctor', 'receptionist', 'admin'),
  validate(prescriptionIdSchema),
  getPrescriptionByIdHandler
);

export default router;
