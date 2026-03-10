const { ZodError } = require("zod");
const logger = require("../logger");

/**
 * Middleware factory for validating request data with Zod schemas
 * @param {Object} schemas - Object containing schemas for body, params, and/or query
 * @param {import('zod').ZodSchema} [schemas.body] - Schema for request body
 * @param {import('zod').ZodSchema} [schemas.params] - Schema for URL params
 * @param {import('zod').ZodSchema} [schemas.query] - Schema for query string
 */
const validate = (schemas) => {
  return async (req, res, next) => {
    try {
      if (schemas.body) {
        req.body = await schemas.body.parseAsync(req.body);
      }
      if (schemas.params) {
        req.params = await schemas.params.parseAsync(req.params);
      }
      if (schemas.query) {
        req.query = await schemas.query.parseAsync(req.query);
      }
      next();
    } catch (error) {
      if (error instanceof ZodError) {
        const errors = error.errors.map((err) => ({
          field: err.path.join("."),
          message: err.message,
        }));
        return res.status(400).json({
          error: "Validation failed",
          details: errors,
        });
      }
      // Unexpected error
      logger.error({ error }, "Validation middleware error");
      return res.status(500).json({ error: "Internal server error" });
    }
  };
};

module.exports = {
  validate,
};
