import { rateLimit } from 'express-rate-limit';

// Rate limiter for login requests to protect against brute-force attacks
export const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  limit: 5, // Limit each IP to 5 login requests per 15-minute window
  standardHeaders: 'draft-7', // Return rate limit info in the `RateLimit` headers
  legacyHeaders: false, // Disable the `X-RateLimit-*` headers
  message: {
    status: 'error',
    statusCode: 429,
    message: 'Too many login attempts from this IP, please try again after 15 minutes.'
  }
});
