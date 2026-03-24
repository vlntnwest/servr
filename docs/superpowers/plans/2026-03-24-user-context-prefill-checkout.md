# User Context + Checkout Prefill Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Créer un context React global portant le profil utilisateur connecté, et l'utiliser pour préremplir le formulaire de commande (fullName, phone) et masquer le champ email.

**Architecture:** Un `UserProvider` Client Component au niveau du layout racine charge le profil via `GET /api/v1/user/me` au moment du sign-in Supabase. Le checkout modal lit le context au moment de son ouverture et snapshote la valeur utilisateur dans un state local pour toute la durée de la session de commande.

**Tech Stack:** Next.js App Router, React context, Supabase Auth (browser client), Vitest

---

## File Map

| Fichier | Action | Responsabilité |
|---------|--------|----------------|
| `frontend/vitest.config.ts` | Créer | Config Vitest avec alias `@` et env jsdom |
| `frontend/lib/api.ts` | Modifier | Ajouter `getUserMe()` exportée |
| `frontend/lib/api.test.ts` | Créer | Tests pour `getUserMe` |
| `frontend/contexts/user-context.tsx` | Créer | UserProvider + useUserContext hook |
| `frontend/app/layout.tsx` | Modifier | Envelopper children avec UserProvider |
| `frontend/components/cart/checkout-modal.tsx` | Modifier | Snapshot + prefill + masque email |
| `frontend/components/store/customer-sheet.tsx` | Modifier | Migrer vers useUserContext, supprimer subscription locale |
| `frontend/app/account/page.tsx` | Modifier | Appeler refetch() après sauvegarde réussie |

> **Note `header.tsx` :** `header.tsx` délègue tout le rendu auth-dépendant à `CustomerSheet`. Aucun changement requis sur ce fichier.

---

## Task 0: Installer Vitest et créer la config

**Files:**
- Modify: `frontend/package.json`
- Create: `frontend/vitest.config.ts`

> Vitest n'est pas encore installé dans ce projet. Le fichier `frontend/lib/redirectUtils.test.ts` existe mais ne peut pas tourner sans vitest. On installe vitest + vite-tsconfig-paths pour que l'alias `@/` fonctionne dans les tests.

- [ ] **Step 1: Installer vitest**

```bash
cd frontend && npm install --save-dev vitest vite-tsconfig-paths
```
Expected: vitest ajouté dans `devDependencies`

- [ ] **Step 2: Ajouter le script de test dans `package.json`**

Dans la section `"scripts"`, ajouter :
```json
"test": "vitest run",
"test:watch": "vitest"
```

- [ ] **Step 3: Créer `frontend/vitest.config.ts`**

```typescript
import { defineConfig } from "vitest/config";
import tsconfigPaths from "vite-tsconfig-paths";

export default defineConfig({
  plugins: [tsconfigPaths()],
  test: {
    environment: "node",
    globals: false,
  },
});
```

- [ ] **Step 4: Vérifier que le test existant tourne**

```bash
cd frontend && npx vitest run lib/redirectUtils.test.ts
```
Expected: PASS (6 tests)

- [ ] **Step 5: Commit**

```bash
git add frontend/package.json frontend/package-lock.json frontend/vitest.config.ts
git commit -m "chore: install vitest and add test script"
```

---

## Task 1: Ajouter `getUserMe` dans `lib/api.ts`

**Files:**
- Modify: `frontend/lib/api.ts`
- Create: `frontend/lib/api.test.ts`

> `apiFetch` est une fonction privée dans `api.ts` qui appelle `/api/v1<path>`, gère l'auth header via `supabase.auth.getSession()` et retry sur 401. On expose une fonction `getUserMe()` qui l'utilise. Le type `User` existe déjà dans `frontend/types/api.ts`.

- [ ] **Step 1: Écrire le test dans `frontend/lib/api.test.ts`**

