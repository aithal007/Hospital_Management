import { Router } from 'express';
import { getHealth } from '../controllers/health.js';
import { validate } from '../middleware/validate.js';
import { z } from 'zod';

const router = Router();

router.get('/', getHealth);

// Schema defining constraints on incoming request body
const testValidationSchema = z.object({
  body: z.object({
    email: z.string().email('Invalid email address format'),
    age: z.number().min(18, 'Must be at least 18 years old'),
  }),
});

// Endpoint that requires passing validation checks
router.post('/validate-test', validate(testValidationSchema), (req, res) => {
  res.json({
    message: 'Validation Passed!',
    data: req.body,
  });
});

// Temporary test route to trigger the error handler
router.get('/error', (req, res, next) => {
  const error = new Error('Test error triggered successfully!');
  error.statusCode = 400; // Bad Request
  next(error);
});

export default router;
