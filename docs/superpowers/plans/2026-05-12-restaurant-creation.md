# Restaurant Creation Flow Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Allow a newly registered restaurateur to create their restaurant via `/admin/create` instead of hitting a dead-end on `/admin`.

**Architecture:** Three focused changes — add `createRestaurant()` to the API client, create a new page `/admin/create` with a controlled form, and update `/admin/page.tsx` to redirect to `/admin/create` instead of showing a dead-end message.

**Tech Stack:** Next.js App Router (client components), Vitest, React `useState`, shadcn/ui (`Input`, `Label`, `Button`)

---

## File Map

| File | Action | Responsibility |
|------|--------|----------------|
| `frontend/lib/api.ts` | Modify | Add `createRestaurant()` function |
| `frontend/lib/api.test.ts` | Modify | Add tests for `createRestaurant()` |
| `frontend/app/admin/create/page.tsx` | Create | Restaurant creation form page |
| `frontend/app/admin/page.tsx` | Modify | Replace dead-end with redirect to `/admin/create` |

---

## Task 1 — Add `createRestaurant()` to `lib/api.ts`

**Files:**
- Modify: `frontend/lib/api.ts`
- Modify: `frontend/lib/api.test.ts`

- [ ] **Step 1.1 — Write the failing test**

Open `frontend/lib/api.test.ts`. Add the import at the top and the test suite at the bottom:

```ts
// Add to the import line at the top:
import { getUserMe, createRestaurant } from "./api";
```

```ts
// Add at the bottom of the file:
describe("createRestaurant", () => {
  it("returns restaurant data on success", async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      status: 201,
      json: async () => ({
        data: {
          id: "resto-uuid",
          name: "Le Gourmet",
          slug: "le-gourmet",
          address: "1 rue de la Paix",
          zipCode: "75001",
          city: "Paris",
          phone: "0612345678",
          email: null,
          imageUrl: null,
          stripeAccountId: null,
          preparationLevel: "EASY",
          timezone: "Europe/Paris",
          createdAt: "2026-05-12T00:00:00.000Z",
          updatedAt: "2026-05-12T00:00:00.000Z",
        },
      }),
    });

    const result = await createRestaurant({
      name: "Le Gourmet",
      address: "1 rue de la Paix",
      zipCode: "75001",
      city: "Paris",
      phone: "0612345678",
    });

    expect(result).toEqual({
      data: expect.objectContaining({ id: "resto-uuid", name: "Le Gourmet" }),
    });
    expect(mockFetch).toHaveBeenCalledWith(
      expect.stringContaining("/restaurants/"),
      expect.objectContaining({ method: "POST" }),
    );
  });

  it("returns error on failure", async () => {
    mockFetch.mockResolvedValue({
      ok: false,
      status: 400,
      json: async () => ({ error: "Validation failed" }),
    });

    const result = await createRestaurant({
      name: "",
      address: "1 rue de la Paix",
      zipCode: "75001",
      city: "Paris",
      phone: "0612345678",
    });

    expect(result).toEqual({ error: "Validation failed" });
  });
});
```

- [ ] **Step 1.2 — Run test to verify it fails**

```bash
cd frontend && npx vitest run lib/api.test.ts
```

Expected: FAIL with `createRestaurant is not a function` or similar import error.

- [ ] **Step 1.3 — Implement `createRestaurant()` in `lib/api.ts`**

Add this function after `updateRestaurant` (around line 333):

```ts
export async function createRestaurant(payload: {
  name: string;
  address: string;
  zipCode: string;
  city: string;
  phone: string;
  email?: string;
}): Promise<{ data?: Restaurant; error?: string }> {
  const result = await apiFetch<Restaurant>("/restaurants/", {
    method: "POST",
    body: JSON.stringify(payload),
  });
  return "data" in result ? { data: result.data } : { error: result.error };
}
```

- [ ] **Step 1.4 — Run tests to verify they pass**

```bash
cd frontend && npx vitest run lib/api.test.ts
```

Expected: all tests PASS.

- [ ] **Step 1.5 — Commit**

```bash
git add frontend/lib/api.ts frontend/lib/api.test.ts
git commit -m "feat(frontend): add createRestaurant API function"
```

---

## Task 2 — Create `/admin/create` page

**Files:**
- Create: `frontend/app/admin/create/page.tsx`

- [ ] **Step 2.1 — Create the file**

Create `frontend/app/admin/create/page.tsx` with this content:

