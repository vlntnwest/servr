# Admin Restaurant Refactor — `/admin/[restaurantId]` Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan.

**Goal:** Move the admin dashboard from `/admin` to `/admin/[restaurantId]` so multi-restaurant users can manage each restaurant independently via URL.
**Architecture:** The existing `/admin` page becomes a redirect that resolves the user's first restaurant; a new `/admin/[restaurantId]` page is the real dashboard, validating membership before rendering and exposing a restaurant-selector dropdown when the user belongs to multiple restaurants. No backend changes are needed — the API already uses `restaurantId` from URL params, and `setRestaurantId()` in `lib/api.ts` remains the runtime wiring point.
**Tech Stack:** Next.js 15 (App Router, client components), React 19, TypeScript, Supabase Auth, Tailwind CSS, `lucide-react`, shadcn/ui (`Tabs`, `Select`).

---

## File Map

| Action | Path |
|--------|------|
| MODIFY | `frontend/app/admin/page.tsx` |
| CREATE | `frontend/app/admin/[restaurantId]/page.tsx` |

---

## Chunk 1: Redirect page at `/admin`

### Task 1: Replace `/admin/page.tsx` with redirect logic

**Files:**
- [ ] `frontend/app/admin/page.tsx`

**Step 1 — Overwrite the file with the redirect component:**

```tsx
"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";

export default function AdminRedirectPage() {
  const router = useRouter();
  const supabase = createClient();
  const [noRestaurant, setNoRestaurant] = useState(false);

  useEffect(() => {
    const init = async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session) {
        router.replace("/login");
        return;
      }

      const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/api/v1/user/me`,
        { headers: { Authorization: `Bearer ${session.access_token}` } },
      );

      if (res.ok) {
        const { data } = await res.json();
        const firstId = data.restaurantMembers?.[0]?.restaurantId;
        if (firstId) {
          router.replace(`/admin/${firstId}`);
          return;
        }
      }

      setNoRestaurant(true);
    };

    init();
  }, [supabase, router]);

  if (noRestaurant) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-[#676767]">Aucun restaurant trouvé.</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center">
      <Loader2 className="w-8 h-8 animate-spin text-primary" />
    </div>
  );
}
```

---

## Chunk 2: New admin page at `/admin/[restaurantId]`

### Task 2: Create the `[restaurantId]` directory and page file

**Files:**
- [ ] `frontend/app/admin/[restaurantId]/page.tsx` (new file — create directory first)

**Step 1 — Create `frontend/app/admin/[restaurantId]/page.tsx`:**

```tsx
"use client";

import { useEffect, useState, use } from "react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { setRestaurantId } from "@/lib/api";
import OrdersTab from "@/components/admin/orders-tab";
import StatsTab from "@/components/admin/stats-tab";
import MembersTab from "@/components/admin/members-tab";
import OpeningHoursTab from "@/components/admin/opening-hours-tab";
import ProductsTab from "@/components/admin/products-tab";
import Image from "next/image";
import { LogOut, Loader2, ChevronDown } from "lucide-react";
import type { User } from "@supabase/supabase-js";

interface RestaurantInfo {
  id: string;
  name: string;
}

// ── Restaurant selector ───────────────────────────────────────────────────────

