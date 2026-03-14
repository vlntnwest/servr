# Heure de Commande (Order Time Slot) Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Allow customers to choose between ordering ASAP ("Au plus vite") or scheduling a 15-minute-increment time slot within the restaurant's opening hours when placing an order.

**Architecture:** A new `scheduled_for` TIMESTAMPTZ column is added to the `orders` table and propagated through both order creation paths (`POST /restaurants/:restaurantId/orders` and `POST /checkout/create-session`). A shared `isScheduledTimeValid` helper validates the chosen slot against opening hours and is exported for unit testing. The frontend `checkout-modal.tsx` gains an order-type toggle with a time-slot `<select>` derived from the restaurant's opening hours, and the admin orders card displays a "Prévu pour HH:MM" badge when `scheduledFor` is set.

**Tech Stack:** Node.js/Express (CommonJS), Prisma v7 (PostgreSQL), Zod, Vitest (unit tests with mock Prisma via `globalThis.__mockPrisma`), Next.js 15, React 19, TypeScript, Tailwind CSS

---

## File Map

| Action | Path |
|--------|------|
| Create | `api/prisma/migrations/20260314000000_add_scheduled_for_to_orders/migration.sql` |
| Modify | `api/prisma/schema.prisma` |
| Modify | `api/validators/schemas.js` |
| Modify | `api/controllers/order.controllers.js` |
| Modify | `api/controllers/checkout.controllers.js` |
| Create | `api/tests/controllers/order-timeslot.spec.js` |
| Modify | `frontend/types/api.ts` |
| Modify | `frontend/lib/api.ts` |
| Modify | `frontend/components/cart/checkout-modal.tsx` |
| Modify | `frontend/components/admin/orders-tab.tsx` |

---

## Chunk 1: Database & Schema

### Task 1: DB Migration
**Files:**
- Create: `api/prisma/migrations/20260314000000_add_scheduled_for_to_orders/migration.sql`
- Modify: `api/prisma/schema.prisma`

- [ ] Step 1: Create the migration SQL file at `api/prisma/migrations/20260314000000_add_scheduled_for_to_orders/migration.sql` with this exact content:
  ```sql
  ALTER TABLE public.orders ADD COLUMN scheduled_for TIMESTAMPTZ;
  ```

- [ ] Step 2: In `api/prisma/schema.prisma`, add the `scheduledFor` field to the `Order` model immediately after `stripePaymentIntentId`:
  ```prisma
  stripePaymentIntentId  String?        @map("stripe_payment_intent_id")
  scheduledFor           DateTime?      @map("scheduled_for") @db.Timestamptz(6)
  createdAt              DateTime?      @default(dbgenerated("(now() AT TIME ZONE 'utc'::text)")) @map("created_at") @db.Timestamptz(6)
  ```

- [ ] Step 3: Apply the migration and regenerate the Prisma client:
  ```bash
  cd api && npx prisma migrate dev --name add_scheduled_for_to_orders
  ```
  Expected output: `The following migration(s) have been applied: 20260314000000_add_scheduled_for_to_orders`

- [ ] Step 4: Regenerate the Prisma client:
  ```bash
  cd api && npx prisma generate
  ```
  Expected output: `Generated Prisma Client`

---

## Chunk 2: Backend Validation & Controllers

### Task 2: Zod Validators
**Files:**
- Modify: `api/validators/schemas.js`

- [ ] Step 1: In `api/validators/schemas.js`, add `scheduledFor` to `orderSchema` (after `promoCode`):
  ```js
  const orderSchema = z.object({
    fullName: z.string().min(1).max(50).optional(),
    phone: phoneSchema.optional(),
    email: z.string().email().optional(),
    items: z.array(orderItemSchema).min(1),
    promoCode: z.string().min(1).max(50).optional(),
    scheduledFor: z.string().datetime({ offset: true }).optional(),
  });
  ```

- [ ] Step 2: In `api/validators/schemas.js`, add `scheduledFor` to `checkoutSessionSchema` (after `items`):
  ```js
  const checkoutSessionSchema = z.object({
    restaurantId: z.string().uuid(),
    fullName: z.string().min(1).max(50).optional(),
    phone: phoneSchema.optional(),
    email: z.string().email().optional(),
    items: z.array(orderItemSchema).min(1),
    scheduledFor: z.string().datetime({ offset: true }).optional(),
  });
  ```

