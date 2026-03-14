# Restaurant Onboarding + Stripe Connect Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan.

**Goal:** Allow restaurant owners to connect a Stripe Express account so their restaurant can accept card payments through the platform.
**Architecture:** Two new backend routes (`POST /stripe/onboard`, `GET /stripe/status`) sit behind `isOwner` middleware and manage Stripe Express account creation and account-link generation; the frontend adds a "Paramètres" tab in the admin dashboard with dedicated return/refresh pages that handle the Stripe OAuth redirect loop.
**Tech Stack:** Node.js/Express (CommonJS), Stripe Node SDK, Prisma v7, Next.js 15, TypeScript, Tailwind CSS / shadcn-ui.

---

## File Map

### New files
- `api/controllers/stripe.controllers.js` — `initiateStripeOnboarding`, `getStripeStatus`
- `api/tests/stripe.spec.js` — unit tests for both controllers
- `api/tests/__mocks__/stripe.mock.js` — Stripe constructor mock for test setup
- `frontend/app/admin/stripe/return/page.tsx` — post-Stripe-redirect status page
- `frontend/app/admin/stripe/refresh/page.tsx` — auto-refresh page that re-triggers onboarding
- `frontend/components/admin/settings-tab.tsx` — Paramètres tab component

### Modified files
- `api/routes/restaurant.routes.js` — register the two new Stripe routes
- `api/controllers/checkout.controllers.js` — add `account.updated` handling in `handleWebhook`
- `api/tests/setup.js` — add `stripe` entry to `mockMap`
- `frontend/lib/api.ts` — add `initiateStripeOnboarding`, `getStripeStatus`
- `frontend/app/admin/page.tsx` — add "Paramètres" tab

---

## Chunk 1: Backend — Stripe Connect API

### Step 1.1 — Create the Stripe mock for tests

Create `api/tests/__mocks__/stripe.mock.js`:

```js
// Stripe constructor mock — returns globalThis.__mockStripe
if (!globalThis.__mockStripe) {
  globalThis.__mockStripe = {
    accounts: {
      create: vi.fn(),
      retrieve: vi.fn(),
    },
    accountLinks: {
      create: vi.fn(),
    },
  };
}

// Export a constructor that always returns the shared mock instance
module.exports = function StripeConstructorMock(_key) {
  return globalThis.__mockStripe;
};
```

### Step 1.2 — Register the Stripe mock in test setup

Edit `api/tests/setup.js`. Add one entry to `mockMap` so every `require("stripe")` in controllers resolves to the mock during tests:

```js
// Existing mockMap entries:
//   "lib/prisma": resolve(__dirname, "__mocks__/prisma.mock.js"),
//   "lib/supabase": resolve(__dirname, "__mocks__/supabase.mock.js"),
//   [loggerPath]: resolve(__dirname, "__mocks__/logger.mock.js"),

// ADD this line inside the mockMap object:
"node_modules/stripe": resolve(__dirname, "__mocks__/stripe.mock.js"),
```

The full updated `mockMap` block in `setup.js`:

```js
const mockMap = {
  "lib/prisma": resolve(__dirname, "__mocks__/prisma.mock.js"),
  "lib/supabase": resolve(__dirname, "__mocks__/supabase.mock.js"),
  [loggerPath]: resolve(__dirname, "__mocks__/logger.mock.js"),
  "node_modules/stripe": resolve(__dirname, "__mocks__/stripe.mock.js"),
};
```

### Step 1.3 — Create `api/controllers/stripe.controllers.js`

