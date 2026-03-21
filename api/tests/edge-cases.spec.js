/**
 * Edge case tests — Section 1 of the production hardening spec.
 * Covers: webhook idempotence, unavailable products, restaurant closed scenarios,
 * promo code edge cases, and invalid status transitions.
 */

const { handleWebhook, createCheckoutSession } = require("../controllers/checkout.controllers");
const { createOrder, updateOrderStatus } = require("../controllers/order.controllers");

// ─── Helpers ─────────────────────────────────────────────────────────────────

function makeRes() {
  const res = {};
  res.status = vi.fn().mockReturnValue(res);
  res.json = vi.fn().mockReturnValue(res);
  return res;
}

function makeReq(overrides = {}) {
  return { body: {}, headers: {}, params: {}, ...overrides };
}

let mockPrisma;
let mockStripe;

beforeEach(() => {
  mockPrisma = globalThis.__mockPrisma;
  mockStripe = globalThis.__mockStripe;
  vi.clearAllMocks();
});

// ─── 1.1 Webhook idempotence ──────────────────────────────────────────────────

describe("1.1 Stripe webhook idempotence", () => {
  const fakeSession = {
    id: "cs_idempotent",
    payment_intent: "pi_idempotent",
    metadata: { orderId: "order-1" },
  };

  beforeEach(() => {
    mockStripe.webhooks.constructEvent.mockReturnValue({
      type: "checkout.session.completed",
      data: { object: fakeSession },
    });
  });

  it("processes a DRAFT order and transitions to PENDING", async () => {
    let updateCalled = false;
    mockPrisma.$transaction = vi.fn().mockImplementation(async (fn) => {
      const tx = {
        order: {
          findUnique: vi.fn().mockResolvedValue({ id: "order-1", status: "DRAFT" }),
          update: vi.fn().mockImplementation(() => {
            updateCalled = true;
            return { id: "order-1", status: "PENDING", restaurantId: "rest-1", email: "a@b.com", orderNumber: "ABC123" };
          }),
        },
      };
      return fn(tx);
    });

    const req = makeReq({ body: Buffer.from("{}"), headers: { "stripe-signature": "sig" } });
    const res = makeRes();
    await handleWebhook(req, res);

    expect(res.status).toHaveBeenCalledWith(200);
    expect(updateCalled).toBe(true);
  });

  it("skips processing when order is already PENDING (replayed webhook)", async () => {
    let updateCalled = false;
    mockPrisma.$transaction = vi.fn().mockImplementation(async (fn) => {
      const tx = {
        order: {
          findUnique: vi.fn().mockResolvedValue({ id: "order-1", status: "PENDING" }),
          update: vi.fn().mockImplementation(() => {
            updateCalled = true;
            return {};
          }),
        },
      };
      return fn(tx);
    });

    const req = makeReq({ body: Buffer.from("{}"), headers: { "stripe-signature": "sig" } });
    const res = makeRes();
    await handleWebhook(req, res);

    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({ received: true });
    expect(updateCalled).toBe(false);
  });

  it("skips processing when order is IN_PROGRESS (replayed webhook must not regress)", async () => {
    let updateCalled = false;
    mockPrisma.$transaction = vi.fn().mockImplementation(async (fn) => {
      const tx = {
        order: {
          findUnique: vi.fn().mockResolvedValue({ id: "order-1", status: "IN_PROGRESS" }),
          update: vi.fn().mockImplementation(() => {
            updateCalled = true;
            return {};
          }),
        },
      };
      return fn(tx);
    });

    const req = makeReq({ body: Buffer.from("{}"), headers: { "stripe-signature": "sig" } });
    const res = makeRes();
    await handleWebhook(req, res);

    expect(res.status).toHaveBeenCalledWith(200);
    expect(updateCalled).toBe(false);
  });

  it("skips processing when order is COMPLETED (replayed webhook must not regress)", async () => {
    let updateCalled = false;
    mockPrisma.$transaction = vi.fn().mockImplementation(async (fn) => {
      const tx = {
        order: {
          findUnique: vi.fn().mockResolvedValue({ id: "order-1", status: "COMPLETED" }),
          update: vi.fn().mockImplementation(() => {
            updateCalled = true;
            return {};
          }),
        },
      };
      return fn(tx);
    });

    const req = makeReq({ body: Buffer.from("{}"), headers: { "stripe-signature": "sig" } });
    const res = makeRes();
    await handleWebhook(req, res);

    expect(res.status).toHaveBeenCalledWith(200);
    expect(updateCalled).toBe(false);
  });

  it("returns 200 without processing when orderId is missing from metadata", async () => {
    mockStripe.webhooks.constructEvent.mockReturnValue({
      type: "checkout.session.completed",
      data: { object: { id: "cs_no_meta", payment_intent: "pi_1", metadata: {} } },
    });
    mockPrisma.$transaction = vi.fn();

    const req = makeReq({ body: Buffer.from("{}"), headers: { "stripe-signature": "sig" } });
    const res = makeRes();
    await handleWebhook(req, res);

    expect(res.status).toHaveBeenCalledWith(200);
    expect(mockPrisma.$transaction).not.toHaveBeenCalled();
  });
});