```typescript
import { describe, it, expect, vi, beforeAll } from "vitest";

// Set env before module is imported
vi.stubEnv("NEXT_PUBLIC_API_URL", "http://localhost:3001");

// Mock supabase client
vi.mock("@/lib/supabase/client", () => ({
  createClient: () => ({
    auth: {
      getSession: vi.fn().mockResolvedValue({
        data: { session: { access_token: "test-token" } },
      }),
      refreshSession: vi.fn().mockResolvedValue({ error: null }),
    },
  }),
}));

// Mock global fetch
const mockFetch = vi.fn();
vi.stubGlobal("fetch", mockFetch);

// Static import — module is evaluated once with the env already set
import { getUserMe } from "./api";

describe("getUserMe", () => {
  it("returns user profile on success", async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({
        data: { id: "1", email: "a@b.com", fullName: "Jean", phone: "06" },
      }),
    });

    const result = await getUserMe();
    expect(result).toEqual({
      data: { id: "1", email: "a@b.com", fullName: "Jean", phone: "06" },
    });
  });

  it("returns error on non-ok response", async () => {
    mockFetch.mockResolvedValue({
      ok: false,
      status: 500,
      json: async () => ({ error: "Server error" }),
    });

    const result = await getUserMe();
    expect(result).toHaveProperty("error");
  });
});
```

- [ ] **Step 2: Lancer le test pour vérifier qu'il échoue**

```bash
cd frontend && npx vitest run lib/api.test.ts
```
Expected: FAIL — `getUserMe` is not exported from `./api`

- [ ] **Step 3: Implémenter `getUserMe` dans `frontend/lib/api.ts`**

Ajouter `User` aux imports existants depuis `@/types/api` :
```typescript
import type {
  // ... existing imports ...
  User,
} from "@/types/api";
```

Ajouter à la fin du fichier :
```typescript
export async function getUserMe(): Promise<{ data: User } | { error: string }> {
  return apiFetch<User>("/user/me");
}
```

- [ ] **Step 4: Lancer le test pour vérifier qu'il passe**

```bash
cd frontend && npx vitest run lib/api.test.ts
```
Expected: PASS (2 tests)

- [ ] **Step 5: Commit**

```bash
git add frontend/lib/api.ts frontend/lib/api.test.ts
git commit -m "feat: export getUserMe in api.ts"
```

---

## Task 2: Créer `UserContext`

**Files:**
- Create: `frontend/contexts/user-context.tsx`

> Ce context s'abonne à `supabase.auth.onAuthStateChange`. Sur `SIGNED_IN` ou `TOKEN_REFRESHED`, il charge le profil via `getUserMe()`. Sur `SIGNED_OUT`, il remet `user` à `null`. `refetch()` recharge le profil sans paramètre (self-contained).
>
> Le `useEffect` a un tableau de dépendances vide intentionnel : `supabase` est créé une seule fois à l'init et `loadUser` est stable via `useCallback`. Le commentaire eslint-disable documente ce choix.

- [ ] **Step 1: Créer `frontend/contexts/user-context.tsx`**

```typescript
"use client";

import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  type ReactNode,
} from "react";
import { createClient } from "@/lib/supabase/client";
import { getUserMe } from "@/lib/api";
import type { User } from "@/types/api";

type UserContextType = {
  user: User | null;
  isLoading: boolean;
  refetch: () => Promise<void>;
};

const UserContext = createContext<UserContextType | null>(null);

export function UserProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const loadUser = useCallback(async () => {
    const result = await getUserMe();
    setUser("data" in result ? result.data : null);
  }, []);

  const refetch = useCallback(async () => {
    await loadUser();
  }, [loadUser]);

  useEffect(() => {
    const supabase = createClient();

    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        loadUser().finally(() => setIsLoading(false));
      } else {
        setIsLoading(false);
      }
    });

    // eslint-disable-next-line react-hooks/exhaustive-deps
    // supabase is instantiated once here; loadUser is stable via useCallback
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event) => {
      if (event === "SIGNED_IN" || event === "TOKEN_REFRESHED") {
        loadUser();
      } else if (event === "SIGNED_OUT") {
        setUser(null);
      }
    });

    return () => subscription.unsubscribe();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <UserContext.Provider value={{ user, isLoading, refetch }}>
      {children}
    </UserContext.Provider>
  );
}

export function useUserContext(): UserContextType {
  const ctx = useContext(UserContext);
  if (!ctx) throw new Error("useUserContext must be used within UserProvider");
  return ctx;
}
```

- [ ] **Step 2: Vérifier que TypeScript compile sans erreur**

