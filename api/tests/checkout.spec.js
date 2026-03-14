const { createCheckoutSession, refundOrder, handleConnectWebhook } = require("../controllers/checkout.controllers");

// ─── Helpers ─────────────────────────────────────────────────────────────────

function makeRes() {
  const res = {};
  res.status = vi.fn().mockReturnValue(res);
  res.json = vi.fn().mockReturnValue(res);
  return res;
}

function makeReq(overrides = {}) {
  return {
    body: {},
    headers: {},
    params: {},
    ...overrides,
  };
}

// ─── Setup ───────────────────────────────────────────────────────────────────

let mockPrisma;
let mockStripe;

beforeEach(() => {
  mockPrisma = globalThis.__mockPrisma;
  mockStripe = globalThis.__mockStripe;

  // Reset all mocks between tests
  vi.clearAllMocks();
});

// ─── createCheckoutSession ────────────────────────────────────────────────────

describe("createCheckoutSession", () => {
  const baseBody = {
    restaurantId: "rest-1",
    fullName: "Jane Doe",
    phone: "0600000000",
    email: "jane@example.com",
    items: [{ productId: "prod-1", quantity: 2, optionChoiceIds: [] }],
  };

  it("returns 404 when restaurant not found", async () => {
    mockPrisma.restaurant = { findUnique: vi.fn().mockResolvedValue(null) };

    const req = makeReq({ body: baseBody });
    const res = makeRes();
    const next = vi.fn();

    await createCheckoutSession(req, res, next);

    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.json).toHaveBeenCalledWith({ error: "Restaurant not found" });
  });

  it("returns 400 when restaurant is closed", async () => {
    mockPrisma.restaurant = {
      findUnique: vi.fn().mockResolvedValue({ id: "rest-1", stripeAccountId: "acct_123" }),
    };
    // Opening hours that never match current time
    mockPrisma.openingHour = {
      findMany: vi.fn().mockResolvedValue([
        { dayOfWeek: -1, openTime: "00:00", closeTime: "00:01" },
      ]),
    };

    const req = makeReq({ body: baseBody });
    const res = makeRes();
    const next = vi.fn();

    await createCheckoutSession(req, res, next);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({ error: "Restaurant is currently closed" });
  });

  it("calls stripe.checkout.sessions.create with stripeAccount option and no transfer_data", async () => {
    mockPrisma.restaurant = {
      findUnique: vi.fn().mockResolvedValue({ id: "rest-1", stripeAccountId: "acct_test_123" }),
    };
    mockPrisma.openingHour = { findMany: vi.fn().mockResolvedValue([]) }; // always open
    mockPrisma.product = {
      findMany: vi.fn().mockResolvedValue([
        { id: "prod-1", restaurantId: "rest-1", name: "Burger", price: "10.00", imageUrl: null },
      ]),
    };
    mockPrisma.optionChoice = { findMany: vi.fn().mockResolvedValue([]) };

    mockStripe.checkout.sessions.create.mockResolvedValue({
      id: "cs_test_abc",
      url: "https://checkout.stripe.com/test",
    });

    const req = makeReq({ body: baseBody });
    const res = makeRes();
    const next = vi.fn();

    await createCheckoutSession(req, res, next);

    expect(mockStripe.checkout.sessions.create).toHaveBeenCalledTimes(1);

    const [sessionParams, stripeOptions] = mockStripe.checkout.sessions.create.mock.calls[0];

    // Direct charge: stripeAccount option must be set
    expect(stripeOptions).toEqual({ stripeAccount: "acct_test_123" });

    // No transfer_data
    expect(sessionParams.payment_intent_data).not.toHaveProperty("transfer_data");

    // application_fee_amount is present
    expect(sessionParams.payment_intent_data).toHaveProperty("application_fee_amount");

    expect(res.status).toHaveBeenCalledWith(201);
    expect(res.json).toHaveBeenCalledWith({
      data: { sessionId: "cs_test_abc", url: "https://checkout.stripe.com/test" },
    });
  });

  it("falls back to on-site payment when restaurant has no stripeAccountId", async () => {
    mockPrisma.restaurant = {
      findUnique: vi.fn().mockResolvedValue({ id: "rest-1", stripeAccountId: null }),
    };
    mockPrisma.openingHour = { findMany: vi.fn().mockResolvedValue([]) };
    mockPrisma.product = {
      findMany: vi.fn().mockResolvedValue([
        { id: "prod-1", restaurantId: "rest-1", name: "Burger", price: "10.00", imageUrl: null },
      ]),
    };
    mockPrisma.optionChoice = { findMany: vi.fn().mockResolvedValue([]) };

    const fakeOrder = { id: "order-1", orderNumber: "ABC123" };
    mockPrisma.$transaction = vi.fn().mockResolvedValue(fakeOrder);

    const req = makeReq({ body: baseBody });
    const res = makeRes();
    const next = vi.fn();

    await createCheckoutSession(req, res, next);

    expect(mockStripe.checkout.sessions.create).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(201);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ paymentMethod: "on_site" }) }),
    );
  });
});

// ─── refundOrder ─────────────────────────────────────────────────────────────