// ─── 1.2 Unavailable product at checkout ─────────────────────────────────────

describe("1.2 Unavailable product at checkout", () => {
  const baseBody = {
    restaurantId: "rest-1",
    fullName: "Jane",
    email: "jane@example.com",
    items: [{ productId: "prod-1", quantity: 1, optionChoiceIds: [] }],
  };

  it("returns 400 with unavailable product name when product is not available", async () => {
    mockPrisma.restaurant = {
      findUnique: vi.fn().mockResolvedValue({ id: "rest-1", stripeAccountId: "acct_123", slug: "resto" }),
    };
    mockPrisma.openingHour = { findMany: vi.fn().mockResolvedValue([]) }; // always open
    mockPrisma.product = {
      findMany: vi.fn().mockResolvedValue([
        { id: "prod-1", restaurantId: "rest-1", name: "Burger Indisponible", price: "10.00", isAvailable: false },
      ]),
    };
    mockPrisma.optionChoice = { findMany: vi.fn().mockResolvedValue([]) };

    const req = makeReq({ body: baseBody });
    const res = makeRes();
    const next = vi.fn();

    await createCheckoutSession(req, res, next);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ error: expect.stringContaining("Burger Indisponible") }),
    );
  });

  it("returns 400 listing all unavailable products when multiple are unavailable", async () => {
    mockPrisma.restaurant = {
      findUnique: vi.fn().mockResolvedValue({ id: "rest-1", stripeAccountId: "acct_123", slug: "resto" }),
    };
    mockPrisma.openingHour = { findMany: vi.fn().mockResolvedValue([]) };
    mockPrisma.product = {
      findMany: vi.fn().mockResolvedValue([
        { id: "prod-1", restaurantId: "rest-1", name: "Burger", price: "10.00", isAvailable: false },
        { id: "prod-2", restaurantId: "rest-1", name: "Frites", price: "3.00", isAvailable: false },
      ]),
    };
    mockPrisma.optionChoice = { findMany: vi.fn().mockResolvedValue([]) };

    const req = makeReq({ body: { ...baseBody, items: [
      { productId: "prod-1", quantity: 1, optionChoiceIds: [] },
      { productId: "prod-2", quantity: 1, optionChoiceIds: [] },
    ] } });
    const res = makeRes();
    const next = vi.fn();

    await createCheckoutSession(req, res, next);

    expect(res.status).toHaveBeenCalledWith(400);
    const errorMsg = res.json.mock.calls[0][0].error;
    expect(errorMsg).toContain("Burger");
    expect(errorMsg).toContain("Frites");
  });
});

// ─── 1.3 Restaurant closed scenarios ─────────────────────────────────────────

