# Stripe Direct Charges Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan.

**Goal:** Replace the existing Stripe destination-charge flow with direct charges so that payments are created on each restaurant's connected Stripe account, with the platform collecting an application fee.
**Architecture:** `createCheckoutSession` passes `{ stripeAccount }` as the second argument to the Stripe SDK instead of using `transfer_data`; a new `/checkout/connect-webhook` route handles `checkout.session.completed` events that Stripe now sends to the connected account rather than the platform; `refundOrder` drops `reverse_transfer` and issues the refund on the connected account by fetching the restaurant's `stripeAccountId` via `restaurantId`. No database schema changes are required, and no frontend changes are needed.
**Tech Stack:** Node.js 20, Express 4, Stripe Node SDK (Connect), Prisma v7, Zod, Vitest.

---

## File Map

| Action | Path |
|--------|------|
| MODIFY | `api/controllers/checkout.controllers.js` |
| MODIFY | `api/routes/checkout.routes.js` |
| MODIFY | `api/app.js` |
| MODIFY | `api/tests/setup.js` |
| CREATE | `api/tests/__mocks__/stripe.mock.js` |
| CREATE | `api/tests/checkout.spec.js` |

---

## Chunk 1: Stripe mock for unit tests

### Task 1: Create `api/tests/__mocks__/stripe.mock.js`

**Files:**
- [ ] `api/tests/__mocks__/stripe.mock.js` (new file)

**Step 1 — Create the file:**

```js
// Shared Stripe mock — accessible via globalThis.__mockStripe
if (!globalThis.__mockStripe) {
  globalThis.__mockStripe = {
    checkout: { sessions: { create: vi.fn() } },
    webhooks: { constructEvent: vi.fn() },
    refunds: { create: vi.fn() },
    accounts: { create: vi.fn(), retrieve: vi.fn() },
    accountLinks: { create: vi.fn() },
  };
}

// Export a constructor so `new Stripe(key)` returns the shared mock
module.exports = function Stripe() {
  return globalThis.__mockStripe;
};
module.exports.default = module.exports;
```

---

### Task 2: Wire the Stripe mock into `api/tests/setup.js`

**Files:**
- [ ] `api/tests/setup.js`

**Step 1 — Add `"stripe"` to the `mockMap`:**

Current `mockMap`:
```js
const mockMap = {
  "lib/prisma": resolve(__dirname, "__mocks__/prisma.mock.js"),
  "lib/supabase": resolve(__dirname, "__mocks__/supabase.mock.js"),
  [loggerPath]: resolve(__dirname, "__mocks__/logger.mock.js"),
};
```

Replace with:
```js
const stripePath = resolve(__dirname, "..", "node_modules", "stripe");
const mockMap = {
  "lib/prisma": resolve(__dirname, "__mocks__/prisma.mock.js"),
  "lib/supabase": resolve(__dirname, "__mocks__/supabase.mock.js"),
  [loggerPath]: resolve(__dirname, "__mocks__/logger.mock.js"),
  [stripePath]: resolve(__dirname, "__mocks__/stripe.mock.js"),
};
```

> Note: the mock is keyed by the resolved absolute path of the `stripe` package so the `Module._resolveFilename` patch intercepts it correctly, regardless of where the require originates.

---

## Chunk 2: Controller changes

### Task 3: Update `createCheckoutSession` — switch to direct charge

**Files:**
- [ ] `api/controllers/checkout.controllers.js`

**Step 1 — Replace the `stripe.checkout.sessions.create` call (lines 172–192):**

Old code:
```js
const session = await stripe.checkout.sessions.create({
  payment_method_types: ["card"],
  line_items: lineItems,
  mode: "payment",
  success_url: `${process.env.CLIENT_URL}/order/success?session_id={CHECKOUT_SESSION_ID}`,
  cancel_url: `${process.env.CLIENT_URL}/order/cancel`,
  customer_email: email || undefined,
  payment_intent_data: {
    application_fee_amount: applicationFeeAmount,
    transfer_data: {
      destination: restaurant.stripeAccountId,
    },
  },
  metadata: {
    restaurantId,
    fullName: fullName || "",
    phone: phone || "",
    email: email || "",
    items: JSON.stringify(items),
  },
});
```

New code:
```js
const session = await stripe.checkout.sessions.create(
  {
    payment_method_types: ["card"],
    line_items: lineItems,
    mode: "payment",
    success_url: `${process.env.CLIENT_URL}/order/success?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${process.env.CLIENT_URL}/order/cancel`,
    customer_email: email || undefined,
    payment_intent_data: {
      application_fee_amount: applicationFeeAmount,
    },
    metadata: {
      restaurantId,
      fullName: fullName || "",
      phone: phone || "",
      email: email || "",
      items: JSON.stringify(items),
    },
  },
  { stripeAccount: restaurant.stripeAccountId },
);
```

