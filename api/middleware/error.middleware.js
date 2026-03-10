const { ZodError } = require("zod");
const { Prisma } = require("@prisma/client");
const logger = require("../logger");
const { captureException } = require("../lib/sentry");

const errorHandler = (err, req, res, next) => {
  // Zod validation errors
  if (err instanceof ZodError) {
    const errors = err.errors.map((e) => ({
      field: e.path.join("."),
      message: e.message,
    }));
    logger.warn({ errors }, "Validation error");
    return res.status(400).json({ error: "Validation failed", details: errors });
  }

  // Prisma known request errors
  if (err instanceof Prisma.PrismaClientKnownRequestError) {
    if (err.code === "P2025") {
      logger.warn({ code: err.code }, "Resource not found");
      return res.status(404).json({ error: "Resource not found" });
    }
    if (err.code === "P2002") {
      logger.warn({ code: err.code, meta: err.meta }, "Unique constraint violation");
      return res.status(409).json({ error: "Resource already exists" });
    }
    logger.error({ code: err.code, meta: err.meta }, "Prisma request error");
    return res.status(400).json({ error: "Database request error" });
  }

  // Default: unexpected error
  logger.error({ error: err.message, stack: err.stack }, "Unexpected error");
  captureException(err, { requestId: req.requestId, path: req.path });
  return res.status(err.statusCode || 500).json({ error: "Internal server error" });
};

module.exports = errorHandler;
