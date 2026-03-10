const { isOwner, isAdmin, isStaff } = require("../../middleware/role.middleware");

const mockRes = () => {
  const res = {};
  res.status = vi.fn().mockReturnValue(res);
  res.json = vi.fn().mockReturnValue(res);
  return res;
};

const RESTAURANT_ID = "rest-111";
const OTHER_RESTAURANT_ID = "rest-999";

const makeUser = (role, restaurantId = RESTAURANT_ID) => ({
  id: "user-1",
  restaurantMembers: [{ restaurantId, role, restaurant: {} }],
});

describe("role middleware", () => {
  // ─── isOwner ────────────────────────────────────────────────
  describe("isOwner", () => {
    test("calls next when user is OWNER of the restaurant", () => {
      const req = {
        user: makeUser("OWNER"),
        params: { restaurantId: RESTAURANT_ID },
      };
      const res = mockRes();
      const next = vi.fn();

      isOwner(req, res, next);

      expect(next).toHaveBeenCalledOnce();
    });

    test("returns 403 when user is ADMIN (not OWNER)", () => {
      const req = {
        user: makeUser("ADMIN"),
        params: { restaurantId: RESTAURANT_ID },
      };
      const res = mockRes();
      const next = vi.fn();

      isOwner(req, res, next);

      expect(next).not.toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.json).toHaveBeenCalledWith({ error: "Access denied" });
    });

    test("returns 403 when user is STAFF", () => {
      const req = {
        user: makeUser("STAFF"),
        params: { restaurantId: RESTAURANT_ID },
      };
      const res = mockRes();
      const next = vi.fn();

      isOwner(req, res, next);

      expect(next).not.toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(403);
    });

    test("returns 403 when user belongs to a different restaurant", () => {
      const req = {
        user: makeUser("OWNER", OTHER_RESTAURANT_ID),
        params: { restaurantId: RESTAURANT_ID },
      };
      const res = mockRes();
      const next = vi.fn();

      isOwner(req, res, next);

      expect(next).not.toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(403);
    });

    test("returns 403 when user has no restaurant memberships", () => {
      const req = {
        user: { id: "user-1", restaurantMembers: [] },
        params: { restaurantId: RESTAURANT_ID },
      };
      const res = mockRes();
      const next = vi.fn();

      isOwner(req, res, next);

      expect(next).not.toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(403);
    });
  });

  // ─── isAdmin ────────────────────────────────────────────────
  describe("isAdmin", () => {
    test("calls next when user is OWNER", () => {
      const req = {
        user: makeUser("OWNER"),
        params: { restaurantId: RESTAURANT_ID },
      };
      const res = mockRes();
      const next = vi.fn();

      isAdmin(req, res, next);

      expect(next).toHaveBeenCalledOnce();
    });

    test("calls next when user is ADMIN", () => {
      const req = {
        user: makeUser("ADMIN"),
        params: { restaurantId: RESTAURANT_ID },
      };
      const res = mockRes();
      const next = vi.fn();

      isAdmin(req, res, next);

      expect(next).toHaveBeenCalledOnce();
    });

    test("returns 403 when user is STAFF", () => {
      const req = {
        user: makeUser("STAFF"),
        params: { restaurantId: RESTAURANT_ID },
      };
      const res = mockRes();
      const next = vi.fn();

      isAdmin(req, res, next);

      expect(next).not.toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(403);
    });

    test("returns 403 when user belongs to a different restaurant", () => {
      const req = {
        user: makeUser("ADMIN", OTHER_RESTAURANT_ID),
        params: { restaurantId: RESTAURANT_ID },
      };
      const res = mockRes();
      const next = vi.fn();

      isAdmin(req, res, next);

      expect(next).not.toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(403);
    });
  });

  // ─── isStaff ────────────────────────────────────────────────
  describe("isStaff", () => {
    test("calls next when user is any member of the restaurant", () => {
      for (const role of ["OWNER", "ADMIN", "STAFF"]) {
        const req = {
          user: makeUser(role),
          params: { restaurantId: RESTAURANT_ID },
        };
        const res = mockRes();
        const next = vi.fn();

        isStaff(req, res, next);

        expect(next).toHaveBeenCalledOnce();
      }
    });

    test("returns 403 when user belongs to a different restaurant", () => {
      const req = {
        user: makeUser("OWNER", OTHER_RESTAURANT_ID),
        params: { restaurantId: RESTAURANT_ID },
      };
      const res = mockRes();
      const next = vi.fn();

      isStaff(req, res, next);

      expect(next).not.toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(403);
    });

    test("returns 403 when user has no memberships", () => {
      const req = {
        user: { id: "user-1", restaurantMembers: [] },
        params: { restaurantId: RESTAURANT_ID },
      };
      const res = mockRes();
      const next = vi.fn();

      isStaff(req, res, next);

      expect(next).not.toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(403);
    });
  });
});