describe("1.3 Restaurant closed scenarios", () => {
  const openRestaurant = { id: "rest-1", stripeAccountId: "acct_123", slug: "resto" };
  const baseBody = {
    restaurantId: "rest-1",
    fullName: "Jane",
    email: "jane@example.com",
    items: [{ productId: "prod-1", quantity: 1, optionChoiceIds: [] }],
  };

  it("refuses order when restaurant is outside regular opening hours", async () => {
    mockPrisma.restaurant = { findUnique: vi.fn().mockResolvedValue(openRestaurant) };
    // Opening hours for a day that never matches (dayOfWeek: -1)
    mockPrisma.openingHour = {
      findMany: vi.fn().mockResolvedValue([{ dayOfWeek: -1, openTime: "00:00", closeTime: "00:01" }]),
    };
    mockPrisma.exceptionalHour = { findUnique: vi.fn().mockResolvedValue(null) };

    const req = makeReq({ body: baseBody });
    const res = makeRes();
    const next = vi.fn();
    await createCheckoutSession(req, res, next);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({ error: "Restaurant is currently closed" });
  });

  it("refuses order when restaurant has an exceptional closure today", async () => {
    mockPrisma.restaurant = { findUnique: vi.fn().mockResolvedValue(openRestaurant) };
    // Regular hours show open all week, but exceptional closure overrides
    mockPrisma.openingHour = {
      findMany: vi.fn().mockResolvedValue([
        { dayOfWeek: 0, openTime: "08:00", closeTime: "23:59" },
        { dayOfWeek: 1, openTime: "08:00", closeTime: "23:59" },
        { dayOfWeek: 2, openTime: "08:00", closeTime: "23:59" },
        { dayOfWeek: 3, openTime: "08:00", closeTime: "23:59" },
        { dayOfWeek: 4, openTime: "08:00", closeTime: "23:59" },
        { dayOfWeek: 5, openTime: "08:00", closeTime: "23:59" },
        { dayOfWeek: 6, openTime: "08:00", closeTime: "23:59" },
      ]),
    };
    mockPrisma.exceptionalHour = {
      findUnique: vi.fn().mockResolvedValue({ isClosed: true, openTime: null, closeTime: null }),
    };

    const req = makeReq({ body: baseBody });
    const res = makeRes();
    const next = vi.fn();
    await createCheckoutSession(req, res, next);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({ error: "Restaurant is currently closed" });
  });

  it("accepts order when no opening hours are configured (always open)", async () => {
    mockPrisma.restaurant = { findUnique: vi.fn().mockResolvedValue(openRestaurant) };
    mockPrisma.openingHour = { findMany: vi.fn().mockResolvedValue([]) }; // no hours → always open
    mockPrisma.product = {
      findMany: vi.fn().mockResolvedValue([
        { id: "prod-1", restaurantId: "rest-1", name: "Burger", price: "10.00", isAvailable: true, imageUrl: null },
      ]),
    };
    mockPrisma.optionChoice = { findMany: vi.fn().mockResolvedValue([]) };

    mockStripe.checkout.sessions.create.mockResolvedValue({ id: "cs_123", url: "https://stripe.com/pay" });
    mockPrisma.order = {
      create: vi.fn().mockResolvedValue({ id: "order-1" }),
      update: vi.fn().mockResolvedValue({ id: "order-1" }),
    };
    mockPrisma.$transaction = vi.fn().mockImplementation(async (fn) => {
      const tx = {
        order: { create: vi.fn().mockResolvedValue({ id: "order-1" }) },
        orderProduct: { create: vi.fn().mockResolvedValue({ id: "op-1" }) },
        orderProductOption: { createMany: vi.fn() },
      };
      return fn(tx);
    });

    const req = makeReq({ body: baseBody });
    const res = makeRes();
    const next = vi.fn();
    await createCheckoutSession(req, res, next);

    expect(res.status).toHaveBeenCalledWith(201);
  });
});

// ─── 1.4 Promo code edge cases ────────────────────────────────────────────────