- [ ] Step 3: Verify the schema accepts a valid future ISO string:
  ```bash
  cd api && node -e "const {orderSchema} = require('./validators/schemas'); console.log(orderSchema.parse({ items: [{ productId: 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', quantity: 1 }], scheduledFor: new Date(Date.now() + 3600000).toISOString() }))"
  ```
  Expected output: object with `scheduledFor` field populated.

### Task 3: Order Controller — isScheduledTimeValid + createOrder
**Files:**
- Modify: `api/controllers/order.controllers.js`

- [ ] Step 1: After the existing `isRestaurantOpen` function in `api/controllers/order.controllers.js`, add and export `isScheduledTimeValid`:
  ```js
  function isScheduledTimeValid(openingHours, scheduledAt) {
    const dt = new Date(scheduledAt);
    // Must be in the future
    if (dt <= new Date()) return false;
    // No opening hours configured → always open
    if (!openingHours || openingHours.length === 0) return true;
    const dayOfWeek = dt.getDay();
    const hours = `${String(dt.getHours()).padStart(2, "0")}:${String(dt.getMinutes()).padStart(2, "0")}`;
    const todayHours = openingHours.find((h) => h.dayOfWeek === dayOfWeek);
    if (!todayHours) return false;
    return hours >= todayHours.openTime && hours < todayHours.closeTime;
  }

  module.exports.isScheduledTimeValid = isScheduledTimeValid;
  ```

- [ ] Step 2: In `createOrder`, destructure `scheduledFor` from `req.body`:
  ```js
  const { fullName, phone, email, items, promoCode, scheduledFor } = req.body;
  ```

- [ ] Step 3: In `createOrder`, after the `isRestaurantOpen` check, add validation for `scheduledFor`:
  ```js
  if (scheduledFor && !isScheduledTimeValid(openingHours, scheduledFor)) {
    return res.status(400).json({ error: "Scheduled time is outside opening hours or in the past" });
  }
  ```

- [ ] Step 4: In `createOrder`, pass `scheduledFor` to `tx.order.create`:
  ```js
  const order = await tx.order.create({
    data: {
      restaurantId,
      fullName,
      phone,
      email,
      totalPrice,
      orderNumber,
      scheduledFor: scheduledFor ? new Date(scheduledFor) : null,
    },
  });
  ```

### Task 4: Checkout Controller — createCheckoutSession
**Files:**
- Modify: `api/controllers/checkout.controllers.js`

- [ ] Step 1: At the top of `api/controllers/checkout.controllers.js`, import `isScheduledTimeValid` from the order controller:
  ```js
  const { isScheduledTimeValid } = require("./order.controllers");
  ```

- [ ] Step 2: In `createCheckoutSession`, destructure `scheduledFor` from `req.body`:
  ```js
  const { restaurantId, fullName, phone, email, items, scheduledFor } = req.body;
  ```

- [ ] Step 3: In `createCheckoutSession`, after the `isRestaurantOpen` check, add the validation:
  ```js
  if (scheduledFor && !isScheduledTimeValid(openingHours, scheduledFor)) {
    return res.status(400).json({ error: "Scheduled time is outside opening hours or in the past" });
  }
  ```

- [ ] Step 4: In the on-site payment branch (`!restaurant.stripeAccountId`), pass `scheduledFor` to `tx.order.create`:
  ```js
  const created = await tx.order.create({
    data: {
      restaurantId,
      fullName,
      phone,
      email,
      totalPrice,
      status: "PENDING_ON_SITE_PAYMENT",
      orderNumber,
      scheduledFor: scheduledFor ? new Date(scheduledFor) : null,
    },
  });
  ```

- [ ] Step 5: In the Stripe session metadata, add `scheduledFor` so it survives the webhook round-trip:
  ```js
  metadata: {
    restaurantId,
    fullName: fullName || "",
    phone: phone || "",
    email: email || "",
    items: JSON.stringify(items),
    scheduledFor: scheduledFor || "",
  },
  ```

