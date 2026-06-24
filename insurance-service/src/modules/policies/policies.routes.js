import { Router } from 'express';
import { z } from 'zod';
import {
  createPolicyHandler,
  getPoliciesHandler,
  getPolicyByIdHandler,
  deletePolicyHandler,
} from './policies.controller.js';
import { validate } from '../../middleware/validate.js';
import { authenticate, requireRole } from '../../middleware/auth.js';

const router = Router();

// Zod schemas
const policyCreateSchema = z.object({
  body: z.object({
    patient_id: z.string().uuid('Invalid patient ID'),
    provider: z.string().min(2, 'Provider name must be at least 2 characters'),
    policy_number: z.string().min(3, 'Policy number is required'),
    coverage_amount: z.union([
      z.number().positive('Coverage amount must be positive'),
      z
        .string()
        .regex(/^\d+(\.\d{1,2})?$/, 'Coverage amount must be a valid positive number')
        .transform(Number),
    ]),
    valid_from: z.string().datetime({ offset: true }).or(z.string().date()),
    valid_until: z.string().datetime({ offset: true }).or(z.string().date()),
  }),
});

const policyIdSchema = z.object({
  params: z.object({
    id: z.string().uuid('Invalid policy ID format'),
  }),
});

// POST /policies — Create a new policy (insurance_agent / admin only)
router.post(
  '/',
  authenticate,
  requireRole('insurance_agent', 'admin'),
  validate(policyCreateSchema),
  createPolicyHandler
);

// GET /policies — List policies
router.get(
  '/',
  authenticate,
  requireRole('patient', 'insurance_agent', 'admin'),
  getPoliciesHandler
);

// GET /policies/:id — Get a single policy
router.get(
  '/:id',
  authenticate,
  requireRole('patient', 'insurance_agent', 'admin'),
  validate(policyIdSchema),
  getPolicyByIdHandler
);

// DELETE /policies/:id — Revoke a policy (insurance_agent / admin only)
router.delete(
  '/:id',
  authenticate,
  requireRole('insurance_agent', 'admin'),
  validate(policyIdSchema),
  deletePolicyHandler
);

export default router;
