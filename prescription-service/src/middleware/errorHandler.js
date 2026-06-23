import { ZodError } from 'zod';

const nodeEnv = process.env.NODE_ENV || 'development';

export const errorHandler = (err, req, res, next) => {
  if (res.headersSent) {
    return next(err);
  }

  if (err instanceof ZodError) {
    const issues = err.issues || err.errors || [];
    return res.status(400).json({
      status: 'error',
      statusCode: 400,
      message: 'Validation Failed',
      errors: issues.map((e) => ({
        field: e.path.join('.'),
        message: e.message,
      })),
    });
  }

  const statusCode = err.statusCode || 500;
  const message = err.message || 'Internal Server Error';

  console.error(`[Error] ${req.method} ${req.url} - ${statusCode}: ${err.stack}`);

  res.status(statusCode).json({
    status: 'error',
    statusCode,
    message,
    ...(nodeEnv === 'development' && { stack: err.stack }),
  });
};
