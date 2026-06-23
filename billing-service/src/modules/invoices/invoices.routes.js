import { Router } from 'express';
import { z } from 'zod';
import { createInvoiceHandler, getInvoicesHandler, getInvoiceByIdHandler, payInvoiceHandler, refundInvoiceHandler } from './invoices.controller.js';
import { validate } from '../../middleware/validate.js';
import { authenticate, requireRole } from '../../middleware/auth.js';

const router = Router();

// Zod Schema to validate incoming manual invoice creations
const invoiceCreateSchema = z.object({
  body: z.object({
    appointment_id: z.string().uuid('Invalid appointment ID format'),
    amount: z.union([
      z.number().positive('Invoice amount must be greater than zero'),
      z.string().regex(/^\d+(\.\d{1,2})?$/, 'Invoice amount must be a valid positive currency number')
    ])
  }),
});

const invoiceIdSchema = z.object({
  params: z.object({
    id: z.string().uuid('Invalid invoice ID format')
  })
});

const paymentCreateSchema = z.object({
  params: z.object({
    id: z.string().uuid('Invalid invoice ID format')
  }),
  body: z.object({
    method: z.enum(['card', 'cash', 'insurance'], {
      errorMap: () => ({
        message: "Payment method must be one of 'card', 'cash', or 'insurance'"
      })
    }),
    amount: z.union([
      z.number().positive('Payment amount must be greater than zero'),
      z.string().regex(/^\d+(\.\d{1,2})?$/, 'Payment amount must be a valid positive currency number')
    ])
  })
});

// Create manual invoice (Admins & Receptionists only)
router.post(
  '/',
  authenticate,
  requireRole('receptionist', 'admin'),
  validate(invoiceCreateSchema),
  createInvoiceHandler
);

// Get list of invoices (All authenticated users; patients see their own, admins/receptionists see all)
router.get(
  '/',
  authenticate,
  requireRole('patient', 'receptionist', 'admin'),
  getInvoicesHandler
);

// Get details of specific invoice (All authenticated users; patients checked for ownership in service)
router.get(
  '/:id',
  authenticate,
  requireRole('patient', 'receptionist', 'admin'),
  validate(invoiceIdSchema),
  getInvoiceByIdHandler
);

// Pay/Cover specific invoice (All authenticated roles; patients pay their own, staff can record payments)
router.post(
  '/:id/payments',
  authenticate,
  requireRole('patient', 'receptionist', 'admin'),
  validate(paymentCreateSchema),
  payInvoiceHandler
);

// Refund specific invoice (Staff only: Admin & Receptionist)
router.post(
  '/:id/refunds',
  authenticate,
  requireRole('receptionist', 'admin'),
  validate(invoiceIdSchema),
  refundInvoiceHandler
);

export default router;



