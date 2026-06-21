export const requestLogger = (req, res, next) => {
  const start = Date.now();
  const { method, url } = req;

  // Wait for the response to finish sending
  res.on('finish', () => {
    const duration = Date.now() - start;
    const { statusCode } = res;
    console.log(`[${new Date().toISOString()}] ${method} ${url} - ${statusCode} (${duration}ms)`);
  });

  next();
};