```tsx
"use client";

import { useEffect, useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import { createRestaurant } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2 } from "lucide-react";

export default function CreateRestaurantPage() {
  const router = useRouter();
  const supabase = useMemo(() => createClient(), []);

  const [name, setName] = useState("");
  const [address, setAddress] = useState("");
  const [zipCode, setZipCode] = useState("");
  const [city, setCity] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    const guard = async () => {
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
        const firstId = data.restaurants?.[0]?.id;
        if (firstId) {
          router.replace(`/admin/${firstId}`);
          return;
        }
      }

      setChecking(false);
    };

    guard();
  }, [supabase, router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!/^[0-9]{5}$/.test(zipCode)) {
      setError("Le code postal doit contenir exactement 5 chiffres.");
      return;
    }

    setLoading(true);
    const result = await createRestaurant({
      name,
      address,
      zipCode,
      city,
      phone,
      ...(email ? { email } : {}),
    });
    setLoading(false);

    if ("error" in result && result.error) {
      setError(result.error);
      return;
    }

    if (result.data) {
      router.replace(`/admin/${result.data.id}`);
    }
  };

  if (checking) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="w-full max-w-sm">
        <div className="bg-white border border-brand-border rounded-lg p-6">
          <h1 className="text-xl font-bold mb-4">Créer votre restaurant</h1>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="name">Nom du restaurant</Label>
              <Input
                id="name"
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                maxLength={50}
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="address">Adresse</Label>
              <Input
                id="address"
                type="text"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                required
                maxLength={255}
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="zipCode">Code postal</Label>
                <Input
                  id="zipCode"
                  type="text"
                  inputMode="numeric"
                  value={zipCode}
                  onChange={(e) => setZipCode(e.target.value)}
                  required
                  maxLength={5}
                  pattern="[0-9]{5}"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="city">Ville</Label>
                <Input
                  id="city"
                  type="text"
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                  required
                  maxLength={50}
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="phone">Téléphone</Label>
              <Input
                id="phone"
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                required
                placeholder="06 12 34 56 78"
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="email">
                Email{" "}
                <span className="text-muted-foreground font-normal">
                  (optionnel)
                </span>
              </Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                autoComplete="email"
              />
            </div>

            {error && <p className="text-sm text-destructive">{error}</p>}

            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                "Créer le restaurant"
              )}
            </Button>
          </form>
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 2.2 — Verify TypeScript compiles**

```bash
cd frontend && npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 2.3 — Commit**

```bash
git add frontend/app/admin/create/page.tsx
git commit -m "feat(frontend): add /admin/create restaurant creation page"
```

---

## Task 3 — Update `/admin/page.tsx` dead-end

**Files:**
- Modify: `frontend/app/admin/page.tsx`

- [ ] **Step 3.1 — Replace the dead-end with a redirect**

In `frontend/app/admin/page.tsx`, make these changes:

**Remove** the `noRestaurant` state declaration (line 11):
```ts
// Remove this line:
const [noRestaurant, setNoRestaurant] = useState(false);
```

**Replace** `setNoRestaurant(true)` (line 38) with a redirect:
```ts
// Before:
setNoRestaurant(true);

// After:
router.replace("/admin/create");
```

**Remove** the `noRestaurant` conditional block (lines 44–50):
```tsx
// Remove this entire block:
if (noRestaurant) {
  return (
    <div className="min-h-screen flex items-center justify-center">
      <p className="text-muted-foreground">Aucun restaurant trouvé.</p>
    </div>
  );
}
```

The final file should look like:

```tsx
"use client";

import { useEffect, useMemo } from "react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";

export default function AdminRedirectPage() {
  const router = useRouter();
  const supabase = useMemo(() => createClient(), []);

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
        const firstId = data.restaurants?.[0]?.id;
        if (firstId) {
          router.replace(`/admin/${firstId}`);
          return;
        }
      }

      router.replace("/admin/create");
    };

    init();
  }, [supabase, router]);

  return (
    <div className="min-h-screen flex items-center justify-center">
      <Loader2 className="w-8 h-8 animate-spin text-primary" />
    </div>
  );
}
```

- [ ] **Step 3.2 — Verify TypeScript compiles**

```bash
cd frontend && npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 3.3 — Commit**

```bash
git add frontend/app/admin/page.tsx
git commit -m "feat(frontend): redirect to /admin/create when no restaurant found"
```

---

## Task 4 — Smoke test manuel

- [ ] **Step 4.1 — Démarrer le serveur de dev**

```bash
cd frontend && npm run dev
```

- [ ] **Step 4.2 — Tester le flow complet**

1. S'inscrire avec un nouvel email (ou utiliser un compte sans restaurant)
2. Vérifier la redirection automatique vers `/admin/create`
3. Soumettre le formulaire avec des données valides :
   - Nom : "Test Restaurant"
   - Adresse : "1 rue de la Paix"
   - Code postal : "75001"
   - Ville : "Paris"
   - Téléphone : "06 12 34 56 78"
4. Vérifier la redirection vers `/admin/[id]` après création
5. Recharger `/admin` → doit rediriger vers `/admin/[id]` (restaurant existe maintenant)

- [ ] **Step 4.3 — Tester les cas d'erreur**

1. Soumettre avec un code postal invalide (ex : "ABC12") → message "Le code postal doit contenir exactement 5 chiffres."
2. Soumettre avec un téléphone invalide → message d'erreur API affiché sous le formulaire
3. Naviguer manuellement vers `/admin/create` en étant déjà admin d'un restaurant → doit rediriger vers `/admin/[id]`