Key diff: `transfer_data` block is removed; `{ stripeAccount: restaurant.stripeAccountId }` is passed as the second argument.

---

### Task 4: Update `refundOrder` — refund on connected account

**Files:**
- [ ] `api/controllers/checkout.controllers.js`

**Step 1 — Add restaurant lookup and update the `stripe.refunds.create` call:**

Old code (lines 300–303):
```js
const refund = await stripe.refunds.create({
  payment_intent: order.stripePaymentIntentId,
  reverse_transfer: true,
});
```

New code — insert a restaurant fetch before the refund, then update the call:
```js
const restaurant = await prisma.restaurant.findUnique({
  where: { id: restaurantId },
});
if (!restaurant || !restaurant.stripeAccountId) {
  return res.status(400).json({ error: "No Stripe account associated with this restaurant" });
}

const refund = await stripe.refunds.create(
  { payment_intent: order.stripePaymentIntentId },
  { stripeAccount: restaurant.stripeAccountId },
);
```

`reverse_transfer: true` is removed — it is only valid for destination charges and will throw for direct charges.

---

### Task 5: Add `handleConnectWebhook` export

**Files:**
- [ ] `api/controllers/checkout.controllers.js`

**Step 1 — Add a new `CONNECT_WEBHOOK_SECRET` constant at the top of the file (after the existing `WEBHOOK_SECRET` line):**

```js
const WEBHOOK_SECRET = process.env.STRIPE_WEBHOOK_SECRET;
const CONNECT_WEBHOOK_SECRET = process.env.STRIPE_CONNECT_WEBHOOK_SECRET;
```

**Step 2 — Append the new export at the bottom of the file:**

```js
module.exports.handleConnectWebhook = async (req, res) => {
  const sig = req.headers["stripe-signature"];

  let event;
  try {
    event = stripe.webhooks.constructEvent(req.body, sig, CONNECT_WEBHOOK_SECRET);
  } catch (err) {
    logger.warn({ error: err.message }, "Stripe connect webhook signature verification failed");
    return res.status(400).json({ error: `Webhook error: ${err.message}` });
  }

  if (event.type === "checkout.session.completed") {
    const session = event.data.object;
    const { restaurantId, fullName, phone, email } = session.metadata;
    const items = JSON.parse(session.metadata.items || "[]");
    const totalPrice = session.amount_total / 100;

    try {
      const order = await withOrderNumber(async (tx, orderNumber) => {
        const created = await tx.order.create({
          data: {
            restaurantId,
            fullName: fullName || null,
            phone: phone || null,
            email: email || null,
            totalPrice,
            status: "PENDING",
            stripePaymentIntentId: session.payment_intent || null,
            orderNumber,
          },
        });

        for (const item of items) {
          const orderProduct = await tx.orderProduct.create({
            data: {
              orderId: created.id,
              productId: item.productId,
              quantity: item.quantity,
            },
          });

          if (item.optionChoiceIds && item.optionChoiceIds.length > 0) {
            await tx.orderProductOption.createMany({
              data: item.optionChoiceIds.map((ocId) => ({
                orderProductId: orderProduct.id,
                optionChoiceId: ocId,
              })),
            });
          }
        }

        return created;
      });

      logger.info(
        { orderId: order.id, restaurantId, sessionId: session.id },
        "Order created from Stripe connect webhook",
      );
      sendOrderConfirmation({ to: email || null, order });
    } catch (err) {
      logger.error(
        { error: err.message, sessionId: session.id, restaurantId },
        "Failed to create order from connect webhook",
      );
      return res.status(500).json({ error: "Failed to create order" });
    }
  }

  res.status(200).json({ received: true });
};
```

> The order-creation logic is identical to `handleWebhook`. The only difference is the webhook secret used and the route it is mounted on.

---

## Chunk 3: Route and middleware changes

### Task 6: Add `connect-webhook` route in `api/routes/checkout.routes.js`

**Files:**
- [ ] `api/routes/checkout.routes.js`

**Step 1 — Add the import of `handleConnectWebhook` (it is already exported from the same controller file, no import change needed — `checkoutControllers.handleConnectWebhook` will resolve automatically).**

**Step 2 — Add the new route after the existing `/webhook` route:**

```js
// express.raw() is applied in app.js before JSON parsing for this route
router.post("/webhook", checkoutControllers.handleWebhook);
router.post("/connect-webhook", checkoutControllers.handleConnectWebhook);
```

---

### Task 7: Exempt `connect-webhook` from CORS and apply `express.raw` in `api/app.js`

**Files:**
- [ ] `api/app.js`

**Step 1 — Add `express.raw` middleware for the new route (before CORS, alongside the existing webhook raw-body lines):**