```js
const Stripe = require("stripe");
const prisma = require("../lib/prisma");
const logger = require("../logger");

const stripe = process.env.STRIPE_SECRET_KEY
  ? new Stripe(process.env.STRIPE_SECRET_KEY)
  : null;

module.exports.initiateStripeOnboarding = async (req, res, next) => {
  const { restaurantId } = req.params;

  try {
    if (!stripe) {
      return res.status(503).json({ error: "Stripe is not configured" });
    }

    const restaurant = await prisma.restaurant.findUnique({
      where: { id: restaurantId },
    });

    if (!restaurant) {
      return res.status(404).json({ error: "Restaurant not found" });
    }

    // If already has an account, check whether charges are already enabled
    if (restaurant.stripeAccountId) {
      const existing = await stripe.accounts.retrieve(restaurant.stripeAccountId);
      if (existing.charges_enabled) {
        return res
          .status(409)
          .json({ error: "Stripe account already active with charges enabled" });
      }
    }

    let stripeAccountId = restaurant.stripeAccountId;

    // Create a new Express account if none exists yet
    if (!stripeAccountId) {
      const account = await stripe.accounts.create({
        type: "express",
        email: restaurant.email || undefined,
      });
      stripeAccountId = account.id;
      await prisma.restaurant.update({
        where: { id: restaurantId },
        data: { stripeAccountId },
      });
      logger.info({ restaurantId, stripeAccountId }, "Stripe Express account created");
    }

    const link = await stripe.accountLinks.create({
      account: stripeAccountId,
      refresh_url: `${process.env.CLIENT_URL}/admin/stripe/refresh`,
      return_url: `${process.env.CLIENT_URL}/admin/stripe/return`,
      type: "account_onboarding",
    });

    logger.info({ restaurantId, stripeAccountId }, "Stripe account link created");
    return res.status(200).json({ data: { url: link.url } });
  } catch (error) {
    next(error);
  }
};

module.exports.getStripeStatus = async (req, res, next) => {
  const { restaurantId } = req.params;

  try {
    const restaurant = await prisma.restaurant.findUnique({
      where: { id: restaurantId },
    });

    if (!restaurant) {
      return res.status(404).json({ error: "Restaurant not found" });
    }

    if (!restaurant.stripeAccountId) {
      return res.status(200).json({ data: { connected: false } });
    }

    if (!stripe) {
      return res.status(503).json({ error: "Stripe is not configured" });
    }

    const account = await stripe.accounts.retrieve(restaurant.stripeAccountId);

    logger.info(
      {
        restaurantId,
        stripeAccountId: restaurant.stripeAccountId,
        chargesEnabled: account.charges_enabled,
      },
      "Stripe status retrieved",
    );

    return res.status(200).json({
      data: {
        connected: true,
        chargesEnabled: account.charges_enabled,
        detailsSubmitted: account.details_submitted,
      },
    });
  } catch (error) {
    next(error);
  }
};
```

### Step 1.4 — Register routes in `api/routes/restaurant.routes.js`

Add the two Stripe routes. They require `checkAuth` + `isOwner`:

```js
// At the top, add:
const stripeControllers = require("../controllers/stripe.controllers");

// Before module.exports, add:
router.post(
  "/:restaurantId/stripe/onboard",
  checkAuth,
  isOwner,
  stripeControllers.initiateStripeOnboarding,
);
router.get(
  "/:restaurantId/stripe/status",
  checkAuth,
  isOwner,
  stripeControllers.getStripeStatus,
);
```

Full updated `api/routes/restaurant.routes.js` for reference:

```js
const express = require("express");
const router = express.Router();
const restaurantControllers = require("../controllers/restaurant.controllers");
const stripeControllers = require("../controllers/stripe.controllers");
const checkAuth = require("../middleware/auth.middleware");
const { isAdmin, isOwner } = require("../middleware/role.middleware");
const { validate } = require("../middleware/validate.middleware");
const { restaurantSchema } = require("../validators/schemas");

// Public — get restaurant by slug (must be before /:restaurantId)
router.get("/by-slug/:slug", restaurantControllers.getRestaurantBySlug);

// Public — get restaurant info
router.get("/:restaurantId", restaurantControllers.getRestaurant);

router.post(
  "/",
  checkAuth,
  validate({ body: restaurantSchema }),
  restaurantControllers.createRestaurant,
);
router.put(
  "/:restaurantId",
  checkAuth,
  isAdmin,
  validate({ body: restaurantSchema.partial() }),
  restaurantControllers.updateRestaurant,
);
router.delete(
  "/:restaurantId",
  checkAuth,
  isOwner,
  restaurantControllers.deleteRestaurant,
);

// Stripe Connect
router.post(
  "/:restaurantId/stripe/onboard",
  checkAuth,
  isOwner,
  stripeControllers.initiateStripeOnboarding,
);
router.get(
  "/:restaurantId/stripe/status",
  checkAuth,
  isOwner,
  stripeControllers.getStripeStatus,
);

module.exports = router;
```

### Step 1.5 — Add `account.updated` handling in the webhook

In `api/controllers/checkout.controllers.js`, inside `handleWebhook`, after the existing `checkout.session.completed` block and before the final `res.status(200).json({ received: true })`, add:

```js
  if (event.type === "account.updated") {
    const account = event.data.object;
    if (account.charges_enabled) {
      logger.info(
        { stripeAccountId: account.id },
        "Stripe Connect account charges_enabled",
      );
    }
  }
```

> **Note:** In the Stripe dashboard, the webhook endpoint must be configured as a **Connect webhook** (not just a standard account webhook) to receive `account.updated` events for connected accounts.

### Step 1.6 — Write unit tests `api/tests/stripe.spec.js`

```js
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
```

Run tests to verify:
```bash
cd /Users/valentinwestermeyer/Documents/Dev/servr/api && npm test -- stripe
```

---

## Chunk 2: Frontend — Onboarding Pages and Settings Tab