- [ ] Step 6: In `handleWebhook` (`checkout.session.completed`), destructure `scheduledFor` from metadata and pass it to `tx.order.create`:
  ```js
  const { restaurantId, fullName, phone, email, scheduledFor } = session.metadata;
  // ...
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
      scheduledFor: scheduledFor ? new Date(scheduledFor) : null,
    },
  });
  ```

---

## Chunk 3: Backend Unit Tests

### Task 5: Unit Tests for isScheduledTimeValid
**Files:**
- Create: `api/tests/controllers/order-timeslot.spec.js`

- [ ] Step 1: Create `api/tests/controllers/order-timeslot.spec.js` with the following content:
  ```js
  const { isScheduledTimeValid } = require("../../controllers/order.controllers");

  // Opening hours fixture: open Mon–Fri 12:00–22:00 (dayOfWeek 1–5)
  const weekdayHours = [
    { dayOfWeek: 1, openTime: "12:00", closeTime: "22:00" },
    { dayOfWeek: 2, openTime: "12:00", closeTime: "22:00" },
    { dayOfWeek: 3, openTime: "12:00", closeTime: "22:00" },
    { dayOfWeek: 4, openTime: "12:00", closeTime: "22:00" },
    { dayOfWeek: 5, openTime: "12:00", closeTime: "22:00" },
  ];

  /** Return a Date that is `offsetMs` ms from now, snapped to a weekday at 14:00 */
  function makeFutureWeekdayDate(offsetMs = 3600000) {
    const d = new Date(Date.now() + offsetMs);
    // Advance to Monday if weekend
    while (d.getDay() === 0 || d.getDay() === 6) {
      d.setDate(d.getDate() + 1);
    }
    d.setHours(14, 0, 0, 0);
    return d;
  }

  describe("isScheduledTimeValid", () => {
    it("returns false for a time in the past", () => {
      const past = new Date(Date.now() - 60000).toISOString();
      expect(isScheduledTimeValid(weekdayHours, past)).toBe(false);
    });

    it("returns true for a future time within opening hours on a weekday", () => {
      const future = makeFutureWeekdayDate().toISOString();
      expect(isScheduledTimeValid(weekdayHours, future)).toBe(true);
    });

    it("returns false for a future time outside opening hours (before open)", () => {
      const d = makeFutureWeekdayDate();
      d.setHours(10, 0, 0, 0); // 10:00 — before 12:00 open
      // Ensure still in the future
      const target = new Date(d);
      target.setDate(target.getDate() + 1);
      while (target.getDay() === 0 || target.getDay() === 6) {
        target.setDate(target.getDate() + 1);
      }
      target.setHours(10, 0, 0, 0);
      expect(isScheduledTimeValid(weekdayHours, target.toISOString())).toBe(false);
    });

    it("returns false for a future time outside opening hours (after close)", () => {
      const d = makeFutureWeekdayDate();
      d.setDate(d.getDate() + 1);
      while (d.getDay() === 0 || d.getDay() === 6) {
        d.setDate(d.getDate() + 1);
      }
      d.setHours(23, 0, 0, 0); // 23:00 — after 22:00 close
      expect(isScheduledTimeValid(weekdayHours, d.toISOString())).toBe(false);
    });

    it("returns false for a future time on a day with no opening hours (weekend)", () => {
      const d = new Date();
      // Find next Saturday
      d.setDate(d.getDate() + ((6 - d.getDay() + 7) % 7 || 7));
      d.setHours(14, 0, 0, 0);
      // weekdayHours has no Saturday entry
      expect(isScheduledTimeValid(weekdayHours, d.toISOString())).toBe(false);
    });

    it("returns true when no opening hours are configured (always open)", () => {
      const future = new Date(Date.now() + 3600000).toISOString();
      expect(isScheduledTimeValid([], future)).toBe(true);
    });

    it("returns true when opening hours are null (always open)", () => {
      const future = new Date(Date.now() + 3600000).toISOString();
      expect(isScheduledTimeValid(null, future)).toBe(true);
    });
  });
  ```

- [ ] Step 2: Run the tests to confirm all pass:
  ```bash
  cd api && npm test -- tests/controllers/order-timeslot.spec.js
  ```
  Expected output: `7 tests passed`.

