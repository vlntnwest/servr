const checkAuth = require("../../middleware/auth.middleware");

const mockRes = () => {
  const res = {};
  res.status = vi.fn().mockReturnValue(res);
  res.json = vi.fn().mockReturnValue(res);
  return res;
};

describe("auth middleware", () => {
  let mockPrisma;
  let mockSupabase;

  beforeEach(() => {
    mockPrisma = globalThis.__mockPrisma;
    mockPrisma.user = {
      findUnique: vi.fn(),
    };

    mockSupabase = globalThis.__mockSupabase;
    mockSupabase.auth = {
      getUser: vi.fn(),
    };
  });

  test("returns 401 when no token is provided", async () => {
    const req = { headers: {} };
    const res = mockRes();
    const next = vi.fn();

    await checkAuth(req, res, next);

    expect(next).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith({ error: "Not authenticated" });
  });

  test("returns 401 when supabase returns an error", async () => {
    mockSupabase.auth.getUser.mockResolvedValue({
      data: { user: null },
      error: { message: "Invalid token" },
    });

    const req = { headers: { authorization: "Bearer bad-token" } };
    const res = mockRes();
    const next = vi.fn();

    await checkAuth(req, res, next);

    expect(mockSupabase.auth.getUser).toHaveBeenCalledWith("bad-token");
    expect(next).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith({ error: "Invalid token" });
  });

  test("returns 401 when supabase returns no user", async () => {
    mockSupabase.auth.getUser.mockResolvedValue({
      data: { user: null },
      error: null,
    });

    const req = { headers: { authorization: "Bearer some-token" } };
    const res = mockRes();
    const next = vi.fn();

    await checkAuth(req, res, next);

    expect(next).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(401);
  });

  test("returns 500 when prisma throws", async () => {
    mockSupabase.auth.getUser.mockResolvedValue({
      data: { user: { id: "user-1" } },
      error: null,
    });
    mockPrisma.user.findUnique.mockRejectedValue(new Error("DB down"));

    const req = { headers: { authorization: "Bearer valid-token" } };
    const res = mockRes();
    const next = vi.fn();

    await checkAuth(req, res, next);

    expect(next).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(500);
  });

  test("returns 401 when user not found in database", async () => {
    mockSupabase.auth.getUser.mockResolvedValue({
      data: { user: { id: "user-1" } },
      error: null,
    });
    mockPrisma.user.findUnique.mockResolvedValue(null);

    const req = { headers: { authorization: "Bearer valid-token" } };
    const res = mockRes();
    const next = vi.fn();

    await checkAuth(req, res, next);

    expect(next).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith({ error: "User not found" });
  });

  test("sets req.user and calls next on success", async () => {
    const dbUser = {
      id: "user-1",
      email: "test@test.com",
      restaurantMembers: [],
    };

    mockSupabase.auth.getUser.mockResolvedValue({
      data: { user: { id: "user-1" } },
      error: null,
    });
    mockPrisma.user.findUnique.mockResolvedValue(dbUser);

    const req = { headers: { authorization: "Bearer valid-token" } };
    const res = mockRes();
    const next = vi.fn();

    await checkAuth(req, res, next);

    expect(req.user).toEqual(dbUser);
    expect(next).toHaveBeenCalledOnce();
    expect(mockPrisma.user.findUnique).toHaveBeenCalledWith({
      where: { id: "user-1" },
      include: { restaurantMembers: { include: { restaurant: true } } },
    });
  });

  test("strips 'Bearer ' prefix from token", async () => {
    mockSupabase.auth.getUser.mockResolvedValue({
      data: { user: null },
      error: { message: "bad" },
    });

    const req = { headers: { authorization: "Bearer my-token-123" } };
    const res = mockRes();
    const next = vi.fn();

    await checkAuth(req, res, next);

    expect(mockSupabase.auth.getUser).toHaveBeenCalledWith("my-token-123");
  });
});
