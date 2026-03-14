# Order Numbers & Customer Auth Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add human-readable order numbers to every order, and allow customers to create accounts with order history and profile management.

**Architecture:** Order numbers are 6-char random alphanumeric codes generated before each transaction with P2002-based retry. Customer auth reuses existing Supabase Auth; the `User` model is extended for profile data; `Order.userId` relation is made explicit. Guest checkout stays unchanged.

**Tech Stack:** Node.js/Express (CommonJS), Prisma 7 + PostgreSQL (Supabase), Vitest + Supertest (integration tests), Next.js 15 App Router (TypeScript), Supabase Auth (email/password + OAuth), shadcn/ui components (Button, Input, Label already available).

**Spec:** `docs/superpowers/specs/2026-03-14-order-number-customer-auth-design.md`

---

## Chunk 1: Order Numbers

### File Map

| Action | Path | Responsibility |
|--------|------|----------------|
| Create | `api/lib/orderNumber.js` | `withOrderNumber()` + `generateCode()` utility |
| Modify | `api/prisma/schema.prisma` | Add `orderNumber` to `Order` |
| Modify | `api/controllers/checkout.controllers.js` | Integrate `withOrderNumber()` in both checkout paths |
| Modify | `api/controllers/order.controllers.js` | Integrate `withOrderNumber()` in `createOrder`; add `getOrderPublic` |
| Modify | `api/routes/order.routes.js` | Add public `GET /orders/:orderId` route |
| Create | `api/tests/orderNumber.spec.js` | Unit tests for generator + retry logic |
| Modify | `frontend/app/store/[slug]/order/confirmation/[orderId]/page.tsx` | Fetch and display `orderNumber` |

> **Note:** `api/app.js` does NOT need modification — `order.routes.js` is already mounted at both `/api` and `/api/v1` prefixes (line 108).
> **Note:** The Stripe success page (`/order/success`) uses a different URL pattern and will be updated in the Checkout spec.

---

### Task 1.1 — Prisma: add `orderNumber` to `Order`

**Files:**
- Modify: `api/prisma/schema.prisma` (model Order, line 185)

- [ ] **Step 1: Add the field to schema**

In `api/prisma/schema.prisma`, inside the `Order` model after the `id` field, add:

```prisma
orderNumber String? @unique @map("order_number") @db.VarChar(6)
```

The full `Order` model block should now start:

```prisma
model Order {
  id                     String         @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
  orderNumber            String?        @unique @map("order_number") @db.VarChar(6)
  restaurantId           String         @map("restaurant_id") @db.Uuid
  // ... rest unchanged
```

- [ ] **Step 2: Run migration**

```bash
cd api && npx prisma migrate dev --name add_order_number
```

Expected: migration file created, `order_number` column added to `orders` table as nullable VARCHAR(6) with unique constraint.

- [ ] **Step 3: Regenerate Prisma client**

```bash
cd api && npx prisma generate
```

Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add api/prisma/schema.prisma api/prisma/migrations/
git commit -m "feat(db): add nullable orderNumber field to Order"
```

---

### Task 1.2 — API: `generateOrderNumber()` utility

**Files:**
- Create: `api/lib/orderNumber.js`
- Create: `api/tests/orderNumber.spec.js`

- [ ] **Step 1: Write the failing test first**

Create `api/tests/orderNumber.spec.js`:

```js
const { describe, it, expect, vi, beforeEach } = require("vitest");

const mockTransaction = vi.fn();
vi.mock("../lib/prisma", () => ({
  default: { $transaction: mockTransaction },
}));

const { CHARSET, generateCode, withOrderNumber } = require("../lib/orderNumber");

describe("generateCode", () => {
  it("generates a 6-character string", () => {
    const code = generateCode();
    expect(code).toHaveLength(6);
  });

  it("only uses characters from CHARSET", () => {
    for (let i = 0; i < 100; i++) {
      const code = generateCode();
      for (const char of code) {
        expect(CHARSET).toContain(char);
      }
    }
  });

  it("does not use ambiguous characters O, 0, I, 1", () => {
    for (let i = 0; i < 200; i++) {
      const code = generateCode();
      expect(code).not.toMatch(/[O0I1]/);
    }
  });
});