```bash
cd frontend && npx tsc --noEmit 2>&1 | head -30
```
Expected: no errors related to user-context.tsx

- [ ] **Step 3: Commit**

```bash
git add frontend/contexts/user-context.tsx
git commit -m "feat: add UserContext with profile loading and refetch"
```

---

## Task 3: Ajouter `UserProvider` au layout racine

**Files:**
- Modify: `frontend/app/layout.tsx`

> `layout.tsx` est un Server Component. `UserProvider` est un Client Component (`"use client"`). Next.js App Router supporte les Client Component providers en tant qu'enfants de Server Components — c'est exactement le pattern utilisé par `CartProvider` déjà présent.

- [ ] **Step 1: Modifier `frontend/app/layout.tsx`**

Ajouter l'import :
```typescript
import { UserProvider } from "@/contexts/user-context";
```

Envelopper `CartProvider` avec `UserProvider` dans le body :
```typescript
<body>
  <UserProvider>
    <CartProvider>{children}</CartProvider>
  </UserProvider>
</body>
```

- [ ] **Step 2: Vérifier que TypeScript compile sans erreur**

```bash
cd frontend && npx tsc --noEmit 2>&1 | head -30
```
Expected: no errors

- [ ] **Step 3: Commit**

```bash
git add frontend/app/layout.tsx
git commit -m "feat: add UserProvider to root layout"
```

---

## Task 4: Préremplir le checkout modal

**Files:**
- Modify: `frontend/components/cart/checkout-modal.tsx`

> `CheckoutModal` n'est jamais démonté (Dialog avec prop `open`). Le snapshot de `user` se fait dans un `useEffect` sur `[open]` (pas dans l'initializer de `useState`). Les champs non renseignés dans le profil (`null`) tombent sur `""` — pas sur la valeur précédemment tapée — pour éviter qu'une saisie guest soit attribuée visuellement au compte.

- [ ] **Step 1: Modifier `frontend/components/cart/checkout-modal.tsx`**

Ajouter l'import :
```typescript
import { useUserContext } from "@/contexts/user-context";
import type { User } from "@/types/api";
```

Ajouter dans le corps du composant, après les `useState` existants :
```typescript
const { user } = useUserContext();
const [localUser, setLocalUser] = useState<User | null>(null);

useEffect(() => {
  if (open) {
    setLocalUser(user);
    setForm((prev) => ({
      ...prev,
      fullName: user?.fullName ?? "",
      phone: user?.phone ?? "",
    }));
  }
}, [open]); // eslint-disable-line react-hooks/exhaustive-deps
```

Dans `handleSubmit`, dans l'objet passé à `createCheckoutSession`, remplacer :
```typescript
email: form.email || undefined,
```
par :
```typescript
email: localUser ? localUser.email : form.email || undefined,
```

Dans le JSX, envelopper le bloc du champ email avec une condition :
```typescript
{!localUser && (
  <div className="space-y-1">
    <Label htmlFor="email">Email</Label>
    <Input
      id="email"
      name="email"
      type="email"
      value={form.email}
      onChange={handleChange}
      placeholder="jean@example.com"
    />
  </div>
)}
```

- [ ] **Step 2: Vérifier que TypeScript compile sans erreur**

```bash
cd frontend && npx tsc --noEmit 2>&1 | head -30
```
Expected: no errors

- [ ] **Step 3: Test manuel**

Démarrer l'app :
```bash
cd frontend && npm run dev
```

Scénario connecté :
1. Se connecter, aller sur `/account`, renseigner nom + téléphone, sauvegarder
2. Aller sur la page d'un restaurant, ajouter un article, ouvrir le checkout
3. Vérifier : fullName et phone préremplis, champ email absent, champs éditables

Scénario invité :
1. Se déconnecter, ajouter un article, ouvrir le checkout
2. Vérifier : formulaire vide, champ email visible

- [ ] **Step 4: Commit**

```bash
git add frontend/components/cart/checkout-modal.tsx
git commit -m "feat: prefill checkout form and hide email for logged-in users"
```

---

## Task 5: Migrer `customer-sheet.tsx` vers `useUserContext`

**Files:**
- Modify: `frontend/components/store/customer-sheet.tsx`