describe("refundOrder", () => {
  it("returns 404 when order not found", async () => {
    mockPrisma.order = { findUnique: vi.fn().mockResolvedValue(null) };

    const req = makeReq({ params: { restaurantId: "rest-1", orderId: "ord-1" } });
    const res = makeRes();
    const next = vi.fn();

    await refundOrder(req, res, next);

    expect(res.status).toHaveBeenCalledWith(404);
  });

  it("returns 400 when order has no stripePaymentIntentId", async () => {
    mockPrisma.order = {
      findUnique: vi.fn().mockResolvedValue({
        id: "ord-1",
        restaurantId: "rest-1",
        stripePaymentIntentId: null,
        status: "PENDING",
      }),
    };

    const req = makeReq({ params: { restaurantId: "rest-1", orderId: "ord-1" } });
    const res = makeRes();
    const next = vi.fn();

    await refundOrder(req, res, next);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({ error: "No Stripe payment associated with this order" });
  });

  it("returns 409 when order is already cancelled", async () => {
    mockPrisma.order = {
      findUnique: vi.fn().mockResolvedValue({
        id: "ord-1",
        restaurantId: "rest-1",
        stripePaymentIntentId: "pi_test",
        status: "CANCELLED",
      }),
    };

    const req = makeReq({ params: { restaurantId: "rest-1", orderId: "ord-1" } });
    const res = makeRes();
    const next = vi.fn();

    await refundOrder(req, res, next);

    expect(res.status).toHaveBeenCalledWith(409);
  });

  it("calls stripe.refunds.create with stripeAccount option and no reverse_transfer", async () => {
    mockPrisma.order = {
      findUnique: vi.fn()
        .mockResolvedValueOnce({
          id: "ord-1",
          restaurantId: "rest-1",
          stripePaymentIntentId: "pi_test_xyz",
          status: "PENDING",
        })
        .mockResolvedValueOnce(null), // second call for restaurant lookup (won't be called)
    };
    mockPrisma.restaurant = {
      findUnique: vi.fn().mockResolvedValue({ id: "rest-1", stripeAccountId: "acct_test_123" }),
    };
    mockPrisma.order.update = vi.fn().mockResolvedValue({ id: "ord-1", status: "CANCELLED" });

    mockStripe.refunds.create.mockResolvedValue({ id: "re_test", status: "succeeded" });

    const req = makeReq({ params: { restaurantId: "rest-1", orderId: "ord-1" } });
    const res = makeRes();
    const next = vi.fn();

    await refundOrder(req, res, next);

    expect(mockStripe.refunds.create).toHaveBeenCalledTimes(1);

    const [refundParams, stripeOptions] = mockStripe.refunds.create.mock.calls[0];

    // Direct charge refund: stripeAccount option must be set
    expect(stripeOptions).toEqual({ stripeAccount: "acct_test_123" });

    // No reverse_transfer (destination-charge-specific flag)
    expect(refundParams).not.toHaveProperty("reverse_transfer");
    expect(refundParams.payment_intent).toBe("pi_test_xyz");

    expect(res.status).toHaveBeenCalledWith(200);
  });
});

// ─── handleConnectWebhook ─────────────────────────────────────────────────────

describe("handleConnectWebhook", () => {
  it("returns 400 when signature verification fails", async () => {
    mockStripe.webhooks.constructEvent.mockImplementation(() => {
      throw new Error("Invalid signature");
    });

    const req = makeReq({
      body: Buffer.from("{}"),
      headers: { "stripe-signature": "bad-sig" },
    });
    const res = makeRes();

    await handleConnectWebhook(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ error: expect.stringContaining("Invalid signature") }),
    );
  });

  it("creates an order on checkout.session.completed", async () => {
    const fakeSession = {
      id: "cs_test_connect",
      payment_intent: "pi_connect_123",
      amount_total: 2500,
      metadata: {
        restaurantId: "rest-1",
        fullName: "John Smith",
        phone: "0700000000",
        email: "john@example.com",
        items: JSON.stringify([{ productId: "prod-1", quantity: 1, optionChoiceIds: [] }]),
        scheduledFor: "",
      },
    };

    mockStripe.webhooks.constructEvent.mockReturnValue({
      type: "checkout.session.completed",
      data: { object: fakeSession },
    });

    const fakeOrder = {
      id: "order-connect-1",
      orderNumber: "XYZ789",
      email: "john@example.com",
    };
    mockPrisma.$transaction = vi.fn().mockResolvedValue(fakeOrder);

    const req = makeReq({
      body: Buffer.from(JSON.stringify(fakeSession)),
      headers: { "stripe-signature": "valid-sig" },
    });
    const res = makeRes();

    await handleConnectWebhook(req, res);

    expect(mockPrisma.$transaction).toHaveBeenCalledTimes(1);
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({ received: true });
  });

  it("returns 200 for unhandled event types", async () => {
    mockStripe.webhooks.constructEvent.mockReturnValue({
      type: "account.updated",
      data: { object: {} },
    });

    const req = makeReq({
      body: Buffer.from("{}"),
      headers: { "stripe-signature": "valid-sig" },
    });
    const res = makeRes();

    await handleConnectWebhook(req, res);

    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({ received: true });
  });

  it("returns 500 and does not swallow the log when order creation fails", async () => {
    const fakeSession = {
      id: "cs_test_fail",
      payment_intent: "pi_fail",
      amount_total: 1000,
      metadata: {
        restaurantId: "rest-1",
        fullName: "",
        phone: "",
        email: "",
        items: "[]",
        scheduledFor: "",
      },
    };

    mockStripe.webhooks.constructEvent.mockReturnValue({
      type: "checkout.session.completed",
      data: { object: fakeSession },
    });

    mockPrisma.$transaction = vi.fn().mockRejectedValue(new Error("DB exploded"));

    const req = makeReq({
      body: Buffer.from("{}"),
      headers: { "stripe-signature": "valid-sig" },
    });
    const res = makeRes();

    await handleConnectWebhook(req, res);

    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith({ error: "Failed to create order" });
  });
});
