# User Role Separation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Distinguer les utilisateurs `CUSTOMER` et `RESTAURATEUR` via un champ `role` en base, protéger les routes `/admin` et séparer les flux d'inscription.

**Architecture:** Ajout d'un enum `UserRole` dans Prisma + champ `role` sur `User`. Le trigger Supabase lit le rôle depuis les métadonnées du signUp. Le backend expose un middleware `isRestaurateur`. Le frontend ajoute une page `/register/restaurateur` et des garde-fous sur les pages `/admin/*`.

**Tech Stack:** Prisma 7 (PostgreSQL), Express.js (CommonJS), Next.js 15, Supabase Auth, Vitest

---

## Fichiers touchés

| Fichier | Action |
|--------|--------|
| `api/prisma/schema.prisma` | Ajout enum `UserRole` + champ `role` sur `User` |
| `api/prisma/migrations/<timestamp>_add_user_role/migration.sql` | Migration générée + trigger SQL ajouté manuellement |
| `api/middleware/role.middleware.js` | Ajout export `isRestaurateur` |
| `api/tests/middleware/role.middleware.spec.js` | Tests `isRestaurateur` |
| `api/routes/restaurant.routes.js` | Ajout `isRestaurateur` sur `POST /` |
| `frontend/app/register/page.tsx` | Fix redirect + passe `role: 'CUSTOMER'` |
| `frontend/app/register/restaurateur/page.tsx` | Nouvelle page, `role: 'RESTAURATEUR'` |
| `frontend/app/admin/page.tsx` | Garde-fou role |
| `frontend/app/admin/create/page.tsx` | Garde-fou role |
| `frontend/app/admin/[restaurantId]/page.tsx` | Garde-fou role |

---

## Task 1 : Schéma Prisma — enum UserRole + champ role

**Files:**
- Modify: `api/prisma/schema.prisma`

- [ ] **Étape 1 : Modifier le schéma**

Ouvrir `api/prisma/schema.prisma`. Ajouter l'enum à la fin du fichier (avant les autres enums) :

```prisma
enum UserRole {
  CUSTOMER
  RESTAURATEUR

  @@map("user_role")
  @@schema("public")
}
```

Puis ajouter le champ `role` sur le modèle `User` (après `pushToken`) :

```prisma
model User {
  id          String     @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
  email       String?    @unique
  fullName    String?    @map("full_name") @db.VarChar(50)
  phone       String?
  createdAt   DateTime?  @default(dbgenerated("(now() AT TIME ZONE 'utc'::text)")) @map("created_at") @db.Timestamptz(6)
  updatedAt   DateTime?  @map("updated_at") @db.Timestamp(6)
  address     String?    @map("address") @db.VarChar(200)
  city        String?    @map("city") @db.VarChar(50)
  zipCode     String?    @map("zip_code") @db.VarChar(5)
  pushToken   String?    @map("push_token")
  role        UserRole   @default(CUSTOMER)
  restaurants Restaurant[]

  @@map("users")
  @@schema("public")
}
```

- [ ] **Étape 2 : Générer la migration sans l'appliquer**

```bash
cd api && npx prisma migrate dev --create-only --name add_user_role
```

Résultat attendu : un dossier `api/prisma/migrations/<timestamp>_add_user_role/` avec `migration.sql`.

- [ ] **Étape 3 : Ouvrir le fichier migration.sql généré et vérifier son contenu**

Il doit contenir :

```sql
-- CreateEnum
CREATE TYPE "public"."user_role" AS ENUM ('CUSTOMER', 'RESTAURATEUR');

-- AlterTable
ALTER TABLE "public"."users" ADD COLUMN "role" "public"."user_role" NOT NULL DEFAULT 'CUSTOMER';
```

- [ ] **Étape 4 : Ajouter la mise à jour du trigger Supabase à la fin du fichier migration.sql**

Ajouter après le contenu existant :

```sql
-- Update Supabase trigger to set role from auth metadata
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  INSERT INTO public.users (id, email, role)
  VALUES (
    new.id,
    new.email,
    COALESCE(new.raw_user_meta_data->>'role', 'CUSTOMER')::public.user_role
  )
  ON CONFLICT (id) DO UPDATE SET
    email = EXCLUDED.email;
  RETURN new;
END;
$$;
```

