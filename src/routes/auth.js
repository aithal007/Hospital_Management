import { Router } from 'express';
import { register, login } from '../controllers/auth.js';
import { validate } from '../middleware/validate.js';
import { z } from 'zod';

const router = Router();

// Zod Schema to validate incoming registration request payload
const registerSchema = z.object({
  body: z.object({
    email: z.string().email('Invalid email address format'),
    password: z.string().min(6, 'Password must be at least 6 characters long'),
    role: z.enum(['patient', 'doctor', 'receptionist', 'insurance_agent', 'admin'], {
      errorMap: () => ({ message: 'Invalid user role selected' })
    }),
    first_name: z.string().min(1, 'First name is required'),
    last_name: z.string().min(1, 'Last name is required'),
    phone: z.string().optional(),
  }),
});

// Zod Schema to validate incoming login credentials payload
const loginSchema = z.object({
  body: z.object({
    email: z.string().email('Invalid email address format'),
    password: z.string().min(1, 'Password is required'),
  }),
});

// Route registration
router.post('/register', validate(registerSchema), register);
router.post('/login', validate(loginSchema), login);


export default router;