---

## Chunk 4: Frontend Types & API Client

### Task 6: Update TypeScript Types and API Client
**Files:**
- Modify: `frontend/types/api.ts`
- Modify: `frontend/lib/api.ts`

- [ ] Step 1: In `frontend/types/api.ts`, add `scheduledFor` to the `Order` type:
  ```ts
  export type Order = {
    id: string;
    restaurantId: string;
    fullName: string | null;
    phone: string | null;
    email: string | null;
    status: OrderStatus;
    totalPrice: string;
    stripePaymentIntentId: string | null;
    scheduledFor: string | null;
    createdAt: string;
    updatedAt: string;
    orderProducts: OrderProduct[];
  };
  ```

- [ ] Step 2: In `frontend/lib/api.ts`, add `scheduledFor` to the `createCheckoutSession` payload type:
  ```ts
  export async function createCheckoutSession(
    payload: {
      fullName?: string;
      phone?: string;
      email?: string;
      items: CheckoutItem[];
      scheduledFor?: string;
    },
    restaurantId?: string,
  )
  ```

- [ ] Step 3: In `frontend/lib/api.ts`, add `scheduledFor` to the `createOrder` payload type:
  ```ts
  export async function createOrder(payload: {
    fullName?: string;
    phone?: string;
    email?: string;
    items: CheckoutItem[];
    promoCode?: string;
    scheduledFor?: string;
  })
  ```

---

## Chunk 5: Frontend UI

### Task 7: Checkout Modal — Order Type Toggle + Time Slot Picker
**Files:**
- Modify: `frontend/components/cart/checkout-modal.tsx`

- [ ] Step 1: Add `OpeningHour` to the imports at the top of `checkout-modal.tsx`:
  ```ts
  import type { OpeningHour } from "@/types/api";
  ```

- [ ] Step 2: Add a `generateTimeSlots` helper function outside the component (below the imports):
  ```ts
  /**
   * Generate 15-minute time slots for today between `openTime` and `closeTime`,
   * starting no earlier than `minFrom` (Date, default = now + 30 min).
   * Returns ISO strings.
   */
  function generateTimeSlots(
    openTime: string,
    closeTime: string,
    minFrom: Date = new Date(Date.now() + 30 * 60 * 1000),
  ): string[] {
    const slots: string[] = [];
    const today = new Date();
    today.setSeconds(0, 0);

    const [openH, openM] = openTime.split(":").map(Number);
    const [closeH, closeM] = closeTime.split(":").map(Number);

    const start = new Date(today);
    start.setHours(openH, openM, 0, 0);

    const end = new Date(today);
    end.setHours(closeH, closeM, 0, 0);

    // Advance start to the next 15-minute boundary after minFrom
    const cursor = new Date(Math.max(start.getTime(), minFrom.getTime()));
    const rem = cursor.getMinutes() % 15;
    if (rem !== 0) cursor.setMinutes(cursor.getMinutes() + (15 - rem), 0, 0);

    while (cursor < end) {
      slots.push(cursor.toISOString());
      cursor.setMinutes(cursor.getMinutes() + 15);
    }
    return slots;
  }

  function formatSlotLabel(iso: string): string {
    const d = new Date(iso);
    return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
  }
  ```

- [ ] Step 3: Add `orderType` and `scheduledFor` to the form state, and add an `openingHours` state with a `useEffect` to fetch them via `getOpeningHours`:
  ```ts
  import { getOpeningHours } from "@/lib/api";
  // ...
  const [form, setForm] = useState({
    fullName: "",
    phone: "",
    email: "",
    promoCode: "",
    orderType: "asap" as "asap" | "scheduled",
    scheduledFor: "",
  });
  const [openingHours, setOpeningHours] = useState<OpeningHour[]>([]);

  useEffect(() => {
    if (open) {
      getOpeningHours().then(setOpeningHours).catch(() => {});
    }
  }, [open]);
  ```

  Note: `getOpeningHours()` in `frontend/lib/api.ts` uses `RESTAURANT_ID`. When the checkout modal is rendered within the store context, `setRestaurantId` will have been called by the page. This is the existing pattern used by `createOrder`.