### Step 2.1 — Add API functions to `frontend/lib/api.ts`

Append to the end of `frontend/lib/api.ts`:

```ts
// ── Stripe Connect (OWNER) ────────────────────────────────────────────────────

export async function initiateStripeOnboarding(): Promise<{
  data?: { url: string };
  error?: string;
}> {
  return apiFetch<{ url: string }>(
    `/restaurants/${RESTAURANT_ID}/stripe/onboard`,
    { method: "POST" },
  );
}

export async function getStripeStatus(): Promise<{
  data?: {
    connected: boolean;
    chargesEnabled?: boolean;
    detailsSubmitted?: boolean;
  };
  error?: string;
}> {
  return apiFetch<{
    connected: boolean;
    chargesEnabled?: boolean;
    detailsSubmitted?: boolean;
  }>(`/restaurants/${RESTAURANT_ID}/stripe/status`);
}
```

### Step 2.2 — Create the Settings tab component

Create `frontend/components/admin/settings-tab.tsx`:

```tsx
"use client";

import { useEffect, useState } from "react";
import { getStripeStatus, initiateStripeOnboarding } from "@/lib/api";
import { CheckCircle, Clock, AlertCircle, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";

type StripeStatus = {
  connected: boolean;
  chargesEnabled?: boolean;
  detailsSubmitted?: boolean;
};

export default function SettingsTab() {
  const [status, setStatus] = useState<StripeStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [connecting, setConnecting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchStatus = async () => {
      setLoading(true);
      const result = await getStripeStatus();
      if ("data" in result && result.data) {
        setStatus(result.data);
      } else if ("error" in result) {
        setError(result.error ?? "Erreur lors de la récupération du statut");
      }
      setLoading(false);
    };
    fetchStatus();
  }, []);

  const handleConnect = async () => {
    setConnecting(true);
    setError(null);
    const result = await initiateStripeOnboarding();
    if ("data" in result && result.data?.url) {
      window.location.href = result.data.url;
    } else {
      setError(
        "error" in result
          ? result.error ?? "Erreur lors de la connexion Stripe"
          : "Erreur lors de la connexion Stripe",
      );
      setConnecting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="py-6 max-w-xl">
      <h2 className="text-lg font-semibold mb-1">Paiements par carte</h2>
      <p className="text-sm text-muted-foreground mb-6">
        Connectez un compte Stripe pour accepter les paiements par carte bancaire.
      </p>

      {error && (
        <div className="flex items-center gap-2 text-destructive text-sm mb-4">
          <AlertCircle className="w-4 h-4 shrink-0" />
          {error}
        </div>
      )}

      {!status?.connected && (
        <Button onClick={handleConnect} disabled={connecting}>
          {connecting && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
          Connecter Stripe
        </Button>
      )}

      {status?.connected && status.chargesEnabled && (
        <div className="flex items-center gap-2 text-green-700 bg-green-50 border border-green-200 rounded-lg px-4 py-3">
          <CheckCircle className="w-5 h-5 shrink-0" />
          <span className="text-sm font-medium">Paiements par carte activés</span>
        </div>
      )}

      {status?.connected && !status.chargesEnabled && (
        <div className="space-y-4">
          <div className="flex items-center gap-2 text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-4 py-3">
            <Clock className="w-5 h-5 shrink-0" />
            <span className="text-sm font-medium">
              En attente de validation Stripe
            </span>
          </div>
          <Button variant="outline" onClick={handleConnect} disabled={connecting}>
            {connecting && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
            Continuer la configuration
          </Button>
        </div>
      )}
    </div>
  );
}
```

### Step 2.3 — Create the Stripe return page

Create `frontend/app/admin/stripe/return/page.tsx`:

