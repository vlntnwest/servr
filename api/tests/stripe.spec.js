const { initiateStripeOnboarding, getStripeStatus } = require("../controllers/stripe.controllers");

// Helper: build a minimal Express-style req/res/next
function mockReqRes(restaurantId = "rest-1") {
  const req = { params: { restaurantId } };
  const res = {
    status: vi.fn().mockReturnThis(),
    json: vi.fn().mockReturnThis(),
  };
  const next = vi.fn();
  return { req, res, next };
}

describe("initiateStripeOnboarding", () => {
  let mockPrisma;
  let mockStripe;

  beforeEach(() => {
    mockPrisma = globalThis.__mockPrisma;
    mockStripe = globalThis.__mockStripe;
    // Reset all mocks
    mockPrisma.restaurant = {
      findUnique: vi.fn(),
      update: vi.fn(),
    };
    mockStripe.accounts.create.mockReset();
    mockStripe.accounts.retrieve.mockReset();
    mockStripe.accountLinks.create.mockReset();
    // Ensure STRIPE_SECRET_KEY is set so the stripe instance is created
    process.env.STRIPE_SECRET_KEY = "sk_test_fake";
    process.env.CLIENT_URL = "http://localhost:3000";
  });

  it("returns 404 when restaurant does not exist", async () => {
    const { req, res, next } = mockReqRes();
    mockPrisma.restaurant.findUnique.mockResolvedValueOnce(null);

    await initiateStripeOnboarding(req, res, next);

    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.json).toHaveBeenCalledWith({ error: "Restaurant not found" });
  });

  it("returns 409 when restaurant already has charges_enabled", async () => {
    const { req, res, next } = mockReqRes();
    mockPrisma.restaurant.findUnique.mockResolvedValueOnce({
      id: "rest-1",
      email: "owner@example.com",
      stripeAccountId: "acct_existing",
    });
    mockStripe.accounts.retrieve.mockResolvedValueOnce({ charges_enabled: true });

    await initiateStripeOnboarding(req, res, next);

    expect(res.status).toHaveBeenCalledWith(409);
    expect(res.json).toHaveBeenCalledWith({
      error: "Stripe account already active with charges enabled",
    });
  });

  it("creates a new Stripe account and returns onboarding URL when no account exists", async () => {
    const { req, res, next } = mockReqRes();
    mockPrisma.restaurant.findUnique.mockResolvedValueOnce({
      id: "rest-1",
      email: "owner@example.com",
      stripeAccountId: null,
    });
    mockStripe.accounts.create.mockResolvedValueOnce({ id: "acct_new" });
    mockPrisma.restaurant.update = vi.fn().mockResolvedValueOnce({});
    mockStripe.accountLinks.create.mockResolvedValueOnce({
      url: "https://connect.stripe.com/setup/e/acct_new/abc",
    });

    await initiateStripeOnboarding(req, res, next);

    expect(mockStripe.accounts.create).toHaveBeenCalledWith({
      type: "express",
      email: "owner@example.com",
    });
    expect(mockPrisma.restaurant.update).toHaveBeenCalledWith({
      where: { id: "rest-1" },
      data: { stripeAccountId: "acct_new" },
    });
    expect(mockStripe.accountLinks.create).toHaveBeenCalledWith(
      expect.objectContaining({
        account: "acct_new",
        type: "account_onboarding",
      }),
    );
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({
      data: { url: "https://connect.stripe.com/setup/e/acct_new/abc" },
    });
  });

  it("reuses existing stripeAccountId and returns a new account link", async () => {
    const { req, res, next } = mockReqRes();
    mockPrisma.restaurant.findUnique.mockResolvedValueOnce({
      id: "rest-1",
      email: "owner@example.com",
      stripeAccountId: "acct_existing",
    });
    mockStripe.accounts.retrieve.mockResolvedValueOnce({ charges_enabled: false });
    mockStripe.accountLinks.create.mockResolvedValueOnce({
      url: "https://connect.stripe.com/setup/e/acct_existing/xyz",
    });

    await initiateStripeOnboarding(req, res, next);

    expect(mockStripe.accounts.create).not.toHaveBeenCalled();
    expect(mockStripe.accountLinks.create).toHaveBeenCalledWith(
      expect.objectContaining({ account: "acct_existing" }),
    );
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({
      data: { url: "https://connect.stripe.com/setup/e/acct_existing/xyz" },
    });
  });

  it("calls next(error) on unexpected errors", async () => {
    const { req, res, next } = mockReqRes();
    const boom = new Error("DB exploded");
    mockPrisma.restaurant.findUnique.mockRejectedValueOnce(boom);

    await initiateStripeOnboarding(req, res, next);

    expect(next).toHaveBeenCalledWith(boom);
  });
});

describe("getStripeStatus", () => {
  let mockPrisma;
  let mockStripe;

  beforeEach(() => {
    mockPrisma = globalThis.__mockPrisma;
    mockStripe = globalThis.__mockStripe;
    mockPrisma.restaurant = { findUnique: vi.fn() };
    mockStripe.accounts.retrieve.mockReset();
    process.env.STRIPE_SECRET_KEY = "sk_test_fake";
  });

  it("returns 404 when restaurant does not exist", async () => {
    const { req, res, next } = mockReqRes();
    mockPrisma.restaurant.findUnique.mockResolvedValueOnce(null);

    await getStripeStatus(req, res, next);

    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.json).toHaveBeenCalledWith({ error: "Restaurant not found" });
  });

  it("returns connected: false when no stripeAccountId", async () => {
    const { req, res, next } = mockReqRes();
    mockPrisma.restaurant.findUnique.mockResolvedValueOnce({
      id: "rest-1",
      stripeAccountId: null,
    });

    await getStripeStatus(req, res, next);

    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({ data: { connected: false } });
  });

  it("returns full status when stripe account exists", async () => {
    const { req, res, next } = mockReqRes();
    mockPrisma.restaurant.findUnique.mockResolvedValueOnce({
      id: "rest-1",
      stripeAccountId: "acct_abc",
    });
    mockStripe.accounts.retrieve.mockResolvedValueOnce({
      charges_enabled: true,
      details_submitted: true,
    });

    await getStripeStatus(req, res, next);

    expect(mockStripe.accounts.retrieve).toHaveBeenCalledWith("acct_abc");
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({
      data: {
        connected: true,
        chargesEnabled: true,
        detailsSubmitted: true,
      },
    });
  });

  it("calls next(error) on unexpected errors", async () => {
    const { req, res, next } = mockReqRes();
    const boom = new Error("Stripe API down");
    mockPrisma.restaurant.findUnique.mockRejectedValueOnce(boom);

    await getStripeStatus(req, res, next);

    expect(next).toHaveBeenCalledWith(boom);
  });
});
