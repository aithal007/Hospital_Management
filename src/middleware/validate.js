export const validate = (schema) => (req, res, next) => {
  try {
    // Validate request inputs (body, query params, URL params) against the schema
    schema.parse({
      body: req.body,
      query: req.query,
      params: req.params,
    });
    next();
  } catch (error) {
    // Forward any Zod validation errors to our error handler
    next(error);
  }
};