describe("1.4 Promo code edge cases (createOrder)", () => {
  const makeOrderReq = (promoCode) => ({
    params: { restaurantId: "rest-1" },
    body: {
      fullName: "Jean",
      items: [{ productId: "prod-1", quantity: 1, optionChoiceIds: [] }],
      promoCode,
    },
  });

  beforeEach(() => {
    mockPrisma.openingHour = { findMany: vi.fn().mockResolvedValue([]) }; // always open
    mockPrisma.product = {
      findMany: vi.fn().mockResolvedValue([
        { id: "prod-1", restaurantId: "rest-1", price: "20.00", isAvailable: true },
      ]),
    };
    mockPrisma.optionChoice = { findMany: vi.fn().mockResolvedValue([]) };
  });

  it("refuses expired promo code", async () => {
    mockPrisma.promoCode = {
      findUnique: vi.fn().mockResolvedValue({
        id: "pc-1",
        isActive: true,
        expiresAt: new Date(Date.now() - 86400000), // yesterday
        maxUses: null,
        usedCount: 0,
        minOrderAmount: null,
      }),
    };

    const res = makeRes();
    const next = vi.fn();
    await createOrder(makeOrderReq("EXPIRED"), res, next);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({ error: "Promo code has expired" });
  });

  it("refuses promo code when usage limit is reached", async () => {
    mockPrisma.promoCode = {
      findUnique: vi.fn().mockResolvedValue({
        id: "pc-2",
        isActive: true,
        expiresAt: null,
        maxUses: 10,
        usedCount: 10,
        minOrderAmount: null,
      }),
    };

    const res = makeRes();
    const next = vi.fn();
    await createOrder(makeOrderReq("MAXED"), res, next);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({ error: "Promo code usage limit reached" });
  });

  it("refuses promo code when minimum order amount is not reached", async () => {
    mockPrisma.promoCode = {
      findUnique: vi.fn().mockResolvedValue({
        id: "pc-3",
        isActive: true,
        expiresAt: null,
        maxUses: null,
        usedCount: 0,
        minOrderAmount: "50.00", // 50€ minimum, order is 20€
      }),
    };

    const res = makeRes();
    const next = vi.fn();
    await createOrder(makeOrderReq("MINAMT"), res, next);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ error: expect.stringContaining("50.00") }),
    );
  });

  it("applies percentage discount correctly", async () => {
    mockPrisma.promoCode = {
      findUnique: vi.fn().mockResolvedValue({
        id: "pc-4",
        isActive: true,
        expiresAt: null,
        maxUses: null,
        usedCount: 0,
        minOrderAmount: null,
        discountType: "PERCENTAGE",
        discountValue: "10", // 10% off
      }),
    };

    let capturedTotal;
    mockPrisma.$transaction = vi.fn().mockImplementation(async (fn) => {
      const tx = {
        order: {
          create: vi.fn().mockImplementation(({ data }) => {
            capturedTotal = data.totalPrice;
            return { id: "order-1" };
          }),
          findUnique: vi.fn().mockResolvedValue({ id: "order-1", orderProducts: [] }),
        },
        promoCode: { update: vi.fn() },
        orderProduct: { create: vi.fn().mockResolvedValue({ id: "op-1" }) },
        orderProductOption: { createMany: vi.fn() },
      };
      return fn(tx);
    });

    const res = makeRes();
    const next = vi.fn();
    await createOrder(makeOrderReq("PCT10"), res, next);

    expect(capturedTotal).toBe(18); // 20 * 0.90
  });

  it("applies fixed discount correctly and floors at 0", async () => {
    mockPrisma.promoCode = {
      findUnique: vi.fn().mockResolvedValue({
        id: "pc-5",
        isActive: true,
        expiresAt: null,
        maxUses: null,
        usedCount: 0,
        minOrderAmount: null,
        discountType: "FIXED",
        discountValue: "5", // 5€ off
      }),
    };

    let capturedTotal;
    mockPrisma.$transaction = vi.fn().mockImplementation(async (fn) => {
      const tx = {
        order: {
          create: vi.fn().mockImplementation(({ data }) => {
            capturedTotal = data.totalPrice;
            return { id: "order-1" };
          }),
          findUnique: vi.fn().mockResolvedValue({ id: "order-1", orderProducts: [] }),
        },
        promoCode: { update: vi.fn() },
        orderProduct: { create: vi.fn().mockResolvedValue({ id: "op-1" }) },
        orderProductOption: { createMany: vi.fn() },
      };
      return fn(tx);
    });

    const res = makeRes();
    const next = vi.fn();
    await createOrder(makeOrderReq("FIXED5"), res, next);

    expect(capturedTotal).toBe(15); // 20 - 5
  });
});

