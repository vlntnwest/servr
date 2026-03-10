const { ZodError } = require("zod");
const { Prisma } = require("@prisma/client");
const errorHandler = require("../../middleware/error.middleware");

const mockRes = () => {
  const res = {};
  res.status = vi.fn().mockReturnValue(res);
  res.json = vi.fn().mockReturnValue(res);
  return res;
};

const mockReq = {};
const mockNext = vi.fn();

describe("error middleware", () => {
  // ─── ZOD ERRORS ─────────────────────────────────────────────
  describe("ZodError handling", () => {
    test("returns 400 with formatted validation errors", () => {
      const zodError = new ZodError([
        {
          code: "too_small",
          minimum: 1,
          type: "string",
          inclusive: true,
          exact: false,
          message: "String must contain at least 1 character(s)",
          path: ["name"],
        },
      ]);
      const res = mockRes();

      errorHandler(zodError, mockReq, res, mockNext);

      expect(res.status).toHaveBeenCalledWith(400);
      const body = res.json.mock.calls[0][0];
      expect(body.error).toBe("Validation failed");
      expect(body.details).toEqual([
        { field: "name", message: "String must contain at least 1 character(s)" },
      ]);
    });

    test("handles multiple ZodError fields", () => {
      const zodError = new ZodError([
        { code: "invalid_type", expected: "string", received: "number", path: ["name"], message: "Expected string" },
        { code: "invalid_type", expected: "string", received: "undefined", path: ["email"], message: "Required" },
      ]);
      const res = mockRes();

      errorHandler(zodError, mockReq, res, mockNext);

      const body = res.json.mock.calls[0][0];
      expect(body.details).toHaveLength(2);
      expect(body.details[0].field).toBe("name");
      expect(body.details[1].field).toBe("email");
    });
  });

  // ─── PRISMA ERRORS ──────────────────────────────────────────
  describe("Prisma error handling", () => {
    test("returns 404 for P2025 (record not found)", () => {
      const prismaError = new Prisma.PrismaClientKnownRequestError(
        "Record not found",
        { code: "P2025", clientVersion: "5.0.0" },
      );
      const res = mockRes();

      errorHandler(prismaError, mockReq, res, mockNext);

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({ error: "Resource not found" });
    });

    test("returns 409 for P2002 (unique constraint)", () => {
      const prismaError = new Prisma.PrismaClientKnownRequestError(
        "Unique constraint failed",
        { code: "P2002", clientVersion: "5.0.0", meta: { target: ["email"] } },
      );
      const res = mockRes();

      errorHandler(prismaError, mockReq, res, mockNext);

      expect(res.status).toHaveBeenCalledWith(409);
      expect(res.json).toHaveBeenCalledWith({ error: "Resource already exists" });
    });

    test("returns 400 for other Prisma known errors", () => {
      const prismaError = new Prisma.PrismaClientKnownRequestError(
        "Some error",
        { code: "P2003", clientVersion: "5.0.0" },
      );
      const res = mockRes();

      errorHandler(prismaError, mockReq, res, mockNext);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({ error: "Database request error" });
    });
  });

  // ─── GENERIC ERRORS ─────────────────────────────────────────
  describe("generic error handling", () => {
    test("returns 500 for unexpected errors", () => {
      const error = new Error("Something went wrong");
      const res = mockRes();

      errorHandler(error, mockReq, res, mockNext);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({ error: "Internal server error" });
    });

    test("uses statusCode from error if present", () => {
      const error = new Error("Forbidden");
      error.statusCode = 403;
      const res = mockRes();

      errorHandler(error, mockReq, res, mockNext);

      expect(res.status).toHaveBeenCalledWith(403);
    });
  });
});