describe("withOrderNumber", () => {
  beforeEach(() => {
    mockTransaction.mockReset();
  });

  it("resolves with result on first success", async () => {
    const fakeOrder = { id: "abc", orderNumber: "A4X9K2" };
    mockTransaction.mockResolvedValueOnce(fakeOrder);

    const result = await withOrderNumber(async (_tx, orderNumber) => {
      expect(orderNumber).toHaveLength(6);
      return fakeOrder;
    });

    expect(result).toBe(fakeOrder);
    expect(mockTransaction).toHaveBeenCalledTimes(1);
  });

  it("retries on P2002 collision and resolves on second attempt", async () => {
    const p2002 = Object.assign(new Error("Unique constraint"), {
      code: "P2002",
      meta: { target: ["order_number"] },
    });
    const fakeOrder = { id: "abc", orderNumber: "B5Y8J3" };
    mockTransaction
      .mockRejectedValueOnce(p2002)
      .mockResolvedValueOnce(fakeOrder);

    const result = await withOrderNumber(async (_tx, _on) => fakeOrder);
    expect(result).toBe(fakeOrder);
    expect(mockTransaction).toHaveBeenCalledTimes(2);
  });

  it("throws after 5 P2002 collisions with statusCode 500", async () => {
    const p2002 = Object.assign(new Error("Unique constraint"), {
      code: "P2002",
      meta: { target: ["order_number"] },
    });
    mockTransaction.mockRejectedValue(p2002);

    await expect(withOrderNumber(async () => {})).rejects.toMatchObject({
      message: "Failed to generate unique order number",
      statusCode: 500,
    });
    expect(mockTransaction).toHaveBeenCalledTimes(5);
  });

  it("rethrows immediately on non-P2002 errors", async () => {
    const dbError = new Error("Connection failed");
    mockTransaction.mockRejectedValueOnce(dbError);

    await expect(withOrderNumber(async () => {})).rejects.toBe(dbError);
    expect(mockTransaction).toHaveBeenCalledTimes(1);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
cd api && npx vitest run tests/orderNumber.spec.js
```

Expected: FAIL — `generateCode` is not defined.

- [ ] **Step 3: Implement `api/lib/orderNumber.js`**

```js
const prisma = require("./prisma");

const CHARSET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

function generateCode() {
  let code = "";
  for (let i = 0; i < 6; i++) {
    code += CHARSET[Math.floor(Math.random() * CHARSET.length)];
  }
  return code;
}

/**
 * Wraps a Prisma transaction callback with orderNumber retry logic.
 * Generates a code, passes it to the callback, retries on P2002 collision.
 *
 * @param {Function} txCallback - async (tx, orderNumber) => createdOrder
 * @returns {Promise<object>} the created order
 * @throws {Error} after 5 failed attempts
 */
async function withOrderNumber(txCallback) {
  for (let attempt = 0; attempt < 5; attempt++) {
    const orderNumber = generateCode();
    try {
      return await prisma.$transaction((tx) => txCallback(tx, orderNumber));
    } catch (err) {
      const isCollision =
        err.code === "P2002" &&
        Array.isArray(err.meta?.target) &&
        err.meta.target.includes("order_number");
      if (isCollision) continue;
      throw err;
    }
  }
  throw Object.assign(new Error("Failed to generate unique order number"), {
    statusCode: 500,
  });
}

module.exports = { CHARSET, generateCode, withOrderNumber };
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
cd api && npx vitest run tests/orderNumber.spec.js
```

Expected: 3 tests pass.

- [ ] **Step 5: Commit**

```bash
git add api/lib/orderNumber.js api/tests/orderNumber.spec.js
git commit -m "feat(api): add generateOrderNumber utility with retry logic"
```

---

### Task 1.3 — API: integrate `orderNumber` into all three creation paths

There are **three** places where orders are created:
1. On-site payment path in `checkout.controllers.js` (line 79)
2. Stripe webhook handler in `checkout.controllers.js` (line 222)
3. Direct order creation in `order.controllers.js` (line 87) — used by `POST /restaurants/:restaurantId/orders`

All three must use `withOrderNumber` to ensure every order has an `orderNumber`.

**Files:**
- Modify: `api/controllers/checkout.controllers.js`
- Modify: `api/controllers/order.controllers.js`

- [ ] **Step 1: Add import at top of file**

In `api/controllers/checkout.controllers.js`, after line 3 (`const logger = ...`), add:

```js
const { withOrderNumber } = require("../lib/orderNumber");
```

- [ ] **Step 2: Replace on-site payment transaction (lines 79–121)**

Find the block:
```js
const order = await prisma.$transaction(async (tx) => {
  const created = await tx.order.create({
    data: {
      restaurantId,
      fullName,
      phone,
      email,
      totalPrice,
      status: "PENDING_ON_SITE_PAYMENT",
    },
  });
```

Replace the entire `prisma.$transaction` call (lines 79–121) with `withOrderNumber`:

```js
const order = await withOrderNumber(async (tx, orderNumber) => {
  const created = await tx.order.create({
    data: {
      restaurantId,
      fullName,
      phone,
      email,
      totalPrice,
      status: "PENDING_ON_SITE_PAYMENT",
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

  return tx.order.findUnique({
    where: { id: created.id },
    include: {
      orderProducts: {
        include: {
          product: true,
          orderProductOptions: { include: { optionChoice: true } },
        },
      },
    },
  });
});
```

- [ ] **Step 3: Replace webhook transaction (lines 222–255)**

Find the block starting with:
```js
const order = await prisma.$transaction(async (tx) => {
  const created = await tx.order.create({
    data: {
      restaurantId,
      fullName: fullName || null,
```

Replace the entire `prisma.$transaction` call with `withOrderNumber`:

```js
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
```

- [ ] **Step 4: Integrate `withOrderNumber` into `createOrder` in `api/controllers/order.controllers.js`**

Add import at top of `api/controllers/order.controllers.js`:

```js
const { withOrderNumber } = require("../lib/orderNumber");
```

Replace the `prisma.$transaction` call (lines 87–129) with `withOrderNumber`:

```js
const data = await withOrderNumber(async (tx, orderNumber) => {
  const order = await tx.order.create({
    data: { restaurantId, fullName, phone, email, totalPrice, orderNumber },
  });

  if (appliedPromoCode) {
    await tx.promoCode.update({
      where: { id: appliedPromoCode.id },
      data: { usedCount: { increment: 1 } },
    });
  }

  for (const item of items) {
    const orderProduct = await tx.orderProduct.create({
      data: {
        orderId: order.id,
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

  return tx.order.findUnique({
    where: { id: order.id },
    include: {
      orderProducts: {
        include: {
          product: true,
          orderProductOptions: { include: { optionChoice: true } },
        },
      },
    },
  });
});
```

- [ ] **Step 5: Manual smoke test — on-site path**

Start the API (`npm run dev` in `api/`). Send:

```bash
curl -X POST http://localhost:5001/api/checkout/create-session \
  -H "Content-Type: application/json" \
  -d '{"restaurantId":"<a-valid-restaurant-id-without-stripe>","fullName":"Test","items":[{"productId":"<valid-product-id>","quantity":1,"optionChoiceIds":[]}]}'
```

Expected: response includes `data.order.orderNumber` as a 6-char string.

- [ ] **Step 6: Commit**

```bash
git add api/controllers/checkout.controllers.js api/controllers/order.controllers.js
git commit -m "feat(api): generate orderNumber on all order creation paths"
```

---

### Task 1.4 — API: public order lookup endpoint

`api/controllers/order.controllers.js` and `api/routes/order.routes.js` already exist and are already mounted in `app.js`. We add a new export and a new public route.

**Files:**
- Modify: `api/controllers/order.controllers.js` (add `getOrderPublic` at the end)
- Modify: `api/routes/order.routes.js` (add one public route at the top)

- [ ] **Step 1: Add `getOrderPublic` to `api/controllers/order.controllers.js`**

Append at the end of the file:

```js
// Intentionally public (no auth) — returns minimal order info for confirmation pages.
// Order IDs are UUIDs and not guessable.
module.exports.getOrderPublic = async (req, res, next) => {
  const { orderId } = req.params;

  try {
    const order = await prisma.order.findUnique({
      where: { id: orderId },
      select: {
        id: true,
        orderNumber: true,
        status: true,
        totalPrice: true,
        createdAt: true,
      },
    });

    if (!order) {
      return res.status(404).json({ error: "Order not found" });
    }

    logger.info({ orderId }, "Public order lookup");
    return res.status(200).json({ data: order });
  } catch (error) {
    next(error);
  }
};
```

- [ ] **Step 2: Add the public route to `api/routes/order.routes.js`**

Add at the top of the route file, before the existing restaurant-scoped routes:

```js
// Public — no auth required
router.get("/orders/:orderId", orderControllers.getOrderPublic);
```

The full import line for `getOrderPublic` is already covered by `require("../controllers/order.controllers")` — no new import needed.

- [ ] **Step 3: Manual test**

```bash
curl http://localhost:5001/api/orders/<an-existing-order-uuid>
```

Expected: `{ data: { id, orderNumber, status, totalPrice, createdAt } }`

```bash
curl http://localhost:5001/api/orders/00000000-0000-0000-0000-000000000000
```

Expected: `{ error: "Order not found" }` with status 404.

- [ ] **Step 4: Commit**

```bash
git add api/controllers/order.controllers.js api/routes/order.routes.js
git commit -m "feat(api): add public GET /api/orders/:orderId endpoint"
```

---

### Task 1.5 — Frontend: display `orderNumber` on confirmation page

**Files:**
- Modify: `frontend/app/store/[slug]/order/confirmation/[orderId]/page.tsx`

- [ ] **Step 1: Update the page to fetch and display `orderNumber`**

Replace the entire content of `frontend/app/store/[slug]/order/confirmation/[orderId]/page.tsx`:

```tsx
import Link from "next/link";
import { CheckCircle } from "lucide-react";
import { Button } from "@/components/ui/button";

async function getOrder(orderId: string) {
  try {
    const res = await fetch(
      `${process.env.NEXT_PUBLIC_API_URL}/api/orders/${orderId}`,
      { cache: "no-store" }
    );
    if (!res.ok) return null;
    const { data } = await res.json();
    return data;
  } catch {
    return null;
  }
}

export default async function StoreOrderConfirmationPage({
  params,
}: {
  params: Promise<{ slug: string; orderId: string }>;
}) {
  const { slug, orderId } = await params;
  const order = await getOrder(orderId);

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="text-center max-w-sm">
        <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
        <h1 className="text-2xl font-bold mb-2">Commande confirmée !</h1>
        <p className="text-[#676767] mb-2">
          Votre commande a bien été enregistrée.
        </p>
        <p className="text-[#676767] mb-6">
          Paiement à régler sur place lors du retrait.
        </p>
        <p className="text-xs text-[#676767] mb-4 font-mono">
          Commande #{order?.orderNumber ?? orderId.slice(-8)}
        </p>
        <Button asChild>
          <Link href={`/store/${slug}`}>Retour au menu</Link>
        </Button>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Verify `NEXT_PUBLIC_API_URL` is set in `frontend/.env.local`**

```bash
grep NEXT_PUBLIC_API_URL frontend/.env.local
```

Expected: `NEXT_PUBLIC_API_URL=http://localhost:5001` (or similar). If missing, add it.

- [ ] **Step 3: Manual test**

Navigate to `/store/[slug]/order/confirmation/[a-real-order-id]`. Verify `Commande #A4X9K2` is shown (with the real orderNumber).

- [ ] **Step 4: Commit**

```bash
git add frontend/app/store/[slug]/order/confirmation/[orderId]/page.tsx
git commit -m "feat(frontend): display orderNumber on confirmation page"
```

---

## Chunk 2: Customer Auth

### File Map

| Action | Path | Responsibility |
|--------|------|----------------|
| Modify | `api/prisma/schema.prisma` | Add address/city/zipCode to User, explicit User↔Order relation |
| Modify | `api/validators/schemas.js` | Add address fields to `updateUserSchema` |
| Modify | `api/controllers/user.controllers.js` | Update `updateUserData`, add `getUserOrders` |
| Modify | `api/routes/user.routes.js` | Add `GET /me/orders` route |
| Create | `frontend/app/auth/callback/route.ts` | Supabase OAuth PKCE callback |
| Modify | `frontend/app/login/page.tsx` | Add redirect param support + link to register |
| Create | `frontend/app/register/page.tsx` | Registration (email/password + OAuth) |
| Create | `frontend/app/account/page.tsx` | Profile edit |
| Create | `frontend/app/account/orders/page.tsx` | Order history |

---

### Task 2.0 — Frontend: shared redirect utility

`isSafeRedirect` is a security control used in three files. Extract it once.

**Files:**
- Create: `frontend/lib/redirectUtils.ts`

- [ ] **Step 1: Create `frontend/lib/redirectUtils.ts`**

```ts
/**
 * Validates that a redirect target is a safe relative path.
 * Prevents open redirect attacks.
 */
export function isSafeRedirect(redirect: string | null): redirect is string {
  if (!redirect) return false;
  const decoded = decodeURIComponent(redirect);
  if (!decoded.startsWith("/")) return false;
  if (decoded.startsWith("//")) return false;
  if (decoded.includes("http://") || decoded.includes("https://")) return false;
  return true;
}
```

- [ ] **Step 2: Commit**

```bash
git add frontend/lib/redirectUtils.ts
git commit -m "feat(frontend): add shared isSafeRedirect utility"
```

---

### Task 2.1 — Prisma: extend User model

**Files:**
- Modify: `api/prisma/schema.prisma`

- [ ] **Step 1: Add fields to `User` and explicit relation**

In `api/prisma/schema.prisma`, update the `User` model:

```prisma
model User {
  id                String             @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
  email             String?            @unique
  fullName          String?            @map("full_name") @db.VarChar(50)
  phone             String?
  address           String?            @map("address") @db.VarChar(200)
  city              String?            @map("city") @db.VarChar(50)
  zipCode           String?            @map("zip_code") @db.VarChar(5)
  createdAt         DateTime?          @default(dbgenerated("(now() AT TIME ZONE 'utc'::text)")) @map("created_at") @db.Timestamptz(6)
  updatedAt         DateTime?          @map("updated_at") @db.Timestamp(6)
  restaurantMembers RestaurantMember[]
  orders            Order[]

  @@map("users")
  @@schema("public")
}
```

In the `Order` model, add the explicit relation (the `userId` field already exists):

```prisma
model Order {
  id                     String         @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
  orderNumber            String?        @unique @map("order_number") @db.VarChar(6)
  restaurantId           String         @map("restaurant_id") @db.Uuid
  userId                 String?        @map("user_id") @db.Uuid
  // ... other fields unchanged ...
  restaurant             Restaurant     @relation(fields: [restaurantId], references: [id], onDelete: Cascade, onUpdate: NoAction)
  user                   User?          @relation(fields: [userId], references: [id], onDelete: SetNull, onUpdate: NoAction)
  orderProducts          OrderProduct[]

  @@index([restaurantId])
  @@index([userId])
  @@map("orders")
  @@schema("public")
}
```

- [ ] **Step 2: Run migration**

```bash
cd api && npx prisma migrate dev --name add_customer_profile_fields
```

Expected: migration adds `address`, `city`, `zip_code` columns to `users` table. Also adds index on `orders.user_id`.

- [ ] **Step 3: Regenerate client**

```bash
cd api && npx prisma generate
```

- [ ] **Step 4: Commit**

```bash
git add api/prisma/schema.prisma api/prisma/migrations/
git commit -m "feat(db): add customer profile fields and User-Order relation"
```

---

### Task 2.2 — API: update user schema and controller

**Files:**
- Modify: `api/validators/schemas.js`
- Modify: `api/controllers/user.controllers.js`

- [ ] **Step 1: Update `updateUserSchema` in `api/validators/schemas.js`**

Replace:
```js
const updateUserSchema = z.object({
  fullName: z.string().min(1).max(50).optional(),
  phone: phoneSchema.optional(),
});
```

With:
```js
const updateUserSchema = z.object({
  fullName: z.string().min(1).max(50).optional(),
  phone: phoneSchema.optional(),
  address: z.string().max(200).optional(),
  city: z.string().max(100).optional(),
  zipCode: z.string().regex(/^[0-9]{5}$/, "Invalid French postal code").optional(),
});
```

- [ ] **Step 2: Update `updateUserData` controller in `api/controllers/user.controllers.js`**

Replace:
```js
module.exports.updateUserData = async (req, res, next) => {
  const { id } = req.user;
  const { fullName, phone } = req.body;

  try {
    const data = await prisma.user.update({
      where: { id },
      data: { fullName, phone },
    });
```

With:
```js
module.exports.updateUserData = async (req, res, next) => {
  const { id } = req.user;
  const { fullName, phone, address, city, zipCode } = req.body;

  try {
    const data = await prisma.user.update({
      where: { id },
      data: { fullName, phone, address, city, zipCode },
    });
```

- [ ] **Step 3: Manual test**

```bash
curl -X PUT http://localhost:5001/api/user/me \
  -H "Authorization: Bearer <valid-token>" \
  -H "Content-Type: application/json" \
  -d '{"address":"12 rue de la Paix","city":"Paris","zipCode":"75001"}'
```

Expected: `{ data: { ..., address: "12 rue de la Paix", city: "Paris", zipCode: "75001" } }`

Test validation rejection:
```bash
curl -X PUT http://localhost:5001/api/user/me \
  -H "Authorization: Bearer <valid-token>" \
  -H "Content-Type: application/json" \
  -d '{"zipCode":"ABCDE"}'
```

Expected: 400 with validation error.

- [ ] **Step 4: Commit**

```bash
git add api/validators/schemas.js api/controllers/user.controllers.js
git commit -m "feat(api): extend user profile with address fields"
```

---

### Task 2.3 — API: `GET /api/user/me/orders`

**Files:**
- Modify: `api/validators/schemas.js`
- Modify: `api/controllers/user.controllers.js`
- Modify: `api/routes/user.routes.js`

- [ ] **Step 1: Add `getUserOrdersQuerySchema` to `api/validators/schemas.js`**

Add after the existing `updateUserSchema`:

```js
const getUserOrdersQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(50).default(20),
  offset: z.coerce.number().int().min(0).default(0),
});
```

Also add it to the `module.exports` at the bottom of `schemas.js`.

- [ ] **Step 2: Add `getUserOrders` to `api/controllers/user.controllers.js`**

Add at the end of the file:

```js
module.exports.getUserOrders = async (req, res, next) => {
  const { id } = req.user;
  const { limit, offset } = req.query; // Already validated and coerced by Zod

  try {
    const [orders, total] = await prisma.$transaction([
      prisma.order.findMany({
        where: { userId: id },
        orderBy: { createdAt: "desc" },
        take: Number(limit),
        skip: Number(offset),
        include: {
          restaurant: { select: { id: true, name: true, slug: true } },
          orderProducts: {
            include: {
              product: { select: { id: true, name: true } },
            },
          },
        },
      }),
      prisma.order.count({ where: { userId: id } }),
    ]);

    logger.info({ userId: id, count: orders.length }, "User orders fetched");
    return res.status(200).json({ data: { orders, total } });
  } catch (error) {
    next(error);
  }
};
```

- [ ] **Step 3: Add route in `api/routes/user.routes.js`**

First, add the import at the top of the file alongside the other schema imports:

```js
const { updateUserSchema, getUserOrdersQuerySchema } = require("../validators/schemas");
```

Then add the route before `module.exports`:

```js
router.get("/me/orders", checkAuth, validate({ query: getUserOrdersQuerySchema }), userControllers.getUserOrders);
```

**Important:** This route must be declared BEFORE any `router.get("/me/:param", ...)` routes to avoid route shadowing.

- [ ] **Step 3: Manual test**

```bash
curl http://localhost:5001/api/user/me/orders \
  -H "Authorization: Bearer <valid-token>"
```

Expected: `{ data: { orders: [...], total: N } }`

Test pagination:
```bash
curl "http://localhost:5001/api/user/me/orders?limit=5&offset=0" \
  -H "Authorization: Bearer <valid-token>"
```

- [ ] **Step 4: Commit**

```bash
git add api/validators/schemas.js api/controllers/user.controllers.js api/routes/user.routes.js
git commit -m "feat(api): add GET /api/user/me/orders endpoint"
```

---

### Task 2.4 — Frontend: OAuth callback route

**Files:**
- Create: `frontend/app/auth/callback/route.ts`

- [ ] **Step 1: Check if Supabase server client helper exists**

```bash
ls frontend/lib/supabase/
```

Expected: `client.ts` and `server.ts` (or similar). If `server.ts` is missing, you'll need to create it following the Supabase Next.js SSR guide.

- [ ] **Step 2: Create `frontend/app/auth/callback/route.ts`**

Uses the existing `@/lib/supabase/server` helper (do not re-implement `createServerClient` inline).

```ts
import { createClient } from "@/lib/supabase/server";
import { isSafeRedirect } from "@/lib/redirectUtils";
import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const redirect = searchParams.get("redirect");

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      const destination = isSafeRedirect(redirect) ? redirect : "/";
      return NextResponse.redirect(`${origin}${destination}`);
    }
  }

  return NextResponse.redirect(`${origin}/login?error=auth_callback_error`);
}
```

- [ ] **Step 3: Manual test**

Configure Google OAuth in Supabase dashboard (Authentication > Providers > Google). Add `http://localhost:3000/auth/callback` as a redirect URL. Test the OAuth flow from the register page (Task 2.6) once it's built.

- [ ] **Step 4: Commit**

```bash
git add frontend/app/auth/callback/route.ts
git commit -m "feat(frontend): add Supabase OAuth callback route"
```

---

### Task 2.5 — Frontend: update login page with redirect support

**Files:**
- Modify: `frontend/app/login/page.tsx`

- [ ] **Step 1: Update login page**

`useSearchParams()` in Next.js 15 requires a `<Suspense>` boundary. The pattern is to split the component into an inner component that uses `useSearchParams`, wrapped in `Suspense` by the page export.

Replace the entire content of `frontend/app/login/page.tsx`:

```tsx
"use client";

import { Suspense, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useRouter, useSearchParams } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2 } from "lucide-react";
import { isSafeRedirect } from "@/lib/redirectUtils";

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const supabase = createClient();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const redirectTo = searchParams.get("redirect");
  const destination = isSafeRedirect(redirectTo) ? redirectTo : "/";

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const { error } = await supabase.auth.signInWithPassword({ email, password });

    if (error) {
      setError(error.message);
      setLoading(false);
    } else {
      router.push(destination);
      router.refresh();
    }
  };

  return (
    <div className="bg-white border border-black/5 rounded-lg p-6">
      <h1 className="text-xl font-bold mb-4">Connexion</h1>

      <form onSubmit={handleLogin} className="space-y-4">
        <div className="space-y-1.5">
          <Label htmlFor="email">Email</Label>
          <Input
            id="email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            autoComplete="email"
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="password">Mot de passe</Label>
          <Input
            id="password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            autoComplete="current-password"
          />
        </div>

        {error && <p className="text-sm text-red-500">{error}</p>}

        <Button type="submit" className="w-full" disabled={loading}>
          {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Se connecter"}
        </Button>
      </form>

      <p className="text-center text-sm text-[#676767] mt-4">
        Pas encore de compte ?{" "}
        <Link
          href={`/register${redirectTo ? `?redirect=${encodeURIComponent(redirectTo)}` : ""}`}
          className="underline"
        >
          S&apos;inscrire
        </Link>
      </p>
    </div>
  );
}

export default function LoginPage() {
  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <Image
            src="https://g10afdaataaj4tkl.public.blob.vercel-storage.com/img/1Fichier-21.svg"
            alt="Pokey Bar"
            width={160}
            height={60}
            className="mx-auto"
          />
        </div>
        <Suspense fallback={<div className="bg-white border border-black/5 rounded-lg p-6 h-48" />}>
          <LoginForm />
        </Suspense>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Manual test**

Navigate to `/login?redirect=/account`. After login, verify redirect goes to `/account`. Navigate to `/login?redirect=//evil.com`. After login, verify redirect goes to `/` (fallback).

- [ ] **Step 3: Commit**

```bash
git add frontend/app/login/page.tsx
git commit -m "feat(frontend): add redirect support and register link to login page"
```

---

### Task 2.6 — Frontend: registration page

**Files:**
- Create: `frontend/app/register/page.tsx`

- [ ] **Step 1: Verify `NEXT_PUBLIC_SITE_URL` is set in `frontend/.env.local`**

```bash
grep NEXT_PUBLIC_SITE_URL frontend/.env.local
```

If missing, add: `NEXT_PUBLIC_SITE_URL=http://localhost:3000`

This is used instead of `window.location.origin` (which crashes during SSR).

- [ ] **Step 2: Create `frontend/app/register/page.tsx`**

`useSearchParams()` requires `<Suspense>`. Split into inner `RegisterForm` + page wrapper. Use `NEXT_PUBLIC_SITE_URL` instead of `window.location.origin`.

```tsx
"use client";

import { Suspense, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2 } from "lucide-react";
import { isSafeRedirect } from "@/lib/redirectUtils";

function RegisterForm() {
  const searchParams = useSearchParams();
  const supabase = createClient();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const redirectTo = searchParams.get("redirect");
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "";
  const callbackUrl = `${siteUrl}/auth/callback${isSafeRedirect(redirectTo) ? `?redirect=${encodeURIComponent(redirectTo)}` : ""}`;

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: { emailRedirectTo: callbackUrl },
    });

    if (error) {
      setError(error.message);
      setLoading(false);
    } else {
      setSuccess(true);
    }
  };

  const handleOAuth = async (provider: "google" | "apple") => {
    await supabase.auth.signInWithOAuth({
      provider,
      options: { redirectTo: callbackUrl },
    });
  };

  if (success) {
    return (
      <div className="text-center">
        <h1 className="text-xl font-bold mb-2">Vérifiez vos emails</h1>
        <p className="text-[#676767]">
          Un lien de confirmation vous a été envoyé à <strong>{email}</strong>.
        </p>
      </div>
    );
  }

  return (
    <div className="bg-white border border-black/5 rounded-lg p-6">
      <h1 className="text-xl font-bold mb-4">Créer un compte</h1>

      <div className="space-y-2 mb-4">
        <Button variant="outline" className="w-full" onClick={() => handleOAuth("google")} type="button">
          Continuer avec Google
        </Button>
        <Button variant="outline" className="w-full" onClick={() => handleOAuth("apple")} type="button">
          Continuer avec Apple
        </Button>
      </div>

      <div className="flex items-center gap-2 my-4">
        <div className="flex-1 border-t" />
        <span className="text-xs text-[#676767]">ou</span>
        <div className="flex-1 border-t" />
      </div>

      <form onSubmit={handleRegister} className="space-y-4">
        <div className="space-y-1.5">
          <Label htmlFor="email">Email</Label>
          <Input
            id="email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            autoComplete="email"
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="password">Mot de passe</Label>
          <Input
            id="password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            autoComplete="new-password"
            minLength={6}
          />
        </div>

        {error && <p className="text-sm text-red-500">{error}</p>}

        <Button type="submit" className="w-full" disabled={loading}>
          {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Créer un compte"}
        </Button>
      </form>

      <p className="text-center text-sm text-[#676767] mt-4">
        Déjà un compte ?{" "}
        <Link
          href={`/login${redirectTo ? `?redirect=${encodeURIComponent(redirectTo)}` : ""}`}
          className="underline"
        >
          Se connecter
        </Link>
      </p>
    </div>
  );
}

export default function RegisterPage() {
  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="w-full max-w-sm">
        <Suspense fallback={<div className="bg-white border border-black/5 rounded-lg p-6 h-48" />}>
          <RegisterForm />
        </Suspense>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Manual test**

Navigate to `/register`. Test:
1. Email/password signup → verify email confirmation screen shows
2. Google button → verify redirect to Google OAuth (requires Google provider configured in Supabase)

- [ ] **Step 3: Commit**

```bash
git add frontend/app/register/page.tsx
git commit -m "feat(frontend): add customer registration page"
```

---

### Task 2.7 — Frontend: account profile page

**Files:**
- Create: `frontend/app/account/page.tsx`

- [ ] **Step 1: Create `frontend/app/account/page.tsx`**

```tsx
"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2 } from "lucide-react";

const API_URL = process.env.NEXT_PUBLIC_API_URL;

export default function AccountPage() {
  const router = useRouter();
  const supabase = createClient();

  const [token, setToken] = useState<string | null>(null);
  const [form, setForm] = useState({
    fullName: "",
    phone: "",
    address: "",
    city: "",
    zipCode: "",
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    const init = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        router.push("/login?redirect=/account");
        return;
      }
      setToken(session.access_token);

      const res = await fetch(`${API_URL}/api/user/me`, {
        headers: { Authorization: `Bearer ${session.access_token}` },
      });
      if (res.ok) {
        const { data } = await res.json();
        setForm({
          fullName: data.fullName ?? "",
          phone: data.phone ?? "",
          address: data.address ?? "",
          city: data.city ?? "",
          zipCode: data.zipCode ?? "",
        });
      }
      setLoading(false);
    };
    init();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);
    setSuccess(false);

    const res = await fetch(`${API_URL}/api/user/me`, {
      method: "PUT",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(form),
    });

    if (res.ok) {
      setSuccess(true);
    } else {
      const { error } = await res.json();
      setError(error ?? "Une erreur est survenue");
    }
    setSaving(false);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-6 h-6 animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen p-4 max-w-md mx-auto">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Mon compte</h1>
        <Link href="/account/orders" className="text-sm underline text-[#676767]">
          Mes commandes
        </Link>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="space-y-1.5">
          <Label htmlFor="fullName">Nom complet</Label>
          <Input
            id="fullName"
            value={form.fullName}
            onChange={(e) => setForm({ ...form, fullName: e.target.value })}
            autoComplete="name"
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="phone">Téléphone</Label>
          <Input
            id="phone"
            value={form.phone}
            onChange={(e) => setForm({ ...form, phone: e.target.value })}
            autoComplete="tel"
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="address">Adresse</Label>
          <Input
            id="address"
            value={form.address}
            onChange={(e) => setForm({ ...form, address: e.target.value })}
            autoComplete="street-address"
          />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label htmlFor="zipCode">Code postal</Label>
            <Input
              id="zipCode"
              value={form.zipCode}
              onChange={(e) => setForm({ ...form, zipCode: e.target.value })}
              autoComplete="postal-code"
              maxLength={5}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="city">Ville</Label>
            <Input
              id="city"
              value={form.city}
              onChange={(e) => setForm({ ...form, city: e.target.value })}
              autoComplete="address-level2"
            />
          </div>
        </div>

        {error && <p className="text-sm text-red-500">{error}</p>}
        {success && <p className="text-sm text-green-600">Profil mis à jour.</p>}

        <Button type="submit" className="w-full" disabled={saving}>
          {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : "Enregistrer"}
        </Button>
      </form>
    </div>
  );
}
```

- [ ] **Step 2: Manual test**

1. Navigate to `/account` without being logged in → should redirect to `/login?redirect=/account`
2. After login, navigate to `/account` → form pre-filled with user data
3. Edit address fields and save → success message shown, fields updated

- [ ] **Step 3: Commit**

```bash
git add frontend/app/account/page.tsx
git commit -m "feat(frontend): add customer account profile page"
```

---

### Task 2.8 — Frontend: order history page

**Files:**
- Create: `frontend/app/account/orders/page.tsx`

- [ ] **Step 1: Create `frontend/app/account/orders/page.tsx`**

```tsx
"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Loader2 } from "lucide-react";

const API_URL = process.env.NEXT_PUBLIC_API_URL;

type Order = {
  id: string;
  orderNumber: string | null;
  status: string;
  totalPrice: string;
  createdAt: string;
  restaurant: { name: string; slug: string | null };
  orderProducts: { product: { name: string }; quantity: number }[];
};

const STATUS_LABELS: Record<string, string> = {
  PENDING: "En attente",
  IN_PROGRESS: "En cours",
  COMPLETED: "Terminée",
  DELIVERED: "Livrée",
  CANCELLED: "Annulée",
  PENDING_ON_SITE_PAYMENT: "Paiement sur place",
};

export default function OrderHistoryPage() {
  const router = useRouter();
  const supabase = createClient();

  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const init = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        router.push("/login?redirect=/account/orders");
        return;
      }

      const res = await fetch(`${API_URL}/api/user/me/orders`, {
        headers: { Authorization: `Bearer ${session.access_token}` },
      });
      if (res.ok) {
        const { data } = await res.json();
        setOrders(data.orders);
      }
      setLoading(false);
    };
    init();
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-6 h-6 animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen p-4 max-w-md mx-auto">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Mes commandes</h1>
        <Link href="/account" className="text-sm underline text-[#676767]">
          Mon compte
        </Link>
      </div>

      {orders.length === 0 ? (
        <p className="text-[#676767] text-center mt-12">Aucune commande pour l&apos;instant.</p>
      ) : (
        <div className="space-y-3">
          {orders.map((order) => (
            <div
              key={order.id}
              className="border border-black/5 rounded-lg p-4"
            >
              <div className="flex items-center justify-between mb-1">
                <span className="font-mono text-sm font-medium">
                  #{order.orderNumber ?? order.id.slice(-8)}
                </span>
                <span className="text-xs text-[#676767]">
                  {STATUS_LABELS[order.status] ?? order.status}
                </span>
              </div>
              <p className="text-sm font-medium">{order.restaurant.name}</p>
              <p className="text-xs text-[#676767] mt-1">
                {order.orderProducts
                  .map((op) => `${op.quantity}× ${op.product.name}`)
                  .join(", ")}
              </p>
              <div className="flex items-center justify-between mt-2">
                <span className="text-sm font-semibold">
                  {parseFloat(order.totalPrice).toFixed(2)} €
                </span>
                <span className="text-xs text-[#676767]">
                  {new Date(order.createdAt).toLocaleDateString("fr-FR")}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Manual test**

1. Place an order while logged in (on-site payment path, or create one via API with your userId)
2. Navigate to `/account/orders`
3. Verify the order appears with `orderNumber`, restaurant name, items, total, date

- [ ] **Step 3: Commit**

```bash
git add frontend/app/account/orders/page.tsx
git commit -m "feat(frontend): add customer order history page"
```

---

## Final Verification

- [ ] Run all backend tests: `cd api && npm test`
- [ ] Start frontend: `cd frontend && npm run dev` — check no TypeScript errors in new files
- [ ] Full flow test:
  1. Register at `/register` with email/password
  2. Confirm email, log in at `/login`
  3. Place an on-site order at a restaurant → confirm `orderNumber` shows on confirmation page
  4. Navigate to `/account/orders` → order appears
  5. Edit profile at `/account` → changes persist

- [ ] Final commit if anything was missed:

```bash
git add -A
git commit -m "feat: order numbers and customer auth complete"
```