```tsx
"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { getStripeStatus } from "@/lib/api";
import { createClient } from "@/lib/supabase/client";
import { setRestaurantId } from "@/lib/api";
import { CheckCircle, Clock, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function StripeReturnPage() {
  const router = useRouter();
  const [chargesEnabled, setChargesEnabled] = useState<boolean | null>(null);
  const [loading, setLoading] = useState(true);
  const supabase = createClient();

  useEffect(() => {
    const init = async () => {
      // Restore RESTAURANT_ID from session (same pattern as admin page)
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!session) {
        router.push("/login");
        return;
      }
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/api/user/me`,
        { headers: { Authorization: `Bearer ${session.access_token}` } },
      );
      if (res.ok) {
        const { data } = await res.json();
        const restaurantId = data.restaurantMembers?.[0]?.restaurantId;
        if (restaurantId) setRestaurantId(restaurantId);
      }

      const result = await getStripeStatus();
      if ("data" in result && result.data) {
        setChargesEnabled(result.data.chargesEnabled ?? false);
      }
      setLoading(false);
    };
    init();
  }, [supabase, router]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <div className="max-w-sm w-full text-center space-y-6">
        {chargesEnabled ? (
          <>
            <CheckCircle className="w-12 h-12 text-green-600 mx-auto" />
            <h1 className="text-xl font-bold">Stripe configuré avec succès</h1>
            <p className="text-sm text-muted-foreground">
              Votre restaurant peut maintenant accepter les paiements par carte.
            </p>
          </>
        ) : (
          <>
            <Clock className="w-12 h-12 text-amber-500 mx-auto" />
            <h1 className="text-xl font-bold">Configuration en cours...</h1>
            <p className="text-sm text-muted-foreground">
              Stripe est en train de vérifier vos informations. Cela peut prendre
              quelques minutes.
            </p>
          </>
        )}
        <Button onClick={() => router.push("/admin")}>
          Retour au tableau de bord
        </Button>
      </div>
    </div>
  );
}
```

### Step 2.4 — Create the Stripe refresh page

Create `frontend/app/admin/stripe/refresh/page.tsx`:

```tsx
"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { initiateStripeOnboarding } from "@/lib/api";
import { createClient } from "@/lib/supabase/client";
import { setRestaurantId } from "@/lib/api";
import { Loader2 } from "lucide-react";

export default function StripeRefreshPage() {
  const router = useRouter();
  const supabase = createClient();

  useEffect(() => {
    const refresh = async () => {
      // Restore RESTAURANT_ID from session
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!session) {
        router.push("/login");
        return;
      }
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/api/user/me`,
        { headers: { Authorization: `Bearer ${session.access_token}` } },
      );
      if (res.ok) {
        const { data } = await res.json();
        const restaurantId = data.restaurantMembers?.[0]?.restaurantId;
        if (restaurantId) setRestaurantId(restaurantId);
      }

      const result = await initiateStripeOnboarding();
      if ("data" in result && result.data?.url) {
        window.location.href = result.data.url;
      } else {
        // Fallback: go to admin settings
        router.push("/admin");
      }
    };
    refresh();
  }, [supabase, router]);

  return (
    <div className="min-h-screen flex items-center justify-center">
      <Loader2 className="w-8 h-8 animate-spin text-primary" />
    </div>
  );
}
```

### Step 2.5 — Add the "Paramètres" tab to the admin page

Edit `frontend/app/admin/page.tsx`:

1. Add the import at the top with the other tab imports:
```tsx
import SettingsTab from "@/components/admin/settings-tab";
```

2. Add the tab trigger inside `<TabsList>`:
```tsx
<TabsTrigger value="settings">Paramètres</TabsTrigger>
```

3. Add the tab content after the existing `<TabsContent>` blocks:
```tsx
<TabsContent value="settings">
  <SettingsTab />
</TabsContent>
```

Full updated `<Tabs>` block in `frontend/app/admin/page.tsx`:

```tsx
<Tabs defaultValue="orders">
  <TabsList className="mb-0">
    <TabsTrigger value="orders">Commandes</TabsTrigger>
    <TabsTrigger value="stats">Statistiques</TabsTrigger>
    <TabsTrigger value="products">Produits</TabsTrigger>
    <TabsTrigger value="members">Membres</TabsTrigger>
    <TabsTrigger value="hours">Horaires</TabsTrigger>
    <TabsTrigger value="settings">Paramètres</TabsTrigger>
  </TabsList>

  <TabsContent value="orders">
    <OrdersTab />
  </TabsContent>
  <TabsContent value="stats">
    <StatsTab />
  </TabsContent>
  <TabsContent value="products">
    <ProductsTab />
  </TabsContent>
  <TabsContent value="members">
    <MembersTab />
  </TabsContent>
  <TabsContent value="hours">
    <OpeningHoursTab />
  </TabsContent>
  <TabsContent value="settings">
    <SettingsTab />
  </TabsContent>
</Tabs>
```

---

## Environment variables to add

In both `.env` (API) and Vercel/production env, ensure these are set:

```
STRIPE_SECRET_KEY=sk_live_...          # Already required for checkout
STRIPE_WEBHOOK_SECRET=whsec_...        # Already required for webhook
CLIENT_URL=https://your-domain.com     # Already required for checkout redirect URLs
```

No new env vars are required; all three are already used in the existing codebase.

## Stripe Dashboard configuration

1. In the Stripe Dashboard → Webhooks, ensure the existing webhook endpoint has **"Connect"** events enabled.
2. Add `account.updated` to the list of events for the Connect webhook.
3. For testing, use `stripe listen --forward-connect-to localhost:5001/api/v1/checkout/webhook`.
