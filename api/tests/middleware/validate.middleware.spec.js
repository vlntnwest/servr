const { z } = require("zod");
const { validate } = require("../../middleware/validate.middleware");

const mockRes = () => {
  const res = {};
  res.status = vi.fn().mockReturnValue(res);
  res.json = vi.fn().mockReturnValue(res);
  return res;
};

describe("validate middleware", () => {
  // ─── BODY VALIDATION ────────────────────────────────────────
  describe("body validation", () => {
    const schema = z.object({ name: z.string().min(1) });

    test("passes valid body and calls next", async () => {
      const req = { body: { name: "Test" } };
      const res = mockRes();
      const next = vi.fn();

      await validate({ body: schema })(req, res, next);

      expect(next).toHaveBeenCalledOnce();
      expect(req.body.name).toBe("Test");
    });

    test("returns 400 for invalid body", async () => {
      const req = { body: { name: "" } };
      const res = mockRes();
      const next = vi.fn();

      await validate({ body: schema })(req, res, next);

      expect(next).not.toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ error: "Validation failed" }),
      );
    });

    test("returns error details with field and message", async () => {
      const req = { body: {} };
      const res = mockRes();
      const next = vi.fn();

      await validate({ body: schema })(req, res, next);

      const response = res.json.mock.calls[0][0];
      expect(response.details).toBeInstanceOf(Array);
      expect(response.details[0]).toHaveProperty("field");
      expect(response.details[0]).toHaveProperty("message");
    });
  });

  // ─── PARAMS VALIDATION ──────────────────────────────────────
  describe("params validation", () => {
    const schema = z.object({ id: z.string().uuid() });

    test("passes valid params and calls next", async () => {
      const req = { params: { id: "550e8400-e29b-41d4-a716-446655440000" } };
      const res = mockRes();
      const next = vi.fn();

      await validate({ params: schema })(req, res, next);

      expect(next).toHaveBeenCalledOnce();
    });

    test("returns 400 for invalid params", async () => {
      const req = { params: { id: "not-a-uuid" } };
      const res = mockRes();
      const next = vi.fn();

      await validate({ params: schema })(req, res, next);

      expect(next).not.toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(400);
    });
  });

  // ─── QUERY VALIDATION ───────────────────────────────────────
  describe("query validation", () => {
    const schema = z.object({ page: z.string().regex(/^\d+$/) });

    test("passes valid query and calls next", async () => {
      const req = { query: { page: "1" } };
      const res = mockRes();
      const next = vi.fn();

      await validate({ query: schema })(req, res, next);

      expect(next).toHaveBeenCalledOnce();
    });

    test("returns 400 for invalid query", async () => {
      const req = { query: { page: "abc" } };
      const res = mockRes();
      const next = vi.fn();

      await validate({ query: schema })(req, res, next);

      expect(next).not.toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(400);
    });
  });

  // ─── NO SCHEMAS ─────────────────────────────────────────────
  test("calls next when no schemas provided", async () => {
    const req = { body: { anything: true } };
    const res = mockRes();
    const next = vi.fn();

    await validate({})(req, res, next);

    expect(next).toHaveBeenCalledOnce();
  });

  // ─── COMBINED SCHEMAS ───────────────────────────────────────
  test("validates body and params together", async () => {
    const bodySchema = z.object({ name: z.string() });
    const paramsSchema = z.object({ id: z.string().uuid() });

    const req = {
      body: { name: "Test" },
      params: { id: "550e8400-e29b-41d4-a716-446655440000" },
    };
    const res = mockRes();
    const next = vi.fn();

    await validate({ body: bodySchema, params: paramsSchema })(req, res, next);

    expect(next).toHaveBeenCalledOnce();
  });
});