> **Note :** Si le trigger existant insère d'autres colonnes (ex. `full_name`), les conserver. Vérifier via le dashboard Supabase > Database > Functions > `handle_new_user` avant d'appliquer.

- [ ] **Étape 5 : Appliquer la migration**

```bash
cd api && npx prisma migrate dev
```

Résultat attendu :
```
✔  Your database is now in sync with your schema.
```

- [ ] **Étape 6 : Vérifier que le client Prisma est régénéré**

```bash
cd api && npx prisma generate
```

- [ ] **Étape 7 : Commit**

```bash
git add api/prisma/schema.prisma api/prisma/migrations/
git commit -m "feat(api): add UserRole enum and role field to User model"
```

---

## Task 2 : Middleware `isRestaurateur` + tests

**Files:**
- Modify: `api/middleware/role.middleware.js`
- Modify: `api/tests/middleware/role.middleware.spec.js`

- [ ] **Étape 1 : Écrire le test qui échoue**

Ouvrir `api/tests/middleware/role.middleware.spec.js`. Ajouter à la fin du fichier (après les tests `isRestaurantAdmin` existants) :

```js
const { isRestaurantAdmin, isRestaurateur } = require("../../middleware/role.middleware");

// ... tests existants ...

describe("isRestaurateur", () => {
  test("calls next when user has role RESTAURATEUR", () => {
    const req = { user: { id: "user-1", role: "RESTAURATEUR" } };
    const res = mockRes();
    const next = vi.fn();

    isRestaurateur(req, res, next);

    expect(next).toHaveBeenCalledOnce();
    expect(res.status).not.toHaveBeenCalled();
  });

  test("returns 403 when user has role CUSTOMER", () => {
    const req = { user: { id: "user-2", role: "CUSTOMER" } };
    const res = mockRes();
    const next = vi.fn();

    isRestaurateur(req, res, next);

    expect(next).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(403);
    expect(res.json).toHaveBeenCalledWith({ error: "Access denied" });
  });

  test("returns 403 when user has no role", () => {
    const req = { user: { id: "user-3" } };
    const res = mockRes();
    const next = vi.fn();

    isRestaurateur(req, res, next);

    expect(next).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(403);
  });
});
```

> **Attention :** La ligne `const { isRestaurantAdmin, isRestaurateur } = require(...)` remplace la ligne d'import existante en haut du fichier.

- [ ] **Étape 2 : Lancer les tests pour vérifier qu'ils échouent**

```bash
cd api && npm test tests/middleware/role.middleware.spec.js
```

Résultat attendu : erreur `isRestaurateur is not a function` ou `TypeError`.

- [ ] **Étape 3 : Implémenter `isRestaurateur` dans le middleware**

Ouvrir `api/middleware/role.middleware.js`. Ajouter avant `module.exports` :

```js
const isRestaurateur = (req, res, next) => {
  if (req.user?.role !== "RESTAURATEUR") {
    logger.warn(
      { userId: req.user?.id, role: req.user?.role },
      "Non-restaurateur attempted restricted action",
    );
    return res.status(403).json({ error: "Access denied" });
  }
  next();
};
```

Mettre à jour `module.exports` :

```js
module.exports = { isRestaurantAdmin, isPlatformAdmin, isRestaurateur };
```

- [ ] **Étape 4 : Relancer les tests pour vérifier qu'ils passent**

```bash
cd api && npm test tests/middleware/role.middleware.spec.js
```

Résultat attendu : `3 tests passed`.

- [ ] **Étape 5 : Commit**

```bash
git add api/middleware/role.middleware.js api/tests/middleware/role.middleware.spec.js
git commit -m "feat(api): add isRestaurateur middleware"
```

---

## Task 3 : Protéger `POST /restaurants` avec `isRestaurateur`

**Files:**
- Modify: `api/routes/restaurant.routes.js`

- [ ] **Étape 1 : Mettre à jour l'import du middleware**