function RestaurantSelector({
  restaurants,
  currentId,
  onSelect,
}: {
  restaurants: RestaurantInfo[];
  currentId: string;
  onSelect: (id: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const current = restaurants.find((r) => r.id === currentId);

  return (
    <div className="relative">
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-1 text-sm font-medium text-[#676767] hover:text-black transition-colors px-2 py-1 rounded hover:bg-black/5"
        aria-haspopup="listbox"
        aria-expanded={open}
      >
        {current?.name ?? currentId}
        <ChevronDown className="w-4 h-4" />
      </button>

      {open && (
        <ul
          role="listbox"
          className="absolute right-0 mt-1 min-w-[180px] bg-white border border-black/10 rounded-lg shadow-lg z-50 py-1"
        >
          {restaurants.map((r) => (
            <li key={r.id}>
              <button
                role="option"
                aria-selected={r.id === currentId}
                onClick={() => {
                  setOpen(false);
                  if (r.id !== currentId) onSelect(r.id);
                }}
                className={`w-full text-left px-4 py-2 text-sm hover:bg-black/5 transition-colors ${
                  r.id === currentId ? "font-semibold text-black" : "text-[#676767]"
                }`}
              >
                {r.name}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function AdminRestaurantPage({
  params,
}: {
  params: Promise<{ restaurantId: string }>;
}) {
  const { restaurantId } = use(params);
  const router = useRouter();
  const supabase = createClient();

  const [user, setUser] = useState<User | null>(null);
  const [restaurants, setRestaurants] = useState<RestaurantInfo[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const init = async () => {
      // 1. Auth guard
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session) {
        router.replace("/login");
        return;
      }

      setUser(session.user);
      const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "";

      // 2. Fetch user membership list
      const meRes = await fetch(`${API_URL}/api/v1/user/me`, {
        headers: { Authorization: `Bearer ${session.access_token}` },
      });

      if (!meRes.ok) {
        router.replace("/admin");
        return;
      }

      const { data: meData } = await meRes.json();
      const memberIds: string[] =
        meData.restaurantMembers?.map(
          (m: { restaurantId: string }) => m.restaurantId,
        ) ?? [];

      // 3. Validate that the user is a member of the requested restaurantId
      if (!memberIds.includes(restaurantId)) {
        router.replace("/admin");
        return;
      }

      // 4. Wire up the global RESTAURANT_ID used by lib/api.ts
      setRestaurantId(restaurantId);

      // 5. Fetch restaurant names concurrently (for selector)
      const restaurantDetails = await Promise.all(
        memberIds.map(async (id) => {
          const res = await fetch(`${API_URL}/api/v1/restaurants/${id}`, {
            headers: { Authorization: `Bearer ${session.access_token}` },
          });
          const json = await res.json();
          return (json.data as RestaurantInfo) ?? { id, name: id };
        }),
      );

      setRestaurants(restaurantDetails);
      setLoading(false);
    };

    init();
  }, [restaurantId, supabase, router]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      {/* Admin header */}
      <header className="sticky top-0 z-40 bg-white border-b border-black/8">
        <div className="flex items-center h-[65px] px-4 max-w-screen-xl mx-auto">
          <div className="flex-1">
            <Image
              src="https://g10afdaataaj4tkl.public.blob.vercel-storage.com/img/1Fichier-21.svg"
              alt="Pokey Bar"
              width={80}
              height={32}
              className="object-contain"
            />
          </div>

          {/* Restaurant selector — only shown when user has >1 restaurant */}
          {restaurants.length > 1 && (
            <div className="mr-4">
              <RestaurantSelector
                restaurants={restaurants}
                currentId={restaurantId}
                onSelect={(id) => router.push(`/admin/${id}`)}
              />
            </div>
          )}

          <span className="text-sm text-[#676767] mr-3 hidden sm:block">
            {user?.email}
          </span>
          <button
            className="p-2 hover:bg-black/5 rounded-full transition-colors"
            onClick={() =>
              supabase.auth.signOut().then(() => router.push("/login"))
            }
            aria-label="Se déconnecter"
          >
            <LogOut className="w-5 h-5 text-[#676767]" />
          </button>
        </div>
      </header>

      <main className="max-w-screen-xl mx-auto px-4 py-6">
        <h1 className="text-2xl font-bold mb-6">Tableau de bord</h1>

        <Tabs defaultValue="orders">
          <TabsList className="mb-0">
            <TabsTrigger value="orders">Commandes</TabsTrigger>
            <TabsTrigger value="stats">Statistiques</TabsTrigger>
            <TabsTrigger value="products">Produits</TabsTrigger>
            <TabsTrigger value="members">Membres</TabsTrigger>
            <TabsTrigger value="hours">Horaires</TabsTrigger>
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
        </Tabs>
      </main>
    </div>
  );
}
```

---

## Chunk 3: Manual verification

### Task 3: Smoke-test the new routing

No automated frontend tests. Verify manually:

**Step 1 — Redirect from `/admin`:**
- Visit `http://localhost:3000/admin` while logged in.
- Expected: instant redirect to `/admin/<yourFirstRestaurantId>` (browser URL changes).

**Step 2 — Unauthorised restaurant ID:**
- Visit `/admin/00000000-0000-0000-0000-000000000000` (an ID you are not a member of).
- Expected: redirect back to `/admin`, which then redirects to your actual restaurant.

**Step 3 — Logged-out guard:**
- Sign out, then visit `/admin` or `/admin/<anyId>`.
- Expected: redirect to `/login`.

**Step 4 — Restaurant selector (multi-restaurant accounts only):**
- Log in as a user who belongs to ≥ 2 restaurants.
- Visit `/admin/<firstId>` — header should show a restaurant name with a chevron dropdown.
- Select a different restaurant → URL changes to `/admin/<secondId>`, dashboard re-renders for that restaurant.
- Single-restaurant accounts should see **no dropdown** in the header.

**Step 5 — Tab functionality unchanged:**
- On `/admin/<restaurantId>`, switch between Commandes / Statistiques / Produits / Membres / Horaires.
- All tabs should load data for the restaurant in the URL (confirm via API calls in browser devtools that requests use the correct restaurantId).

---

## Notes

- `use(params)` is the Next.js 15 / React 19 idiom for unwrapping a `Promise`-typed `params` object in a client component. Do **not** use `await params` outside an async function.
- `setRestaurantId()` mutates a module-level variable in `lib/api.ts`. This means switching restaurants via the selector (navigation to a new URL) causes a full re-mount of the page component, which re-runs `init()` and calls `setRestaurantId()` with the new ID before any tab renders. This is intentional and correct.
- The `GET /api/v1/restaurants/:restaurantId` endpoint requires an `Authorization` header when called from the admin context (member-only resource). The fetch in the restaurant-name resolution step includes the session token for this reason.
- The `/api/v1/user/me` path used in `admin/[restaurantId]/page.tsx` is `/api/v1/user/me` (matches the versioned API). Note: the old `admin/page.tsx` mistakenly used `/api/user/me` (no `v1`) — this refactor corrects that to `/api/v1/user/me` consistently.