Old code (lines 67–68):
```js
app.use("/api/checkout/webhook", express.raw({ type: "application/json" }));
app.use("/api/v1/checkout/webhook", express.raw({ type: "application/json" }));
```

New code:
```js
app.use("/api/checkout/webhook", express.raw({ type: "application/json" }));
app.use("/api/v1/checkout/webhook", express.raw({ type: "application/json" }));
app.use("/api/checkout/connect-webhook", express.raw({ type: "application/json" }));
app.use("/api/v1/checkout/connect-webhook", express.raw({ type: "application/json" }));
```

**Step 2 — Update the CORS bypass predicate (line 82) to also exclude the new route:**

Old code:
```js
if (req.path.endsWith("/checkout/webhook")) {
  return next();
}
```

New code:
```js
if (req.path.endsWith("/checkout/webhook") || req.path.endsWith("/checkout/connect-webhook")) {
  return next();
}
```

**Step 3 — Update the `paymentLimiter` skip predicate (line 57) to also skip the connect webhook:**

Old code:
```js
skip: (req) => req.path === "/webhook", // Skip webhook (Stripe calls)
```

New code:
```js
skip: (req) => req.path === "/webhook" || req.path === "/connect-webhook",
```

---

## Chunk 4: Unit tests

### Task 8: Create `api/tests/checkout.spec.js`

**Files:**
- [ ] `api/tests/checkout.spec.js` (new file)

**Step 1 — Create the file with the following complete content:**

```js
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
      findUnique: vi.fn().mockResolvedValue({
        id: "ord-1",
        restaurantId: "rest-1",
        stripePaymentIntentId: "pi_test_xyz",
        status: "PENDING",
      }),
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
```

---

## Chunk 5: Stripe dashboard configuration

### Task 9: Configure the Connect webhook in the Stripe dashboard

This task is a manual step (no code change).

**Step 1 — Create the Connect webhook endpoint:**

1. Go to [Stripe Dashboard → Webhooks](https://dashboard.stripe.com/webhooks).
2. Click **Add endpoint**.
3. Set endpoint URL to: `https://<your-api-domain>/api/v1/checkout/connect-webhook`
4. Under **Listen to**, select **Events on Connected accounts** (not "Events on your account").
5. Add the event: `checkout.session.completed`.
6. Save the endpoint and copy the **Signing secret** — this is the value for `STRIPE_CONNECT_WEBHOOK_SECRET`.

**Step 2 — Add the env var to your deployment and local `.env`:**

```
STRIPE_CONNECT_WEBHOOK_SECRET=whsec_...
```

The existing `STRIPE_WEBHOOK_SECRET` (for the platform-level `/webhook` endpoint) remains unchanged.

---

## Chunk 6: Verification

### Task 10: Run the unit tests

```bash
cd api && npm test -- --reporter=verbose checkout
```

Expected output: all tests in `checkout.spec.js` pass (no failures).

### Task 11: Smoke-test with Stripe CLI (local)

```bash
# Forward platform webhook (unchanged)
stripe listen --forward-to localhost:5001/api/v1/checkout/webhook

# Forward connect webhook (new)
stripe listen --forward-to localhost:5001/api/v1/checkout/connect-webhook \
  --forward-connect-to localhost:5001/api/v1/checkout/connect-webhook
```

1. Create a checkout session via `POST /api/v1/checkout/create-session` with a restaurant that has a `stripeAccountId`.
2. Confirm the session in the Stripe test UI.
3. Observe that `checkout.session.completed` is received at `/connect-webhook` and an order row is created in the database.
4. Call `POST /api/v1/checkout/restaurants/:restaurantId/orders/:orderId/refund` and verify the refund appears on the connected account in Stripe dashboard (not the platform account).

---

## Notes

- **Platform webhook (`/checkout/webhook`) is unchanged.** It still uses `STRIPE_WEBHOOK_SECRET` and handles account-level events (e.g. `account.updated` for onboarding). The existing `handleWebhook` export is not modified.
- **`event.account`** is available on Connect webhook events and contains the connected account ID. The current implementation does not need it because `restaurantId` is already embedded in `session.metadata`. It can be used for extra validation if desired.
- **Stripe rate limiter skip:** `paymentLimiter` already skips `/webhook`; the `/connect-webhook` path is added to the same skip predicate in Task 7 so Stripe's retry requests are not throttled.
- **No DB migration needed.** `restaurantId` is already on every `Order` row; `refundOrder` fetches `stripeAccountId` by joining through `restaurantId` rather than denormalising it onto the order.
- **`withOrderNumber` uses `prisma.$transaction` internally.** The unit tests mock `mockPrisma.$transaction` directly, matching the pattern established in `orderNumber.spec.js`.
