const {
  createOrder,
  getOrders,
  getOrder,
  updateOrderStatus,
} = require("../../controllers/order.controllers");

const mockRes = () => {
  const res = {};
  res.status = vi.fn().mockReturnValue(res);
  res.json = vi.fn().mockReturnValue(res);
  return res;
};

const baseOrder = {
  id: "order-1",
  restaurantId: "rest-1",
  status: "PENDING",
  totalPrice: "10.00",
  orderProducts: [],
};

describe("order controllers", () => {
  let mockPrisma;

  beforeEach(() => {
    mockPrisma = globalThis.__mockPrisma;
    mockPrisma.$transaction = vi.fn();
    mockPrisma.product = { findMany: vi.fn() };
    mockPrisma.optionChoice = { findMany: vi.fn() };
    mockPrisma.openingHour = { findMany: vi.fn().mockResolvedValue([]) };
    mockPrisma.order = {
      create: vi.fn(),
      findMany: vi.fn(),
      findUnique: vi.fn(),
      update: vi.fn(),
      count: vi.fn().mockResolvedValue(0),
    };
  });

  // ─── createOrder ─────────────────────────────────────────────
  describe("createOrder", () => {
    const makeReq = (overrides = {}) => ({
      params: { restaurantId: "rest-1" },
      body: {
        fullName: "John Doe",
        items: [{ productId: "prod-1", quantity: 1, optionChoiceIds: [] }],
        ...overrides,
      },
    });

    test("returns 201 with created order", async () => {
      mockPrisma.product.findMany.mockResolvedValue([
        { id: "prod-1", price: "10.00", isAvailable: true },
      ]);
      mockPrisma.optionChoice.findMany.mockResolvedValue([]);
      mockPrisma.$transaction.mockImplementation(async (fn) => {
        const tx = {
          order: {
            create: vi.fn().mockResolvedValue({ id: "order-1" }),
            findUnique: vi.fn().mockResolvedValue(baseOrder),
          },
          orderProduct: { create: vi.fn().mockResolvedValue({ id: "op-1" }) },
          orderProductOption: { createMany: vi.fn() },
        };
        return fn(tx);
      });

      const req = makeReq();
      const res = mockRes();
      const next = vi.fn();

      await createOrder(req, res, next);

      expect(res.status).toHaveBeenCalledWith(201);
      expect(res.json).toHaveBeenCalledWith({ data: baseOrder });
    });

    test("returns 404 when product not found in restaurant", async () => {
      mockPrisma.product.findMany.mockResolvedValue([]);

      const req = makeReq();
      const res = mockRes();
      const next = vi.fn();

      await createOrder(req, res, next);

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({
        error: "One or more products not found",
      });
      expect(mockPrisma.$transaction).not.toHaveBeenCalled();
    });

    test("calculates total price correctly (base price × quantity)", async () => {
      mockPrisma.product.findMany.mockResolvedValue([
        { id: "prod-1", price: "8.00", isAvailable: true },
      ]);
      mockPrisma.optionChoice.findMany.mockResolvedValue([]);

      let capturedTotalPrice;
      mockPrisma.$transaction.mockImplementation(async (fn) => {
        const tx = {
          order: {
            create: vi.fn().mockImplementation((args) => {
              capturedTotalPrice = args.data.totalPrice;
              return { id: "order-1" };
            }),
            findUnique: vi.fn().mockResolvedValue(baseOrder),
          },
          orderProduct: { create: vi.fn().mockResolvedValue({ id: "op-1" }) },
          orderProductOption: { createMany: vi.fn() },
        };
        return fn(tx);
      });

      const req = makeReq({ items: [{ productId: "prod-1", quantity: 3, optionChoiceIds: [] }] });
      const res = mockRes();
      const next = vi.fn();

      await createOrder(req, res, next);

      expect(capturedTotalPrice).toBe(24); // 8.00 * 3
    });

    test("adds option choice price modifiers to total", async () => {
      mockPrisma.product.findMany.mockResolvedValue([
        { id: "prod-1", price: "10.00", isAvailable: true },
      ]);
      mockPrisma.optionChoice.findMany.mockResolvedValue([
        { id: "oc-1", priceModifier: "2.50" },
      ]);

      let capturedTotalPrice;
      mockPrisma.$transaction.mockImplementation(async (fn) => {
        const tx = {
          order: {
            create: vi.fn().mockImplementation((args) => {
              capturedTotalPrice = args.data.totalPrice;
              return { id: "order-1" };
            }),
            findUnique: vi.fn().mockResolvedValue(baseOrder),
          },
          orderProduct: { create: vi.fn().mockResolvedValue({ id: "op-1" }) },
          orderProductOption: { createMany: vi.fn() },
        };
        return fn(tx);
      });

      const req = makeReq({
        items: [{ productId: "prod-1", quantity: 2, optionChoiceIds: ["oc-1"] }],
      });
      const res = mockRes();
      const next = vi.fn();

      await createOrder(req, res, next);

      expect(capturedTotalPrice).toBe(25); // (10.00 + 2.50) * 2
    });

    test("creates orderProductOptions when optionChoiceIds provided", async () => {
      mockPrisma.product.findMany.mockResolvedValue([
        { id: "prod-1", price: "10.00", isAvailable: true },
      ]);
      mockPrisma.optionChoice.findMany.mockResolvedValue([
        { id: "oc-1", priceModifier: "0" },
      ]);

      let createManyArgs;
      mockPrisma.$transaction.mockImplementation(async (fn) => {
        const tx = {
          order: {
            create: vi.fn().mockResolvedValue({ id: "order-1" }),
            findUnique: vi.fn().mockResolvedValue(baseOrder),
          },
          orderProduct: { create: vi.fn().mockResolvedValue({ id: "op-1" }) },
          orderProductOption: {
            createMany: vi.fn().mockImplementation((args) => {
              createManyArgs = args;
            }),
          },
        };
        return fn(tx);
      });

      const req = makeReq({
        items: [{ productId: "prod-1", quantity: 1, optionChoiceIds: ["oc-1"] }],
      });
      const res = mockRes();
      const next = vi.fn();

      await createOrder(req, res, next);

      expect(createManyArgs).toEqual({
        data: [{ orderProductId: "op-1", optionChoiceId: "oc-1" }],
      });
    });

    test("calls next with error on failure", async () => {
      const err = new Error("DB error");
      mockPrisma.product.findMany.mockRejectedValue(err);

      const req = makeReq();
      const res = mockRes();
      const next = vi.fn();

      await createOrder(req, res, next);

      expect(next).toHaveBeenCalledWith(err);
    });
  });

  // ─── getOrders ────────────────────────────────────────────────
  describe("getOrders", () => {
    test("returns 200 with list of orders and pagination", async () => {
      const orders = [baseOrder, { ...baseOrder, id: "order-2" }];
      mockPrisma.order.findMany.mockResolvedValue(orders);
      mockPrisma.order.count.mockResolvedValue(2);

      const req = { params: { restaurantId: "rest-1" }, query: {} };
      const res = mockRes();
      const next = vi.fn();

      await getOrders(req, res, next);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({
        data: orders,
        pagination: { page: 1, limit: 20, total: 2, totalPages: 1 },
      });
    });

    test("returns 200 with empty array when no orders", async () => {
      mockPrisma.order.findMany.mockResolvedValue([]);
      mockPrisma.order.count.mockResolvedValue(0);

      const req = { params: { restaurantId: "rest-1" }, query: {} };
      const res = mockRes();
      const next = vi.fn();

      await getOrders(req, res, next);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({
        data: [],
        pagination: { page: 1, limit: 20, total: 0, totalPages: 0 },
      });
    });

    test("calls next with error on failure", async () => {
      const err = new Error("DB error");
      mockPrisma.order.findMany.mockRejectedValue(err);

      const req = { params: { restaurantId: "rest-1" }, query: {} };
      const res = mockRes();
      const next = vi.fn();

      await getOrders(req, res, next);

      expect(next).toHaveBeenCalledWith(err);
    });
  });

  // ─── getOrder ─────────────────────────────────────────────────
  describe("getOrder", () => {
    test("returns 200 with order data", async () => {
      mockPrisma.order.findUnique.mockResolvedValue(baseOrder);

      const req = { params: { restaurantId: "rest-1", orderId: "order-1" } };
      const res = mockRes();
      const next = vi.fn();

      await getOrder(req, res, next);

      expect(mockPrisma.order.findUnique).toHaveBeenCalledWith({
        where: { id: "order-1" },
        include: {
          orderProducts: {
            include: {
              product: true,
              orderProductOptions: { include: { optionChoice: true } },
            },
          },
        },
      });
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({ data: baseOrder });
    });

    test("returns 404 when order not found", async () => {
      mockPrisma.order.findUnique.mockResolvedValue(null);

      const req = { params: { restaurantId: "rest-1", orderId: "order-999" } };
      const res = mockRes();
      const next = vi.fn();

      await getOrder(req, res, next);

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({ error: "Order not found" });
    });

    test("calls next with error on failure", async () => {
      const err = new Error("DB error");
      mockPrisma.order.findUnique.mockRejectedValue(err);

      const req = { params: { restaurantId: "rest-1", orderId: "order-1" } };
      const res = mockRes();
      const next = vi.fn();

      await getOrder(req, res, next);

      expect(next).toHaveBeenCalledWith(err);
    });
  });

  // ─── updateOrderStatus ────────────────────────────────────────
  describe("updateOrderStatus", () => {
    test("returns 200 with updated order (atomic updateMany)", async () => {
      const updated = { ...baseOrder, status: "IN_PROGRESS" };
      mockPrisma.order.updateMany = vi.fn().mockResolvedValue({ count: 1 });
      // findUnique called twice: initial lookup + fetch after update
      mockPrisma.order.findUnique
        .mockResolvedValueOnce({ ...baseOrder, status: "PENDING", email: "a@b.com", restaurantId: "rest-1", fullName: "J", orderNumber: "X1" })
        .mockResolvedValueOnce(updated);

      const req = {
        params: { restaurantId: "rest-1", orderId: "order-1" },
        body: { status: "IN_PROGRESS" },
      };
      const res = mockRes();
      const next = vi.fn();

      await updateOrderStatus(req, res, next);

      expect(mockPrisma.order.updateMany).toHaveBeenCalledWith({
        where: { id: "order-1", status: "PENDING" },
        data: { status: "IN_PROGRESS" },
      });
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ data: updated }),
      );
    });

    test("returns 409 when concurrent update races (updateMany returns count 0)", async () => {
      mockPrisma.order.updateMany = vi.fn().mockResolvedValue({ count: 0 });
      mockPrisma.order.findUnique
        .mockResolvedValueOnce({ ...baseOrder, status: "PENDING", email: "a@b.com", restaurantId: "rest-1", fullName: "J", orderNumber: "X1" })
        .mockResolvedValueOnce({ ...baseOrder, status: "IN_PROGRESS" });

      const req = {
        params: { restaurantId: "rest-1", orderId: "order-1" },
        body: { status: "IN_PROGRESS" },
      };
      const res = mockRes();
      const next = vi.fn();

      await updateOrderStatus(req, res, next);

      expect(res.status).toHaveBeenCalledWith(409);
    });

    test("calls next with error on failure", async () => {
      const err = new Error("DB error");
      mockPrisma.order.updateMany = vi.fn().mockRejectedValue(err);
      mockPrisma.order.findUnique.mockResolvedValue({
        ...baseOrder,
        status: "PENDING",
        email: "a@b.com",
        restaurantId: "rest-1",
        fullName: "J",
        orderNumber: "X1",
      });

      const req = {
        params: { restaurantId: "rest-1", orderId: "order-1" },
        body: { status: "CANCELLED" },
      };
      const res = mockRes();
      const next = vi.fn();

      await updateOrderStatus(req, res, next);

      expect(next).toHaveBeenCalledWith(err);
    });
  });
});
