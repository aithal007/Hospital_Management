/**
 * Express middleware to log incoming HTTP requests
 */
export function requestLogger(req, res, next) {
  const start = Date.now();

  res.on('finish', () => {
    const duration = Date.now() - start;
    const { method, originalUrl } = req;
    const { statusCode } = res;

    console.log(
      `[Notification Service] ${method} ${originalUrl} - Status: ${statusCode} - ${duration}ms`
    );
  });

  next();
}
