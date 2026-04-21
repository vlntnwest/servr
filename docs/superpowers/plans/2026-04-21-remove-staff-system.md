# Remove Staff System Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Retirer le système multi-rôles (OWNER/ADMIN/STAFF, invitations, membres) et passer à un modèle `Restaurant.adminId` 1-N avec un user unique par restaurant.

**Architecture:** Ajout de `Restaurant.adminId` (FK → `User`, NOT NULL, `ON DELETE CASCADE`), suppression des tables `restaurant_members` et `invitation_tokens`, suppression de l'enum `RestaurantRole`. Tous les middlewares `isOwner`/`isAdmin`/`isStaff` sont unifiés en un seul `isRestaurantAdmin`. Côté frontend, `user.restaurants` remplace `user.restaurantMembers` partout.

**Tech Stack:** Node.js 20 (CommonJS), Express 4, Prisma 7 (PostgreSQL/Supabase), Zod, Vitest, Next.js 15 / React 19 / TypeScript.

**Spec:** `docs/superpowers/specs/2026-04-21-remove-staff-system-design.md`

---

## File Structure

**Backend — Modified:**
- `api/prisma/schema.prisma` : `Restaurant.adminId` + relation `admin`, suppression des modèles `RestaurantMember`/`InvitationToken`, suppression de l'enum `RestaurantRole`.
- `api/middleware/role.middleware.js` : remplacé par un unique `isRestaurantAdmin`.
- `api/middleware/auth.middleware.js` : `include: { restaurants: true }`.
- `api/controllers/restaurant.controllers.js` : `createRestaurant` set `adminId` au lieu de créer un membre.
- `api/controllers/user.controllers.js` : `GET /me` renvoie `restaurants` au lieu de `restaurantMembers`.
- `api/routes/menu.routes.js`, `api/routes/order.routes.js`, `api/routes/restaurant.routes.js`, `api/routes/openingHour.routes.js`, `api/routes/exceptionalHour.routes.js`, `api/routes/upload.routes.js`, `api/routes/checkout.routes.js`, `api/routes/stats.routes.js`, `api/routes/promoCode.routes.js` : remplacer l'import et les usages de `isOwner`/`isAdmin`/`isStaff` par `isRestaurantAdmin`.
- `api/app.js` : retirer le montage de `memberRoutes`.
- `api/validators/schemas.js` : retirer `inviteMemberSchema`, `updateMemberRoleSchema`, `acceptInvitationSchema` et leurs exports.
- `api/tests/middleware/role.middleware.spec.js` : réécrit pour `isRestaurantAdmin`.
- `api/tests/middleware/auth.middleware.spec.js` : mock `restaurants` au lieu de `restaurantMembers`.
- `api/tests/controllers/restaurant.controllers.spec.js` : adapter l'assertion sur `adminId`.
- `api/CLAUDE.md`, `api/README.md`, `api/docs/openapi.json`, `api/docs/*.md` : retirer les mentions des rôles/membres/invitations.

**Backend — Created:**
- `api/prisma/migrations/20260421000000_remove_staff_system/migration.sql`

**Backend — Deleted:**
- `api/controllers/member.controllers.js`
- `api/routes/member.routes.js`

**Frontend — Modified:**
- `frontend/types/api.ts` : retirer `RestaurantMember`, ajouter `User.restaurants: Restaurant[]`.
- `frontend/lib/api.ts` : retirer `getMembers`, `inviteMember`, `removeMember`, l'import `RestaurantMember`.
- `frontend/app/admin/page.tsx`, `frontend/app/admin/[restaurantId]/page.tsx`, `frontend/app/admin/stripe/return/page.tsx`, `frontend/app/admin/stripe/refresh/page.tsx` : lire `data.restaurants` au lieu de `data.restaurantMembers`.
- Tout composant qui référence l'onglet Members : retirer la référence.

