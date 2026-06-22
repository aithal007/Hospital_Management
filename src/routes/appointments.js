import { Router } from 'express';
import { createAppointment, getAppointments, getAppointmentById, updateAppointmentStatus } from '../controllers/appointments.js';
import { validate } from '../middleware/validate.js';
import { authenticate } from '../middleware/auth.js';
import { z } from 'zod';

const router = Router();

// Zod Schema to validate incoming appointment booking requests
export const appointmentCreateSchema = z.object({
  body: z.object({
    patient_id: z.string().uuid('Invalid patient profile ID format').optional(),
    doctor_id: z.string().uuid('Invalid doctor profile ID format'),
    appointment_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, {
      message: 'Invalid date format (must be YYYY-MM-DD)',
    }).refine((val) => !isNaN(Date.parse(val)), {
      message: 'Invalid appointment date',
    }),
    start_time: z.string().regex(/^(0[0-9]|1[0-9]|2[0-3]):[0-5][0-9](:[0-5][0-9])?$/, {
      message: 'Invalid start_time format (must be HH:MM or HH:MM:SS)',
    }),
    end_time: z.string().regex(/^(0[0-9]|1[0-9]|2[0-3]):[0-5][0-9](:[0-5][0-9])?$/, {
      message: 'Invalid end_time format (must be HH:MM or HH:MM:SS)',
    }),
    reason: z.string().optional().nullable(),
  }),
});

// Route: POST /appointments (accessible by authenticated users, role-checked in controller)
router.post('/', authenticate, validate(appointmentCreateSchema), createAppointment);

// Route: GET /appointments (accessible by authenticated users, visibility scoped in controller)
router.get('/', authenticate, getAppointments);

// Zod Schema to validate appointment lookup parameters
const appointmentGetSchema = z.object({
  params: z.object({
    id: z.string().uuid('Invalid appointment ID format'),
  }),
});

// Route: GET /appointments/:id (accessible by authenticated users, authorization-checked in controller)
router.get('/:id', authenticate, validate(appointmentGetSchema), getAppointmentById);

// Zod Schema to validate appointment status updates
export const appointmentUpdateStatusSchema = z.object({
  params: z.object({
    id: z.string().uuid('Invalid appointment ID format'),
  }),
  body: z.object({
    status: z.enum(['pending', 'approved', 'cancelled', 'completed'], {
      errorMap: () => ({ message: 'Status must be one of pending, approved, cancelled, completed' }),
    }),
  }),
});

// Route: PUT /appointments/:id/status (accessible by authenticated users, role/transition-checked in controller)
router.put('/:id/status', authenticate, validate(appointmentUpdateStatusSchema), updateAppointmentStatus);

export default router;
