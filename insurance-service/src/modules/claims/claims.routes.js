import { Router } from 'express';
import { z } from 'zod';
import {
  submitClaimHandler,
  getClaimByIdHandler,
  getClaimsHandler,
} from './claims.controller.js';
import { validate } from '../../middleware/validate.js';
import { authenticate, requireRole } from '../../middleware/auth.js';

const router = Router();

const claimCreateSchema = z.object({
  body: z.object({
    appointment_id: z.string().uuid('Invalid appointment ID format'),
    amount: z.union([
      z.number().positive('Claim amount must be greater than zero'),
      z
        .string()
        .regex(/^\d+(\.\d{1,2})?$/, 'Claim amount must be a valid positive number')
        .transform(Number),
    ]),
  }),
});

const claimIdSchema = z.object({
  params: z.object({
    id: z.string().uuid('Invalid claim ID format'),
  }),
});

const claimListSchema = z.object({
  query: z.object({
    patientId: z.string().uuid('Invalid patient ID format').optional(),
  }),
});

// POST /claims — Patient submits a claim
router.post(
  '/',
  authenticate,
  requireRole('patient'),
  validate(claimCreateSchema),
  submitClaimHandler
);

// GET /claims — List claims (patient sees own, insurance_agent/admin see all or filter by patientId)
router.get(
  '/',
  authenticate,
  requireRole('patient', 'insurance_agent', 'admin'),
  validate(claimListSchema),
  getClaimsHandler
);

// GET /claims/:id — Get single claim
router.get(
  '/:id',
  authenticate,
  requireRole('patient', 'insurance_agent', 'admin'),
  validate(claimIdSchema),
  getClaimByIdHandler
);

export default router;
