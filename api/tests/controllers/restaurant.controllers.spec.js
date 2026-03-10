const {
  createRestaurant,
  updateRestaurant,
  deleteRestaurant,
} = require("../../controllers/restaurant.controllers");

const mockRes = () => {
  const res = {};
  res.status = vi.fn().mockReturnValue(res);
  res.json = vi.fn().mockReturnValue(res);
  return res;
};

const validBody = {
  name: "Le Resto",
  address: "1 Rue de Test",
  zipCode: "75001",
  city: "Paris",
  phone: "06 12 34 56 78",
  email: "resto@test.com",
  imageUrl: "https://example.com/img.jpg",
};

describe("restaurant controllers", () => {
  let mockPrisma;

  beforeEach(() => {
    mockPrisma = globalThis.__mockPrisma;
    mockPrisma.$transaction = vi.fn();
    mockPrisma.restaurant = {
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    };
    mockPrisma.restaurantMember = { create: vi.fn() };
  });

  // ─── createRestaurant ───────────────────────────────────────
  describe("createRestaurant", () => {
    test("returns 201 with created restaurant", async () => {
      const created = { id: "rest-1", ...validBody };
      mockPrisma.$transaction.mockImplementation(async (fn) => {
        const tx = {
          restaurant: { create: vi.fn().mockResolvedValue(created) },
          restaurantMember: { create: vi.fn().mockResolvedValue({}) },
        };
        return fn(tx);
      });

      const req = { user: { id: "user-1" }, body: validBody };
      const res = mockRes();
      const next = vi.fn();

      await createRestaurant(req, res, next);

      expect(res.status).toHaveBeenCalledWith(201);
      expect(res.json).toHaveBeenCalledWith({ data: created });
    });

    test("creates restaurant member with OWNER role", async () => {
      const created = { id: "rest-1", ...validBody };
      let memberCreateArgs;

      mockPrisma.$transaction.mockImplementation(async (fn) => {
        const tx = {
          restaurant: { create: vi.fn().mockResolvedValue(created) },
          restaurantMember: {
            create: vi.fn().mockImplementation((args) => {
              memberCreateArgs = args;
              return {};
            }),
          },
        };
        return fn(tx);
      });

      const req = { user: { id: "user-1" }, body: validBody };
      const res = mockRes();
      const next = vi.fn();

      await createRestaurant(req, res, next);

      expect(memberCreateArgs).toEqual({
        data: {
          restaurantId: "rest-1",
          userId: "user-1",
          role: "OWNER",
        },
      });
    });

    test("calls next with error on failure", async () => {
      const dbError = new Error("DB error");
      mockPrisma.$transaction.mockRejectedValue(dbError);

      const req = { user: { id: "user-1" }, body: validBody };
      const res = mockRes();
      const next = vi.fn();

      await createRestaurant(req, res, next);

      expect(next).toHaveBeenCalledWith(dbError);
    });
  });

  // ─── updateRestaurant ───────────────────────────────────────
  describe("updateRestaurant", () => {
    test("returns 200 with updated restaurant", async () => {
      const updated = { id: "rest-1", name: "New Name", city: "Paris" };
      mockPrisma.restaurant.update.mockResolvedValue(updated);

      const req = {
        params: { restaurantId: "rest-1" },
        body: { name: "New Name" },
      };
      const res = mockRes();
      const next = vi.fn();

      await updateRestaurant(req, res, next);

      expect(mockPrisma.restaurant.update).toHaveBeenCalledWith({
        where: { id: "rest-1" },
        data: { name: "New Name" },
      });
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({ data: updated });
    });

    test("returns 400 when body is empty", async () => {
      const req = {
        params: { restaurantId: "rest-1" },
        body: {},
      };
      const res = mockRes();
      const next = vi.fn();

      await updateRestaurant(req, res, next);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({ error: "No data" });
      expect(mockPrisma.restaurant.update).not.toHaveBeenCalled();
    });

    test("calls next with error on database failure", async () => {
      const dbError = new Error("DB error");
      mockPrisma.restaurant.update.mockRejectedValue(dbError);

      const req = {
        params: { restaurantId: "rest-1" },
        body: { name: "Test" },
      };
      const res = mockRes();
      const next = vi.fn();

      await updateRestaurant(req, res, next);

      expect(next).toHaveBeenCalledWith(dbError);
    });
  });

  // ─── deleteRestaurant ───────────────────────────────────────
  describe("deleteRestaurant", () => {
    test("returns 200 with success message", async () => {
      mockPrisma.restaurant.delete.mockResolvedValue({});

      const req = { params: { restaurantId: "rest-1" } };
      const res = mockRes();
      const next = vi.fn();

      await deleteRestaurant(req, res, next);

      expect(mockPrisma.restaurant.delete).toHaveBeenCalledWith({
        where: { id: "rest-1" },
      });
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({
        message: "Restaurant deleted successfully",
      });
    });

    test("calls next with error on database failure", async () => {
      const dbError = new Error("DB error");
      mockPrisma.restaurant.delete.mockRejectedValue(dbError);

      const req = { params: { restaurantId: "rest-1" } };
      const res = mockRes();
      const next = vi.fn();

      await deleteRestaurant(req, res, next);

      expect(next).toHaveBeenCalledWith(dbError);
    });
  });
});