**Frontend — Deleted:**
- `frontend/components/admin/members-tab.tsx`
- `frontend/app/members/accept/page.tsx`
- `frontend/app/members/accept/accept-client.tsx`
- (Supprimer aussi le dossier `frontend/app/members/` s'il devient vide.)

---

## Task 1: Update Prisma schema

**Files:**
- Modify: `api/prisma/schema.prisma`

- [ ] **Step 1: Modifier le modèle `User`**

Remplacer la ligne `restaurantMembers RestaurantMember[]` (ligne 22 du fichier actuel) par :

```prisma
  restaurants       Restaurant[]
```

- [ ] **Step 2: Modifier le modèle `Restaurant`**

Ajouter `adminId` et la relation `admin` ; retirer `restaurantMembers` et `invitationTokens`.

Dans le bloc `model Restaurant { ... }`, **ajouter** ces deux lignes (emplacement au milieu des champs scalaires, avant `categories`) :

```prisma
  adminId           String             @map("admin_id") @db.Uuid
  admin             User               @relation(fields: [adminId], references: [id], onDelete: Cascade, onUpdate: NoAction)
```

Et **supprimer** les deux lignes :

```prisma
  invitationTokens  InvitationToken[]
  restaurantMembers RestaurantMember[]
```

- [ ] **Step 3: Supprimer les modèles `RestaurantMember` et `InvitationToken`**

Supprimer intégralement les blocs `model RestaurantMember { ... }` (lignes 56-69) et `model InvitationToken { ... }` (lignes 280-293).

- [ ] **Step 4: Supprimer l'enum `RestaurantRole`**

Supprimer le bloc `enum RestaurantRole { ... }` (lignes 313-320).

- [ ] **Step 5: Valider le schéma**

Run: `cd api && npx prisma validate`
Expected output : `The schema at prisma/schema.prisma is valid`

- [ ] **Step 6: Commit**

```bash
cd /Users/valentinwestermeyer/Documents/Dev/servr
git add api/prisma/schema.prisma
git commit -m "refactor(schema): replace RestaurantMember with Restaurant.adminId

Drop multi-role staff system. Restaurant now has a single admin (1-N).
RestaurantMember, InvitationToken, and RestaurantRole are removed."
```

---

## Task 2: Create migration SQL

**Files:**
- Create: `api/prisma/migrations/20260421000000_remove_staff_system/migration.sql`

- [ ] **Step 1: Créer le dossier de migration**

Run:

```bash
mkdir -p /Users/valentinwestermeyer/Documents/Dev/servr/api/prisma/migrations/20260421000000_remove_staff_system
```

- [ ] **Step 2: Écrire le SQL de migration**

Créer `api/prisma/migrations/20260421000000_remove_staff_system/migration.sql` avec le contenu suivant :

```sql
-- Safety check: abort if any restaurant would lose its OWNER after migration.
DO $$
DECLARE
  orphan_count INT;
BEGIN
  SELECT COUNT(*) INTO orphan_count
  FROM restaurants r
  WHERE NOT EXISTS (
    SELECT 1 FROM restaurant_members rm
    WHERE rm.restaurant_id = r.id AND rm.role = 'OWNER'
  );
  IF orphan_count > 0 THEN
    RAISE EXCEPTION 'Migration aborted: % restaurant(s) have no OWNER member', orphan_count;
  END IF;
END $$;

-- 1. Add admin_id (nullable during backfill).
ALTER TABLE restaurants
  ADD COLUMN admin_id uuid REFERENCES users(id) ON DELETE CASCADE;

-- 2. Backfill admin_id from restaurant_members (role = 'OWNER').
UPDATE restaurants r
SET admin_id = rm.user_id
FROM restaurant_members rm
WHERE rm.restaurant_id = r.id AND rm.role = 'OWNER';

-- 3. Enforce NOT NULL now that every row is backfilled.
ALTER TABLE restaurants
  ALTER COLUMN admin_id SET NOT NULL;

-- 4. Drop legacy tables and enum.
DROP TABLE IF EXISTS invitation_tokens;
DROP TABLE IF EXISTS restaurant_members;
DROP TYPE IF EXISTS restaurant_role;
```

- [ ] **Step 3: Vérifier que Prisma reconnaît la migration**

Run: `cd api && npx prisma migrate status`
Expected: La migration `20260421000000_remove_staff_system` apparaît comme `Pending` dans la liste.

- [ ] **Step 4: Commit**

```bash
cd /Users/valentinwestermeyer/Documents/Dev/servr
git add api/prisma/migrations/20260421000000_remove_staff_system/migration.sql
git commit -m "feat(db): migration remove_staff_system

Backfills Restaurant.admin_id from restaurant_members.role='OWNER',
then drops restaurant_members, invitation_tokens, and restaurant_role."
```

---

## Task 3: Apply the migration and regenerate Prisma client

**Files:**
- None (just running commands)

- [ ] **Step 1: Appliquer la migration sur la DB**

Run: `cd api && npx prisma migrate deploy`
Expected: `All migrations have been successfully applied.` avec la nouvelle migration listée.

Si le script échoue avec `RAISE EXCEPTION`, cela signifie qu'un restaurant n'a pas d'OWNER. Vérifier les données en base avant de continuer (ne devrait pas arriver dans ce projet).

- [ ] **Step 2: Régénérer le client Prisma**

Run: `cd api && npx prisma generate`
Expected: `Generated Prisma Client`

- [ ] **Step 3: Lancer le serveur pour vérifier qu'il démarre**

Run: `cd api && timeout 5 npm run dev 2>&1 | head -30` (ou lancer manuellement `npm run dev` et couper après 5s)
Expected: Pas d'erreur Prisma liée à `restaurantMembers`, `RestaurantMember`, ou `RestaurantRole`. Le serveur démarre.

Note : le serveur peut montrer des erreurs d'import ailleurs — on les corrige dans les tâches suivantes. L'essentiel ici est que Prisma soit valide avec la nouvelle schema.

---

## Task 4: Rewrite role middleware

**Files:**
- Modify: `api/middleware/role.middleware.js`
- Test: `api/tests/middleware/role.middleware.spec.js`

- [ ] **Step 1: Réécrire `api/tests/middleware/role.middleware.spec.js` (TDD — test d'abord)**

Remplacer intégralement le contenu du fichier par :

```js
const { isRestaurantAdmin } = require("../../middleware/role.middleware");

const mockRes = () => {
  const res = {};
  res.status = vi.fn().mockReturnValue(res);
  res.json = vi.fn().mockReturnValue(res);
  return res;
};

const RESTAURANT_ID = "rest-111";
const OTHER_RESTAURANT_ID = "rest-999";

const makeUser = (restaurants = [{ id: RESTAURANT_ID }]) => ({
  id: "user-1",
  restaurants,
});

describe("isRestaurantAdmin", () => {
  test("calls next when user is admin of the restaurant", () => {
    const req = {
      user: makeUser(),
      params: { restaurantId: RESTAURANT_ID },
    };
    const res = mockRes();
    const next = vi.fn();

    isRestaurantAdmin(req, res, next);

    expect(next).toHaveBeenCalledOnce();
  });

  test("returns 403 when user is admin of a different restaurant", () => {
    const req = {
      user: makeUser([{ id: OTHER_RESTAURANT_ID }]),
      params: { restaurantId: RESTAURANT_ID },
    };
    const res = mockRes();
    const next = vi.fn();

    isRestaurantAdmin(req, res, next);

    expect(next).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(403);
    expect(res.json).toHaveBeenCalledWith({ error: "Access denied" });
  });

  test("returns 403 when user has no restaurants", () => {
    const req = {
      user: makeUser([]),
      params: { restaurantId: RESTAURANT_ID },
    };
    const res = mockRes();
    const next = vi.fn();

    isRestaurantAdmin(req, res, next);

    expect(next).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(403);
  });
});
```

- [ ] **Step 2: Lancer le test et vérifier qu'il échoue**

Run: `cd api && npx vitest run tests/middleware/role.middleware.spec.js`
Expected: FAIL (le module n'exporte plus `isOwner`/`isAdmin`/`isStaff` et `isRestaurantAdmin` n'existe pas encore).

- [ ] **Step 3: Réécrire le middleware**

Remplacer intégralement le contenu de `api/middleware/role.middleware.js` par :

```js
const logger = require("../logger");

const isRestaurantAdmin = (req, res, next) => {
  const user = req.user;
  const restaurantId = req.params.restaurantId;

  if (!user.restaurants.some((r) => r.id === restaurantId)) {
    logger.warn(
      { userId: user.id, restaurantId },
      "User is not admin of restaurant",
    );
    return res.status(403).json({ error: "Access denied" });
  }

  next();
};

module.exports = { isRestaurantAdmin };
```

- [ ] **Step 4: Lancer le test et vérifier qu'il passe**

Run: `cd api && npx vitest run tests/middleware/role.middleware.spec.js`
Expected: 3 tests pass.

- [ ] **Step 5: Commit**

```bash
cd /Users/valentinwestermeyer/Documents/Dev/servr
git add api/middleware/role.middleware.js api/tests/middleware/role.middleware.spec.js
git commit -m "refactor(middleware): replace role hierarchy with isRestaurantAdmin

Drops isOwner/isAdmin/isStaff. A single middleware now checks that
req.user is the admin of the restaurant in the URL params."
```

---

## Task 5: Update auth middleware

**Files:**
- Modify: `api/middleware/auth.middleware.js`
- Test: `api/tests/middleware/auth.middleware.spec.js`

- [ ] **Step 1: Mettre à jour le test**

Dans `api/tests/middleware/auth.middleware.spec.js`, modifier le test "sets req.user and calls next on success" (lignes 107-132) :

Remplacer :

```js
    const dbUser = {
      id: "user-1",
      email: "test@test.com",
      restaurantMembers: [],
    };
```

par :

```js
    const dbUser = {
      id: "user-1",
      email: "test@test.com",
      restaurants: [],
    };
```

Et remplacer :

```js
    expect(mockPrisma.user.findUnique).toHaveBeenCalledWith({
      where: { id: "user-1" },
      include: { restaurantMembers: { include: { restaurant: true } } },
    });
```

par :

```js
    expect(mockPrisma.user.findUnique).toHaveBeenCalledWith({
      where: { id: "user-1" },
      include: { restaurants: true },
    });
```

- [ ] **Step 2: Lancer le test et vérifier qu'il échoue**

Run: `cd api && npx vitest run tests/middleware/auth.middleware.spec.js`
Expected: FAIL sur le test "sets req.user and calls next on success" (le middleware fait encore `include: { restaurantMembers }`).

- [ ] **Step 3: Mettre à jour `api/middleware/auth.middleware.js`**

Remplacer (lignes 26-31) :

```js
    dbUser = await prisma.user.findUnique({
      where: { id: user.id },
      include: {
        restaurantMembers: { include: { restaurant: true } },
      },
    });
```

par :

```js
    dbUser = await prisma.user.findUnique({
      where: { id: user.id },
      include: { restaurants: true },
    });
```

- [ ] **Step 4: Lancer les tests et vérifier**

Run: `cd api && npx vitest run tests/middleware/auth.middleware.spec.js`
Expected: tous les tests passent.

- [ ] **Step 5: Commit**

```bash
cd /Users/valentinwestermeyer/Documents/Dev/servr
git add api/middleware/auth.middleware.js api/tests/middleware/auth.middleware.spec.js
git commit -m "refactor(middleware): auth middleware loads user.restaurants"
```

---

## Task 6: Update restaurant controller and its tests

**Files:**
- Modify: `api/controllers/restaurant.controllers.js`
- Test: `api/tests/controllers/restaurant.controllers.spec.js`

- [ ] **Step 1: Mettre à jour le test `createRestaurant`**

Dans `api/tests/controllers/restaurant.controllers.spec.js` :

Remplacer le `beforeEach` (lignes 27-36) par :

```js
  beforeEach(() => {
    mockPrisma = globalThis.__mockPrisma;
    mockPrisma.restaurant = {
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    };
  });
```

Remplacer le test "returns 201 with created restaurant" (lignes 40-58) par :

```js
    test("returns 201 with created restaurant", async () => {
      const created = { id: "rest-1", adminId: "user-1", ...validBody };
      mockPrisma.restaurant.create.mockResolvedValue(created);

      const req = { user: { id: "user-1" }, body: validBody };
      const res = mockRes();
      const next = vi.fn();

      await createRestaurant(req, res, next);

      expect(res.status).toHaveBeenCalledWith(201);
      expect(res.json).toHaveBeenCalledWith({ data: created });
    });
```

Remplacer le test "creates restaurant member with OWNER role" (lignes 60-90) par :

```js
    test("sets adminId to req.user.id", async () => {
      const created = { id: "rest-1", adminId: "user-1", ...validBody };
      let createArgs;
      mockPrisma.restaurant.create.mockImplementation((args) => {
        createArgs = args;
        return created;
      });

      const req = { user: { id: "user-1" }, body: validBody };
      const res = mockRes();
      const next = vi.fn();

      await createRestaurant(req, res, next);

      expect(createArgs.data.adminId).toBe("user-1");
    });
```

Remplacer le test "calls next with error on failure" (lignes 92-…) pour cibler `mockPrisma.restaurant.create` au lieu de `mockPrisma.$transaction` :

```js
    test("calls next with error on failure", async () => {
      const dbError = new Error("DB error");
      mockPrisma.restaurant.create.mockRejectedValue(dbError);

      const req = { user: { id: "user-1" }, body: validBody };
      const res = mockRes();
      const next = vi.fn();

      await createRestaurant(req, res, next);

      expect(next).toHaveBeenCalledWith(dbError);
    });
```

- [ ] **Step 2: Lancer les tests et vérifier qu'ils échouent**

Run: `cd api && npx vitest run tests/controllers/restaurant.controllers.spec.js`
Expected: FAIL (le contrôleur utilise encore `$transaction` + `restaurantMember.create`).

- [ ] **Step 3: Mettre à jour `createRestaurant`**

Dans `api/controllers/restaurant.controllers.js`, remplacer la fonction `createRestaurant` (lignes 42-76) par :

```js
module.exports.createRestaurant = async (req, res, next) => {
  const user = req.user;
  const { name, slug, address, zipCode, city, phone, email, imageUrl } = req.body;

  try {
    const data = await prisma.restaurant.create({
      data: {
        name,
        slug,
        address,
        zipCode,
        city,
        phone,
        email,
        imageUrl,
        adminId: user.id,
      },
    });
    logger.info({ responseId: data.id }, "Restaurant created successfully");
    return res.status(201).json({ data });
  } catch (error) {
    next(error);
  }
};
```

- [ ] **Step 4: Lancer les tests du contrôleur**

Run: `cd api && npx vitest run tests/controllers/restaurant.controllers.spec.js`
Expected: tous les tests passent.

- [ ] **Step 5: Commit**

```bash
cd /Users/valentinwestermeyer/Documents/Dev/servr
git add api/controllers/restaurant.controllers.js api/tests/controllers/restaurant.controllers.spec.js
git commit -m "refactor(restaurant): createRestaurant sets adminId directly

No more transactional RestaurantMember creation — the creator becomes
the single admin via Restaurant.adminId."
```

---

## Task 7: Update user controller

**Files:**
- Modify: `api/controllers/user.controllers.js`

- [ ] **Step 1: Mettre à jour `getUserData`**

Dans `api/controllers/user.controllers.js`, remplacer `getUserData` (lignes 5-27) par :

```js
module.exports.getUserData = async (req, res, next) => {
  const { id } = req.user;

  try {
    const data = await prisma.user.findUnique({
      where: { id },
      include: {
        restaurants: { select: { id: true, name: true, slug: true } },
      },
    });

    if (!data) {
      logger.error("User not found");
      return res.status(404).json({ error: "User not found" });
    }

    return res.status(200).json({ data });
  } catch (error) {
    next(error);
  }
};
```

- [ ] **Step 2: Vérifier qu'aucun test user ne dépend du shape précédent**

Run: `cd api && grep -n "restaurantMembers" tests/` (via le tool `Grep`, pas `grep`).
Expected: aucun résultat. Si un test référence encore `restaurantMembers`, l'adapter à `restaurants`.

- [ ] **Step 3: Commit**

```bash
cd /Users/valentinwestermeyer/Documents/Dev/servr
git add api/controllers/user.controllers.js
git commit -m "refactor(user): GET /me returns restaurants instead of restaurantMembers"
```

---

## Task 8: Update routes to use isRestaurantAdmin

**Files:**
- Modify: `api/routes/restaurant.routes.js`, `api/routes/menu.routes.js`, `api/routes/order.routes.js`, `api/routes/openingHour.routes.js`, `api/routes/exceptionalHour.routes.js`, `api/routes/upload.routes.js`, `api/routes/checkout.routes.js`, `api/routes/stats.routes.js`, `api/routes/promoCode.routes.js`

Le principe : dans chaque fichier, remplacer l'import `{ isOwner, isAdmin, isStaff }` par `{ isRestaurantAdmin }`, et remplacer chaque usage `isOwner`, `isAdmin`, `isStaff` par `isRestaurantAdmin`.

- [ ] **Step 1: `restaurant.routes.js`**

Remplacer (ligne 6) :

```js
const { isAdmin, isOwner, isStaff } = require("../middleware/role.middleware");
```

par :

```js
const { isRestaurantAdmin } = require("../middleware/role.middleware");
```

Puis remplacer chaque `isAdmin,`, `isOwner,`, `isStaff,` dans le fichier par `isRestaurantAdmin,` (les 5 occurrences aux lignes 25, 32, 40, 49, 55 à partir du contenu actuel).

- [ ] **Step 2: `menu.routes.js`**

Remplacer (ligne 5) :

```js
const { isAdmin } = require("../middleware/role.middleware");
```

par :

```js
const { isRestaurantAdmin } = require("../middleware/role.middleware");
```

Puis remplacer toutes les occurrences de `isAdmin,` par `isRestaurantAdmin,` (17 occurrences).

- [ ] **Step 3: `order.routes.js`**

Remplacer (ligne 5) :

```js
const { isStaff } = require("../middleware/role.middleware");
```

par :

```js
const { isRestaurantAdmin } = require("../middleware/role.middleware");
```

Puis remplacer toutes les occurrences de `isStaff,` par `isRestaurantAdmin,` (3 occurrences).

- [ ] **Step 4: Autres fichiers de routes**

Pour chacun des fichiers suivants, appliquer la même transformation (import + usages) :

- `api/routes/openingHour.routes.js` : `isAdmin` → `isRestaurantAdmin` (1 occurrence de usage).
- `api/routes/exceptionalHour.routes.js` : `isAdmin` → `isRestaurantAdmin` (2 usages).
- `api/routes/upload.routes.js` : `isAdmin` → `isRestaurantAdmin` (2 usages).
- `api/routes/checkout.routes.js` : `isAdmin` → `isRestaurantAdmin` (1 usage).
- `api/routes/stats.routes.js` : `isAdmin` → `isRestaurantAdmin` (1 usage).
- `api/routes/promoCode.routes.js` : `isAdmin` → `isRestaurantAdmin` (3 usages).

- [ ] **Step 5: Vérifier qu'il ne reste aucune référence aux anciens middlewares**

Run: via le tool Grep, chercher le pattern `\\b(isOwner|isAdmin|isStaff)\\b` dans `api/`.
Expected: aucun résultat dans `api/routes/`, `api/middleware/`, `api/controllers/`, `api/app.js`, `api/tests/`. Seules les docs/CLAUDE.md peuvent encore contenir ces mots — on les traite dans la Task 13.

- [ ] **Step 6: Lancer l'ensemble de la suite de tests backend**

Run: `cd api && npm test`
Expected: Aucun test ne doit échouer à cause des routes. (Les tests de `member.controllers` échoueront à cause de la suppression à venir : on les traite dans la Task 10.)

- [ ] **Step 7: Commit**

```bash
cd /Users/valentinwestermeyer/Documents/Dev/servr
git add api/routes/
git commit -m "refactor(routes): replace role middlewares with isRestaurantAdmin"
```

---

## Task 9: Clean up validators

**Files:**
- Modify: `api/validators/schemas.js`

- [ ] **Step 1: Supprimer les schémas member/invitation**

Dans `api/validators/schemas.js` :

- Supprimer le bloc `// Member schemas` avec `inviteMemberSchema`, `updateMemberRoleSchema`, `acceptInvitationSchema` (lignes 151-163).
- Dans le `module.exports` (autour des lignes 241-243), supprimer les trois lignes :

```js
  // Members
  inviteMemberSchema,
  updateMemberRoleSchema,
  acceptInvitationSchema,
```

- [ ] **Step 2: Vérifier qu'il ne reste aucune référence**

Run (via Grep) : chercher `inviteMemberSchema|updateMemberRoleSchema|acceptInvitationSchema` dans `api/`.
Expected: aucun résultat.

- [ ] **Step 3: Commit**

```bash
cd /Users/valentinwestermeyer/Documents/Dev/servr
git add api/validators/schemas.js
git commit -m "refactor(validators): drop member/invitation Zod schemas"
```

---

## Task 10: Remove member module and route mount

**Files:**
- Delete: `api/controllers/member.controllers.js`
- Delete: `api/routes/member.routes.js`
- Modify: `api/app.js`

- [ ] **Step 1: Supprimer les tests dépendants du module**

Via Grep, lister les fichiers de tests qui requièrent `member.controllers`. Pour chaque fichier trouvé, supprimer le fichier entier.

Run: `cd api && find tests -name "*member*"` (ou équivalent Glob).
Pour chaque match, supprimer le fichier : `rm <file>`.

- [ ] **Step 2: Supprimer les fichiers de contrôleur et de routes**

Run:

```bash
rm /Users/valentinwestermeyer/Documents/Dev/servr/api/controllers/member.controllers.js
rm /Users/valentinwestermeyer/Documents/Dev/servr/api/routes/member.routes.js
```

- [ ] **Step 3: Retirer le montage de la route dans `app.js`**

Dans `api/app.js`, supprimer les deux lignes suivantes :

```js
const memberRoutes = require("./routes/member.routes");
```

(ligne 14)

et :

```js
  app.use(prefix, globalLimiter, memberRoutes);
```

(ligne 162, à l'intérieur de la boucle `for (const prefix of V1_PREFIXES)`)

- [ ] **Step 4: Vérifier que le serveur démarre et que les tests passent**

Run: `cd api && npm test`
Expected: Toute la suite passe.

Run: `cd api && timeout 5 npm run dev 2>&1 | head -30`
Expected: Le serveur démarre sans erreur d'import ou de `memberRoutes` manquant.

- [ ] **Step 5: Commit**

```bash
cd /Users/valentinwestermeyer/Documents/Dev/servr
git add -A api/
git commit -m "refactor(api): remove member module

Delete member.controllers, member.routes, related tests, and the route
mount in app.js. Invitations and multi-role membership are gone."
```

---

## Task 11: Update frontend types

**Files:**
- Modify: `frontend/types/api.ts`

- [ ] **Step 1: Supprimer le type `RestaurantMember`**

Supprimer l'intégralité du bloc `export type RestaurantMember = { ... }` (lignes 137-150).

- [ ] **Step 2: Mettre à jour le type `User`**

Remplacer (lignes 152-160) :

```ts
export type User = {
  id: string;
  email: string;
  fullName: string | null;
  phone: string | null;
  createdAt: string;
  updatedAt: string;
  restaurantMembers: RestaurantMember[];
};
```

par :

```ts
export type User = {
  id: string;
  email: string;
  fullName: string | null;
  phone: string | null;
  createdAt: string;
  updatedAt: string;
  restaurants: Restaurant[];
};
```

- [ ] **Step 3: Vérifier le type-check**

Run: `cd frontend && npx tsc --noEmit`
Expected: Des erreurs sur les fichiers qui utilisaient encore `RestaurantMember` ou `user.restaurantMembers`. C'est attendu — on les corrige aux tâches suivantes. Ne pas committer tant que le build n'est pas vert, mais on continue les tâches.

- [ ] **Step 4: (Pas de commit encore)**

On commitera avec le reste des changements frontend à la Task 13, une fois que `tsc` passe.

---

## Task 12: Update frontend API client

**Files:**
- Modify: `frontend/lib/api.ts`

- [ ] **Step 1: Retirer l'import `RestaurantMember`**

Dans `frontend/lib/api.ts`, supprimer la ligne :

```ts
  RestaurantMember,
```

(ligne 10 dans l'import depuis `@/types/api`).

- [ ] **Step 2: Supprimer les fonctions `getMembers`, `inviteMember`, `removeMember`**

Supprimer les blocs des trois fonctions :

- `getMembers` (lignes 210-220)
- `inviteMember` (lignes 222-232)
- `removeMember` (lignes 268-276)

Supprimer aussi les commentaires de section qui deviennent orphelins (`// ── Auth-protected (STAFF+) ──`, `// ── Auth-protected (ADMIN+) ──`, `// ── Stripe Connect (OWNER) ──`) : remplacer ces trois commentaires par une seule section unifiée `// ── Auth-protected (admin) ─────────────────────────────────────────────────` placée avant le premier `getOrders` existant.

Autrement dit, consolider les trois bandeaux rôle-spécifiques en un seul bandeau neutre.

- [ ] **Step 3: Vérifier qu'il ne reste aucune référence**

Run: via Grep, `getMembers|inviteMember|removeMember|RestaurantMember` dans `frontend/`.
Expected: les seuls résultats sont dans `components/admin/members-tab.tsx` et `app/members/accept/*`, qui seront supprimés à la Task 13.

---

## Task 13: Update frontend pages

**Files:**
- Modify: `frontend/app/admin/page.tsx`
- Modify: `frontend/app/admin/[restaurantId]/page.tsx`
- Modify: `frontend/app/admin/stripe/return/page.tsx`
- Modify: `frontend/app/admin/stripe/refresh/page.tsx`

- [ ] **Step 1: `app/admin/page.tsx`**

Remplacer (ligne 31) :

```ts
        const firstId = data.restaurantMembers?.[0]?.restaurantId;
```

par :

```ts
        const firstId = data.restaurants?.[0]?.id;
```

- [ ] **Step 2: `app/admin/[restaurantId]/page.tsx`**

Remplacer (lignes 119-122) :

```ts
      const memberIds: string[] =
        meData.restaurantMembers?.map(
          (m: { restaurantId: string }) => m.restaurantId,
        ) ?? [];
```

par :

```ts
      const memberIds: string[] =
        meData.restaurants?.map((r: { id: string }) => r.id) ?? [];
```

(On conserve le nom `memberIds` local pour minimiser le diff — c'est sémantiquement des IDs de restaurant possédés.)

- [ ] **Step 3: `app/admin/stripe/return/page.tsx`**

Remplacer (ligne 32) :

```ts
        const restaurantId = data.restaurantMembers?.[0]?.restaurantId;
```

par :

```ts
        const restaurantId = data.restaurants?.[0]?.id;
```

- [ ] **Step 4: `app/admin/stripe/refresh/page.tsx`**

Remplacer (ligne 29) :

```ts
        const restaurantId = data.restaurantMembers?.[0]?.restaurantId;
```

par :

```ts
        const restaurantId = data.restaurants?.[0]?.id;
```

---

## Task 14: Remove members UI

**Files:**
- Delete: `frontend/components/admin/members-tab.tsx`
- Delete: `frontend/app/members/accept/page.tsx`
- Delete: `frontend/app/members/accept/accept-client.tsx`
- Modify: tout composant référençant `members-tab`

- [ ] **Step 1: Identifier les références à `members-tab`**

Run: via Grep, chercher `members-tab|MembersTab` dans `frontend/`.
Pour chaque fichier qui importe ou affiche l'onglet Members, retirer l'import, retirer le rendu du composant, et retirer l'entrée de navigation correspondante (typiquement un objet ou un array de tabs).

Fichier attendu : `frontend/app/admin/[restaurantId]/page.tsx` contient la navigation entre tabs admin. Ouvrir le fichier, repérer où `MembersTab` est rendu (souvent dans un `switch` ou un array de configuration), et supprimer l'entrée.

- [ ] **Step 2: Supprimer les fichiers**

Run:

```bash
rm /Users/valentinwestermeyer/Documents/Dev/servr/frontend/components/admin/members-tab.tsx
rm /Users/valentinwestermeyer/Documents/Dev/servr/frontend/app/members/accept/page.tsx
rm /Users/valentinwestermeyer/Documents/Dev/servr/frontend/app/members/accept/accept-client.tsx
rmdir /Users/valentinwestermeyer/Documents/Dev/servr/frontend/app/members/accept 2>/dev/null || true
rmdir /Users/valentinwestermeyer/Documents/Dev/servr/frontend/app/members 2>/dev/null || true
```

(`rmdir` sans `-r` pour ne supprimer que si vide — sécurité au cas où un fichier aurait été ajouté.)

- [ ] **Step 3: Vérifier le type-check et le build**

Run: `cd frontend && npx tsc --noEmit`
Expected: aucune erreur.

Run: `cd frontend && npm run build`
Expected: build réussi.

- [ ] **Step 4: Lancer la UI localement et valider le golden path**

Run: `cd frontend && npm run dev` (dans un terminal persistant).

Dans un navigateur, vérifier :
- `/admin` redirige vers `/admin/<restaurantId>` pour un user avec un restaurant.
- La page admin du restaurant charge sans erreur dans la console.
- L'onglet "Members" n'apparaît plus.
- `/members/accept?token=xyz` renvoie 404.

Si une page d'erreur apparaît, diagnostiquer avant de commit.

- [ ] **Step 5: Commit**

```bash
cd /Users/valentinwestermeyer/Documents/Dev/servr
git add -A frontend/
git commit -m "refactor(frontend): drop members UI and use user.restaurants

- Remove RestaurantMember type and members API helpers.
- Replace user.restaurantMembers reads with user.restaurants in admin pages.
- Delete MembersTab component and /members/accept route.
- Collapse role-scoped banners in api.ts to a single 'admin' section."
```

---

## Task 15: Update documentation

**Files:**
- Modify: `api/CLAUDE.md`
- Modify: `api/README.md`
- Modify: `api/docs/openapi.json`
- Modify: `api/docs/api.md`, `api/docs/users.md`, `api/docs/restaurants.md`, `api/docs/menu.md`, `api/docs/orders.md`

- [ ] **Step 1: `api/CLAUDE.md`**

Dans la section `### Base de donnees` :
- Retirer `RestaurantMember` de la liste des modèles.
- Supprimer la ligne `- **Roles** : \`OWNER\` > \`ADMIN\` > \`STAFF\` ...`.

Dans la section `role.middleware.js` du diagramme de structure :
- Remplacer `isOwner / isAdmin / isStaff — verifie les permissions via restaurantMembers` par `isRestaurantAdmin — verifie que req.user est l'admin du restaurant via Restaurant.adminId`.

Dans "Authentification" :
- Remplacer `charge le user depuis la table \`users\` avec ses \`restaurantMembers\`` par `charge le user depuis la table \`users\` avec ses \`restaurants\``.

Dans "Règles importantes", remplacer la règle 7 :
- Ancien : `Verifier les permissions : les routes modifiant des donnees restaurant doivent passer par \`isAdmin\` ou \`isOwner\``.
- Nouveau : `Verifier les permissions : les routes modifiant des donnees restaurant doivent passer par \`isRestaurantAdmin\``.

- [ ] **Step 2: `api/README.md`**

Retirer toute mention de `OWNER`, `ADMIN`, `STAFF`, `RestaurantMember`, invitations. Simplifier la section sur les rôles à "un user est admin de 0..N restaurants (via `Restaurant.adminId`)".

- [ ] **Step 3: `api/docs/openapi.json`**

Retirer :
- Les endpoints sous le path `/restaurants/{restaurantId}/members` et `/members/accept`.
- Les schémas OpenAPI `RestaurantMember`, `InvitationToken`, les enums `RestaurantRole`, et toute référence à ces schémas.
- Les tags ou descriptions qui parlent de "staff" ou "invitation".

- [ ] **Step 4: `api/docs/*.md`**

Parcourir `api/docs/api.md`, `users.md`, `restaurants.md`, `menu.md`, `orders.md` et retirer toute mention de `OWNER`, `ADMIN`, `STAFF`, `RestaurantMember`, `inviteMember`, `acceptInvitation`.

Remplacer par des descriptions neutres : "requiert que l'utilisateur soit admin du restaurant" au lieu de "requiert le rôle OWNER/ADMIN/STAFF".

- [ ] **Step 5: Vérifier aucune mention résiduelle**

Via Grep, chercher dans `api/docs/` et `api/*.md` :
- `RestaurantMember`
- `restaurantMember`
- `inviteMember`
- `acceptInvitation`
- `OWNER`, `ADMIN`, `STAFF` (en tant que rôles — attention à ne pas retirer le mot admin s'il est utilisé au sens général "interface admin")

- [ ] **Step 6: Commit**

```bash
cd /Users/valentinwestermeyer/Documents/Dev/servr
git add api/CLAUDE.md api/README.md api/docs/
git commit -m "docs: update docs after staff-system removal"
```

---

## Task 16: Final verification

**Files:**
- None (verification only)

- [ ] **Step 1: Backend — toute la suite de tests**

Run: `cd api && npm test`
Expected: tous les tests passent, aucun test n'est skippé pour de mauvaises raisons.

- [ ] **Step 2: Backend — lint**

Run: `cd api && npx eslint .`
Expected: aucune erreur. (Si le projet n'a pas de script `lint` npm configuré, appeler directement `eslint` comme ci-dessus.)

- [ ] **Step 3: Backend — démarrage propre**

Run: `cd api && timeout 8 npm run dev 2>&1 | head -40`
Expected: le serveur démarre, les logs ne contiennent aucune erreur de module manquant.

- [ ] **Step 4: Frontend — type-check et build**

Run: `cd frontend && npx tsc --noEmit && npm run build`
Expected: aucune erreur.

- [ ] **Step 5: End-to-end smoke test**

Lancer `npm run dev` côté api ET frontend dans deux terminaux.

Dans un navigateur :
1. Se connecter avec ton compte.
2. Aller sur `/admin` — redirection vers `/admin/<restaurantId>`.
3. Vérifier que la liste des produits, l'onglet commandes, les stats, les horaires d'ouverture, les horaires exceptionnels, et les promo codes s'affichent et peuvent être édités.
4. Tenter de naviguer vers un restaurantId fictif (ex: `/admin/00000000-0000-0000-0000-000000000000`) — doit rediriger vers `/admin`.
5. L'onglet Members n'apparaît plus.
6. `/members/accept?token=x` est introuvable (404).

Documenter le résultat. Si une fonctionnalité casse, diagnostiquer et créer une tâche de correction avant de clore.

- [ ] **Step 6: Merge commit final si tout est vert**

Cette étape est optionnelle et dépend du workflow git choisi par l'utilisateur. Ne pas pusher ni ouvrir de PR sans confirmation explicite.