- [ ] Step 4: Derive the available time slots from today's opening hours entry:
  ```ts
  const todaySlots = useMemo(() => {
    const dayOfWeek = new Date().getDay();
    const todayHours = openingHours.find((h) => h.dayOfWeek === dayOfWeek);
    if (!todayHours) return [];
    return generateTimeSlots(todayHours.openTime, todayHours.closeTime);
  }, [openingHours]);
  ```
  Add `useMemo` to the React imports.

- [ ] Step 5: In `handleSubmit`, pass `scheduledFor` conditionally:
  ```ts
  const result = await createCheckoutSession(
    {
      fullName: form.fullName || undefined,
      phone: form.phone || undefined,
      email: form.email || undefined,
      items,
      scheduledFor: form.orderType === "scheduled" && form.scheduledFor
        ? form.scheduledFor
        : undefined,
    },
    restaurantCtx?.restaurant.id,
  );
  ```

- [ ] Step 6: Add the order-type toggle and time-slot picker to the JSX, just before the existing form fields (after `<form onSubmit={handleSubmit} ...>`):
  ```tsx
  {/* Order type toggle */}
  <div className="space-y-2">
    <Label>Heure de commande</Label>
    <div className="flex gap-2">
      <button
        type="button"
        onClick={() => setForm((prev) => ({ ...prev, orderType: "asap", scheduledFor: "" }))}
        className={`flex-1 py-2 px-3 rounded-md border text-sm font-medium transition-colors ${
          form.orderType === "asap"
            ? "bg-primary text-primary-foreground border-primary"
            : "border-black/15 hover:bg-gray-50"
        }`}
      >
        Au plus vite
      </button>
      <button
        type="button"
        onClick={() =>
          setForm((prev) => ({
            ...prev,
            orderType: "scheduled",
            scheduledFor: todaySlots[0] ?? "",
          }))
        }
        disabled={todaySlots.length === 0}
        className={`flex-1 py-2 px-3 rounded-md border text-sm font-medium transition-colors disabled:opacity-40 disabled:cursor-not-allowed ${
          form.orderType === "scheduled"
            ? "bg-primary text-primary-foreground border-primary"
            : "border-black/15 hover:bg-gray-50"
        }`}
      >
        Prévu pour…
      </button>
    </div>
    {form.orderType === "scheduled" && todaySlots.length > 0 && (
      <select
        value={form.scheduledFor}
        onChange={(e) => setForm((prev) => ({ ...prev, scheduledFor: e.target.value }))}
        className="w-full text-sm border border-black/15 rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary"
      >
        {todaySlots.map((iso) => (
          <option key={iso} value={iso}>
            {formatSlotLabel(iso)}
          </option>
        ))}
      </select>
    )}
  </div>
  ```

### Task 8: Admin Orders Display — scheduledFor Badge
**Files:**
- Modify: `frontend/components/admin/orders-tab.tsx`

- [ ] Step 1: In `frontend/components/admin/orders-tab.tsx`, inside the `OrderCard` component, add a "Prévu pour" badge below the `<p className="text-xs text-[#676767]">` timestamp line (the `dayjs(order.createdAt).fromNow()` line):
  ```tsx
  {order.scheduledFor && (
    <span className="inline-flex items-center gap-1 text-xs font-medium text-amber-700 bg-amber-50 border border-amber-200 rounded-full px-2 py-0.5">
      Prévu pour {new Date(order.scheduledFor).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })}
    </span>
  )}
  ```

---

## Verification Checklist

- [ ] `cd api && npm test` — all tests pass including the new `order-timeslot.spec.js`
- [ ] Manual test ASAP path: submit checkout without selecting a slot → `scheduledFor` is `null` in DB
- [ ] Manual test scheduled path: select "Prévu pour…", pick a slot → `scheduledFor` is saved in DB as the correct timestamp
- [ ] Manual test past time rejection: pass a past ISO string directly via curl to `POST /checkout/create-session` → 400 `"Scheduled time is outside opening hours or in the past"`
- [ ] Admin orders page: order with `scheduledFor` shows amber "Prévu pour HH:MM" badge; ASAP order shows no badge
