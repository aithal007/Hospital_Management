/**
 * Global error handling middleware for notification-service
 */
export function errorHandler(err, req, res, next) {
  console.error('[Notification Service Error Handled]:', err.stack || err.message);

  const status = err.status || 500;
  const message = err.message || 'Internal Server Error';

  res.status(status).json({
    success: false,
    error: message,
  });
}