Ouvrir `api/routes/restaurant.routes.js`. Modifier la ligne d'import :

```js
const { isRestaurantAdmin, isRestaurateur } = require("../middleware/role.middleware");
```

- [ ] **Étape 2 : Ajouter `isRestaurateur` sur la route POST**

Modifier la route `POST /` :

```js
router.post(
  "/",
  checkAuth,
  isRestaurateur,
  validate({ body: restaurantSchema }),
  restaurantControllers.createRestaurant,
);
```

- [ ] **Étape 3 : Lancer la suite de tests complète**

```bash
cd api && npm test
```

Résultat attendu : tous les tests passent (les tests existants ne testent pas le rôle sur POST, donc rien ne casse).

- [ ] **Étape 4 : Commit**

```bash
git add api/routes/restaurant.routes.js
git commit -m "feat(api): protect POST /restaurants with isRestaurateur middleware"
```

---

## Task 4 : Corriger `/register` (client)

**Files:**
- Modify: `frontend/app/register/page.tsx`

- [ ] **Étape 1 : Remplacer le contenu de la page**

```tsx
"use client";

import { Suspense, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2 } from "lucide-react";
import { isSafeRedirect } from "@/lib/redirectUtils";

function RegisterForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const supabase = createClient();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const redirectTo = searchParams.get("redirect");
  const destination = isSafeRedirect(redirectTo) ? redirectTo : "/";

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { role: "CUSTOMER" } },
    });

    if (error) {
      setError(error.message);
      setLoading(false);
    } else {
      router.replace(destination);
    }
  };

  return (
    <div className="bg-white border border-brand-border rounded-lg p-6">
      <h1 className="text-xl font-bold mb-4">Créer un compte</h1>

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

        {error && <p className="text-sm text-destructive">{error}</p>}

        <Button type="submit" className="w-full" disabled={loading}>
          {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Créer un compte"}
        </Button>
      </form>

      <p className="text-center text-sm text-muted-foreground mt-4">
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
        <Suspense fallback={<div className="bg-white border border-brand-border rounded-lg p-6 h-48" />}>
          <RegisterForm />
        </Suspense>
      </div>
    </div>
  );
}
```

- [ ] **Étape 2 : Commit**

```bash
git add frontend/app/register/page.tsx
git commit -m "fix(frontend): set CUSTOMER role on signup and fix redirect"
```

---

## Task 5 : Créer `/register/restaurateur`

**Files:**
- Create: `frontend/app/register/restaurateur/page.tsx`

- [ ] **Étape 1 : Créer le fichier**

```tsx
"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2 } from "lucide-react";

export default function RegisterRestaurateurPage() {
  const router = useRouter();
  const supabase = createClient();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { role: "RESTAURATEUR" } },
    });

    if (error) {
      setError(error.message);
      setLoading(false);
    } else {
      router.replace("/admin");
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="w-full max-w-sm">
        <div className="bg-white border border-brand-border rounded-lg p-6">
          <h1 className="text-xl font-bold mb-4">Créer un compte restaurateur</h1>

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

            {error && <p className="text-sm text-destructive">{error}</p>}

            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Créer un compte"}
            </Button>
          </form>

          <p className="text-center text-sm text-muted-foreground mt-4">
            Déjà un compte ?{" "}
            <Link href="/login" className="underline">
              Se connecter
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Étape 2 : Commit**

```bash
git add frontend/app/register/restaurateur/page.tsx
git commit -m "feat(frontend): add /register/restaurateur page"
```

---

## Task 6 : Garde-fous role sur les pages `/admin`

**Files:**
- Modify: `frontend/app/admin/page.tsx`
- Modify: `frontend/app/admin/create/page.tsx`
- Modify: `frontend/app/admin/[restaurantId]/page.tsx`

### `admin/page.tsx`

- [ ] **Étape 1 : Ajouter la vérification du rôle après la vérification de session**

Dans `useEffect`, après la vérification de session et l'appel `GET /api/v1/user/me`, ajouter :

```ts
const res = await fetch(
  `${process.env.NEXT_PUBLIC_API_URL}/api/v1/user/me`,
  { headers: { Authorization: `Bearer ${session.access_token}` } },
);

