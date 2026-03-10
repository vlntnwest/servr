const {
  getUserData,
  updateUserData,
  deleteUser,
} = require("../../controllers/user.controllers");

const mockRes = () => {
  const res = {};
  res.status = vi.fn().mockReturnValue(res);
  res.json = vi.fn().mockReturnValue(res);
  return res;
};

describe("user controllers", () => {
  let mockPrisma;
  let mockSupabase;

  beforeEach(() => {
    mockPrisma = globalThis.__mockPrisma;
    mockPrisma.user = {
      findUnique: vi.fn(),
      update: vi.fn(),
    };

    mockSupabase = globalThis.__mockSupabase;
    mockSupabase.auth = {
      admin: {
        deleteUser: vi.fn(),
      },
    };
  });

  // ─── getUserData ────────────────────────────────────────────
  describe("getUserData", () => {
    test("returns 200 with user data", async () => {
      const user = { id: "user-1", email: "test@test.com", fullName: "Jean" };
      mockPrisma.user.findUnique.mockResolvedValue(user);

      const req = { user: { id: "user-1" } };
      const res = mockRes();
      const next = vi.fn();

      await getUserData(req, res, next);

      expect(mockPrisma.user.findUnique).toHaveBeenCalledWith({
        where: { id: "user-1" },
      });
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({ data: user });
    });

    test("returns 404 when user not found", async () => {
      mockPrisma.user.findUnique.mockResolvedValue(null);

      const req = { user: { id: "user-1" } };
      const res = mockRes();
      const next = vi.fn();

      await getUserData(req, res, next);

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({ error: "User not found" });
    });

    test("calls next with error on database failure", async () => {
      const dbError = new Error("DB error");
      mockPrisma.user.findUnique.mockRejectedValue(dbError);

      const req = { user: { id: "user-1" } };
      const res = mockRes();
      const next = vi.fn();

      await getUserData(req, res, next);

      expect(next).toHaveBeenCalledWith(dbError);
    });
  });

  // ─── updateUserData ─────────────────────────────────────────
  describe("updateUserData", () => {
    test("returns 200 with updated user data", async () => {
      const updated = { id: "user-1", fullName: "Jean Dupont", phone: "06 12 34 56 78" };
      mockPrisma.user.update.mockResolvedValue(updated);

      const req = {
        user: { id: "user-1" },
        body: { fullName: "Jean Dupont", phone: "06 12 34 56 78" },
      };
      const res = mockRes();
      const next = vi.fn();

      await updateUserData(req, res, next);

      expect(mockPrisma.user.update).toHaveBeenCalledWith({
        where: { id: "user-1" },
        data: { fullName: "Jean Dupont", phone: "06 12 34 56 78" },
      });
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({ data: updated });
    });

    test("calls next with error on database failure", async () => {
      const dbError = new Error("DB error");
      mockPrisma.user.update.mockRejectedValue(dbError);

      const req = {
        user: { id: "user-1" },
        body: { fullName: "Test" },
      };
      const res = mockRes();
      const next = vi.fn();

      await updateUserData(req, res, next);

      expect(next).toHaveBeenCalledWith(dbError);
    });
  });

  // ─── deleteUser ─────────────────────────────────────────────
  describe("deleteUser", () => {
    test("returns 200 with success message", async () => {
      mockSupabase.auth.admin.deleteUser.mockResolvedValue({});

      const req = { user: { id: "user-1" } };
      const res = mockRes();
      const next = vi.fn();

      await deleteUser(req, res, next);

      expect(mockSupabase.auth.admin.deleteUser).toHaveBeenCalledWith("user-1");
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({
        message: "User deleted successfully",
      });
    });

    test("calls next with error on supabase failure", async () => {
      const supaError = new Error("Supabase error");
      mockSupabase.auth.admin.deleteUser.mockRejectedValue(supaError);

      const req = { user: { id: "user-1" } };
      const res = mockRes();
      const next = vi.fn();

      await deleteUser(req, res, next);

      expect(next).toHaveBeenCalledWith(supaError);
    });
  });
});