// ─── 1.5 Invalid status transitions ──────────────────────────────────────────

describe("1.5 Invalid status transitions", () => {
  const makeStatusReq = (orderId, status) => ({
    params: { restaurantId: "rest-1", orderId },
    body: { status },
  });

  beforeEach(() => {
    mockPrisma.order = {
      findUnique: vi.fn(),
      update: vi.fn(),
      updateMany: vi.fn(),
    };
  });

  it("refuses DELIVERED → IN_PROGRESS transition", async () => {
    mockPrisma.order.findUnique.mockResolvedValue({
      id: "order-1",
      status: "DELIVERED",
      email: "a@b.com",
      restaurantId: "rest-1",
      fullName: "Jean",
      orderNumber: "X1",
    });

    const res = makeRes();
    const next = vi.fn();
    await updateOrderStatus(makeStatusReq("order-1", "IN_PROGRESS"), res, next);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ error: expect.stringContaining("DELIVERED") }),
    );
  });

  it("refuses CANCELLED → PENDING transition", async () => {
    mockPrisma.order.findUnique.mockResolvedValue({
      id: "order-1",
      status: "CANCELLED",
      email: "a@b.com",
      restaurantId: "rest-1",
      fullName: "Jean",
      orderNumber: "X1",
    });

    const res = makeRes();
    const next = vi.fn();
    await updateOrderStatus(makeStatusReq("order-1", "PENDING"), res, next);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ error: expect.stringContaining("CANCELLED") }),
    );
  });

  it("refuses PENDING → DELIVERED transition (must pass through IN_PROGRESS and COMPLETED)", async () => {
    mockPrisma.order.findUnique.mockResolvedValue({
      id: "order-1",
      status: "PENDING",
      email: "a@b.com",
      restaurantId: "rest-1",
      fullName: "Jean",
      orderNumber: "X1",
    });

    const res = makeRes();
    const next = vi.fn();
    await updateOrderStatus(makeStatusReq("order-1", "DELIVERED"), res, next);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        error: expect.stringContaining("PENDING"),
        allowedTransitions: expect.arrayContaining(["IN_PROGRESS"]),
      }),
    );
  });

  it("returns 409 when status was modified concurrently (atomic guard returns count 0)", async () => {
    mockPrisma.order.findUnique
      .mockResolvedValueOnce({
        id: "order-1",
        status: "PENDING",
        email: "a@b.com",
        restaurantId: "rest-1",
        fullName: "Jean",
        orderNumber: "X1",
      })
      .mockResolvedValueOnce({ id: "order-1", status: "IN_PROGRESS" }); // status changed meanwhile

    // updateMany returns 0 rows (race condition)
    mockPrisma.order.updateMany = vi.fn().mockResolvedValue({ count: 0 });

    const res = makeRes();
    const next = vi.fn();
    await updateOrderStatus(makeStatusReq("order-1", "IN_PROGRESS"), res, next);

    expect(res.status).toHaveBeenCalledWith(409);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ error: expect.stringContaining("concurrently") }),
    );
  });

  it("includes allowedTransitions in the response body on invalid transition", async () => {
    mockPrisma.order.findUnique.mockResolvedValue({
      id: "order-1",
      status: "IN_PROGRESS",
      email: "a@b.com",
      restaurantId: "rest-1",
      fullName: "Jean",
      orderNumber: "X1",
    });

    const res = makeRes();
    const next = vi.fn();
    await updateOrderStatus(makeStatusReq("order-1", "PENDING"), res, next);

    expect(res.status).toHaveBeenCalledWith(400);
    const body = res.json.mock.calls[0][0];
    expect(body.allowedTransitions).toEqual(expect.arrayContaining(["COMPLETED", "CANCELLED"]));
  });
});