if (res.ok) {
  const { data } = await res.json();

  if (data.role !== "RESTAURATEUR") {
    router.replace("/");
    return;
  }

  const firstId = data.restaurants?.[0]?.id;
  if (firstId) {
    router.replace(`/admin/${firstId}`);
    return;
  }
}

router.replace("/admin/create");
```

Le bloc complet de `useEffect` dans `admin/page.tsx` devient :

```ts
useEffect(() => {
  const init = async () => {
    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session) {
        router.replace(`/login?redirect=${encodeURIComponent(pathname)}`);
        return;
      }

      const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/api/v1/user/me`,
        { headers: { Authorization: `Bearer ${session.access_token}` } },
      );

      if (res.ok) {
        const { data } = await res.json();

        if (data.role !== "RESTAURATEUR") {
          router.replace("/");
          return;
        }

        const firstId = data.restaurants?.[0]?.id;
        if (firstId) {
          router.replace(`/admin/${firstId}`);
          return;
        }
      }

      router.replace("/admin/create");
    } catch {
      router.replace("/admin/create");
    }
  };

  init();
}, [supabase, router, pathname]);
```

### `admin/create/page.tsx`

- [ ] **Étape 2 : Ajouter la vérification du rôle**

Dans le `useEffect` de `admin/create/page.tsx`, après la récupération de la session, l'appel `/api/v1/user/me` existe déjà. Ajouter le check role :

```ts
if (res.ok) {
  const { data } = await res.json();

  if (data.role !== "RESTAURATEUR") {
    router.replace("/");
    return;
  }

  const firstId = data.restaurants?.[0]?.id;
  if (firstId) {
    router.replace(`/admin/${firstId}`);
    return;
  }
}
```

Le bloc `useEffect` complet dans `admin/create/page.tsx` devient :

```ts
useEffect(() => {
  const guard = async () => {
    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session) {
        router.replace(`/login?redirect=${encodeURIComponent(pathname)}`);
        return;
      }

      const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/api/v1/user/me`,
        { headers: { Authorization: `Bearer ${session.access_token}` } },
      );

      if (res.ok) {
        const { data } = await res.json();

        if (data.role !== "RESTAURATEUR") {
          router.replace("/");
          return;
        }

        const firstId = data.restaurants?.[0]?.id;
        if (firstId) {
          router.replace(`/admin/${firstId}`);
          return;
        }
      }

      setChecking(false);
    } catch {
      setChecking(false);
    }
  };

  guard();
}, [supabase, router, pathname]);
```

### `admin/[restaurantId]/page.tsx`

- [ ] **Étape 3 : Ajouter la vérification du rôle**

Dans `admin/[restaurantId]/page.tsx`, après la récupération de la liste des restaurants (`meRes`), ajouter le check role :

```ts
const { data: meData } = await meRes.json();

if (meData.role !== "RESTAURATEUR") {
  router.replace("/");
  return;
}
```

Juste après `if (!meRes.ok) { router.replace("/admin"); return; }`.

- [ ] **Étape 4 : Commit**

```bash
git add frontend/app/admin/page.tsx frontend/app/admin/create/page.tsx 'frontend/app/admin/[restaurantId]/page.tsx'
git commit -m "feat(frontend): add RESTAURATEUR role guard on /admin pages"
```

---

## Tests manuels

Après implémentation, vérifier les scénarios suivants :

1. **Inscription client** : `/register` → signUp avec `role: CUSTOMER` → redirection vers `/` ou `?redirect`
2. **Inscription restaurateur** : `/register/restaurateur` → signUp avec `role: RESTAURATEUR` → redirection vers `/admin`
3. **Client accède `/admin`** : connecté avec un compte `CUSTOMER` → redirigé vers `/`
4. **Client appelle `POST /api/v1/restaurants`** : réponse `403 Access denied`
5. **Restaurateur accède `/admin`** : accès normal
6. **User existant (avant migration)** : `role` = `CUSTOMER` par défaut, peut toujours commander
