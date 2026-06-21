import { ZodError } from 'zod';
import { NODE_ENV } from '../config/index.js';

export const errorHandler = (err, req, res, next) => {
  // If response headers have already been sent, delegate to Express default handler
  if (res.headersSent) {
    return next(err);
  }

  // If it's a Zod Validation Error, format and return immediately
  if (err instanceof ZodError) {
    return res.status(400).json({
      status: 'error',
      statusCode: 400,
      message: 'Validation Failed',
      errors: err.errors.map((e) => ({
        field: e.path.join('.'),
        message: e.message,
      })),
    });
  }

  // Set status code (default to 500 if not specified)
  const statusCode = err.statusCode || 500;
  const message = err.message || 'Internal Server Error';

  // Log the complete error stack in server console for debugging
  console.error(`[Error] ${req.method} ${req.url} - ${statusCode}: ${err.stack}`);

  // Send uniform JSON error response
  res.status(statusCode).json({
    status: 'error',
    statusCode,
    message,
    // Only include stack trace details if running in development mode
    ...(NODE_ENV === 'development' && { stack: err.stack }),
  });
};