> `customer-sheet.tsx` a actuellement sa propre subscription `onAuthStateChange` + appel `getUser()` locaux (lignes 20-30). On supprime tout ça et on lit depuis `useUserContext()`. `supabase` reste nécessaire pour `signOut()`.
>
> Le type `User` (notre type API) et `SupabaseUser` (type Supabase) sont différents, mais `customer-sheet.tsx` utilise `user` uniquement pour le test `if (user)` — les deux types conviennent.

- [ ] **Step 1: Modifier `frontend/components/store/customer-sheet.tsx`**

**Imports :** changer la ligne 3 de :
```typescript
import { useEffect, useState } from "react";
```
en :
```typescript
import { useState } from "react";
```

Supprimer la ligne 5 entière :
```typescript
import type { User as SupabaseUser } from "@supabase/supabase-js";
```

Ajouter l'import :
```typescript
import { useUserContext } from "@/contexts/user-context";
```

**Corps du composant :** supprimer :
```typescript
const [user, setUser] = useState<SupabaseUser | null>(null);
```

Supprimer le `useEffect` entier (lignes 20-30 dans le fichier original) :
```typescript
useEffect(() => {
  supabase.auth.getUser().then(({ data: { user } }) => setUser(user));

  const {
    data: { subscription },
  } = supabase.auth.onAuthStateChange((_event, session) => {
    setUser(session?.user ?? null);
  });

  return () => subscription.unsubscribe();
}, [supabase.auth]);
```

Ajouter à la place :
```typescript
const { user } = useUserContext();
```

Résultat du début du composant après modification :
```typescript
export default function CustomerSheet() {
  const [open, setOpen] = useState(false);
  const { user } = useUserContext();
  const supabase = createClient();
  // ... reste du JSX inchangé
```

- [ ] **Step 2: Vérifier que TypeScript compile sans erreur**

```bash
cd frontend && npx tsc --noEmit 2>&1 | head -30
```
Expected: no errors

- [ ] **Step 3: Commit**

```bash
git add frontend/components/store/customer-sheet.tsx
git commit -m "refactor: migrate CustomerSheet to useUserContext"
```

---

## Task 6: Appeler `refetch()` dans `account/page.tsx` après sauvegarde

**Files:**
- Modify: `frontend/app/account/page.tsx`

> Après une sauvegarde réussie du profil, `refetch()` met à jour le UserContext. Le prochain checkout reflétera immédiatement les nouvelles valeurs. `refetch()` est self-contained — il appelle `supabase.auth.getSession()` en interne, pas besoin de lui passer un token.

- [ ] **Step 1: Modifier `frontend/app/account/page.tsx`**

Ajouter l'import :
```typescript
import { useUserContext } from "@/contexts/user-context";
```

Ajouter dans le corps du composant (après les `useState` existants) :
```typescript
const { refetch } = useUserContext();
```

Dans `handleSubmit`, modifier le bloc `if (res.ok)` :
```typescript
if (res.ok) {
  setSuccess(true);
  refetch(); // met à jour le UserContext pour le prochain checkout
} else {
```

- [ ] **Step 2: Vérifier que TypeScript compile sans erreur**

```bash
cd frontend && npx tsc --noEmit 2>&1 | head -30
```
Expected: no errors

- [ ] **Step 3: Commit**

```bash
git add frontend/app/account/page.tsx
git commit -m "feat: refresh user context after profile save"
```

---

## Vérification finale

- [ ] **Lancer tous les tests**

```bash
cd frontend && npm test
```
Expected: tous les tests passent (`lib/redirectUtils.test.ts` + `lib/api.test.ts`)

- [ ] **Vérifier le build**

```bash
cd frontend && npm run build 2>&1 | tail -20
```
Expected: build sans erreur ni warning TypeScript

- [ ] **Test manuel complet**

1. Se connecter, aller sur `/account`, renseigner nom + téléphone, sauvegarder
2. Aller sur la page d'un restaurant, ajouter un article au panier
3. Ouvrir le checkout → fullName et phone préremplis, email absent
4. Modifier un champ → vérifier qu'il reste éditable
5. Vérifier le menu utilisateur (header) → "Mon compte" si connecté
6. Se déconnecter → ouvrir le checkout → formulaire vide, email visible
