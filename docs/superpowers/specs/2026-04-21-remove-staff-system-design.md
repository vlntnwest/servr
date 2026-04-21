# Suppression du système multi-rôles / staff

**Date :** 2026-04-21
**Auteur :** Valentin Westermeyer (via Claude Code brainstorming)

## Contexte

Aujourd'hui le backend gère les accès à un restaurant via une table de jonction `restaurant_members` qui lie des `users` à des `restaurants` avec un rôle parmi `OWNER` / `ADMIN` / `STAFF`. Un système d'invitation (`invitation_tokens`) permet d'ajouter des membres par email.

Cette complexité n'est pas utile pour l'usage réel : il n'y a qu'un seul compte et un seul restaurant. Tout le système de hiérarchie, les invitations, l'onglet "Members" côté frontend et les middlewares `isOwner`/`isAdmin`/`isStaff` sont à supprimer.

## Objectif

Passer à un modèle simple : **un restaurant a exactement un admin** (le user qui l'a créé), **un user peut avoir 0..N restaurants**. Plus de table de jonction, plus de rôles, plus d'invitations.

La terminologie retenue est **`admin`** (et non `owner`).

## Non-objectifs

- Migration multi-tenant complexe : il n'y a qu'un user (OWNER) et un restaurant en base, migration triviale.
- Préservation des membres non-OWNER : il n'y en a pas ; les tables sont droppées.
- Rétrocompatibilité d'API : les endpoints `/api/members/*` sont supprimés, pas dépréciés.

## Architecture cible

### Schéma Prisma

```prisma
model User {
  id                String       @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
  // ... autres champs inchangés ...
  restaurants       Restaurant[]
}

model Restaurant {
  id                String       @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
  adminId           String       @map("admin_id") @db.Uuid
  // ... autres champs inchangés ...
  admin             User         @relation(fields: [adminId], references: [id], onDelete: Cascade, onUpdate: NoAction)
  // Relations supprimées : restaurantMembers, invitationTokens
}

// Supprimés : model RestaurantMember, model InvitationToken, enum RestaurantRole
```

Comportement de cascade : `onDelete: Cascade` sur `Restaurant.admin` → si on supprime un user, ses restaurants sont supprimés (et par cascade les categories, produits, orders, etc. qui sont déjà en Cascade sur `restaurantId`). Cohérent avec le reste du schéma.

### Middleware

Le fichier `middleware/role.middleware.js` est réduit à un seul middleware :

```js
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

`auth.middleware.js` est mis à jour pour charger `restaurants` au lieu de `restaurantMembers` dans le `include` Prisma.

## Migration des données

Une nouvelle migration Prisma est créée (dossier `prisma/migrations/YYYYMMDDHHMMSS_remove_staff_system/migration.sql`) avec le SQL suivant :

```sql
-- 1. Sécurité : vérifier qu'aucun restaurant ne se retrouvera orphelin
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
    RAISE EXCEPTION 'Migration abortée : % restaurant(s) sans OWNER', orphan_count;
  END IF;
END $$;

-- 2. Ajout de admin_id (nullable temporairement, le temps du backfill)
ALTER TABLE restaurants
  ADD COLUMN admin_id uuid REFERENCES users(id) ON DELETE CASCADE;

-- 3. Backfill depuis restaurant_members (on prend le OWNER de chaque restaurant)
UPDATE restaurants r
SET admin_id = rm.user_id
FROM restaurant_members rm
WHERE rm.restaurant_id = r.id AND rm.role = 'OWNER';

-- 4. NOT NULL une fois backfillé
ALTER TABLE restaurants ALTER COLUMN admin_id SET NOT NULL;

-- 5. Drop des tables et types devenus inutiles
DROP TABLE IF EXISTS invitation_tokens;
DROP TABLE IF EXISTS restaurant_members;
DROP TYPE IF EXISTS restaurant_role;
```

Cas réel : 1 seul restaurant, 1 seul user (OWNER), donc le step 1 passe, le step 3 backfill la ligne unique, les drops sont propres.

## Fichiers à supprimer

**Backend :**
- `api/controllers/member.controllers.js`
- `api/routes/member.routes.js`
- Montage `app.use("/api/members", ...)` dans `api/app.js`
- Tests concernés : tout test ciblant `member.controllers` ou les invitations

**Frontend :**
- `frontend/components/admin/members-tab.tsx`
- `frontend/app/members/` (dossier complet — `accept/page.tsx` et `accept/accept-client.tsx`)
- Référence à l'onglet Members dans `frontend/app/admin/[restaurantId]/page.tsx`
- Fonctions API member/invitation dans `frontend/lib/api.ts`

## Fichiers à adapter

**Backend :**
- `api/prisma/schema.prisma` : modifications décrites plus haut.
- `api/middleware/role.middleware.js` : remplacé par le middleware unique `isRestaurantAdmin`.
- `api/middleware/auth.middleware.js` : `include: { restaurants: true }` au lieu de `restaurantMembers`.
- `api/controllers/restaurant.controllers.js` : à la création, `adminId: req.user.id` directement (plus de création de `RestaurantMember`). Le GET qui liste les restaurants de l'user lit `req.user.restaurants`.
- `api/controllers/user.controllers.js` : `GET /me` renvoie `restaurants` au lieu de `restaurantMembers`. Retirer le code mort lié.
- `api/controllers/admin.controllers.js` : s'il consulte des rôles pour déterminer les restaurants de l'admin, adapter à la nouvelle relation.
- Toutes les routes qui référençaient `isOwner`, `isAdmin` ou `isStaff` : remplacer par `isRestaurantAdmin`. Fichiers concernés (à vérifier à l'implémentation) : `menu.routes.js`, `order.routes.js`, `upload.routes.js`, `checkout.routes.js`, `exceptionalHour.routes.js`, `openingHour.routes.js`, `promoCode.routes.js`, `stats.routes.js`, `restaurant.routes.js`.
- `api/validators/schemas.js` : retirer les schémas `inviteMember`, `updateMemberRole`, `acceptInvitation`, et tout schéma ne référençant que le concept supprimé.
- `api/docs/*.md`, `api/docs/openapi.json`, `api/README.md`, `api/CLAUDE.md` : retirer les mentions de `RestaurantMember`, `STAFF`, `ADMIN`, `OWNER`, invitations. Mettre à jour la section "Base de données" pour refléter la suppression de `RestaurantMember` et `InvitationToken` et retirer la hiérarchie des rôles.

**Frontend :**
- `frontend/types/api.ts` : retirer `RestaurantMember`, `RestaurantRole`, `InvitationToken`. Le type `User` expose `restaurants: Restaurant[]` au lieu de `restaurantMembers`.
- `frontend/lib/api.ts` : retirer les fonctions member/invitation, ajuster celles qui lisent `user.restaurantMembers`.
- `frontend/components/admin/*` (en particulier `settings-tab.tsx`, `products-tab.tsx`, `categories-tab.tsx`) : tout endroit qui lisait `user.restaurantMembers[0].restaurant` ou un rôle devient `user.restaurants[0]` (plus de check de rôle).
- `frontend/app/admin/page.tsx`, `frontend/app/admin/[restaurantId]/page.tsx`, `frontend/app/page.tsx` : idem, lire directement `user.restaurants`.
- `frontend/contexts/` et `frontend/hooks/` : même traitement si un contexte ou un hook expose `restaurantMembers`.
- `frontend/app/admin/stripe/return/page.tsx` et `frontend/app/admin/stripe/refresh/page.tsx` : ajuster si ces pages accèdent au restaurant via les anciennes relations.

## Tests

- `api/tests/middleware/role.middleware.spec.js` : réécrit pour tester `isRestaurantAdmin` — un user membre (présent dans `user.restaurants`) passe, un user non-membre reçoit 403.
- `api/tests/middleware/auth.middleware.spec.js` : adapter les mocks pour renvoyer `restaurants` au lieu de `restaurantMembers`.
- `api/tests/controllers/restaurant.controllers.spec.js` : adapter la création (vérifier que `adminId` est set, plus la création d'un membre en DB).
- Tests `member.controllers` : supprimés.

On conserve le pattern d'intégration existant (contre Supabase réel).

## Impact et risques

- **Pas de régression utilisateur visible** : il n'y a qu'un user (OWNER) qui devient automatiquement admin de son restaurant. Tous les endpoints auxquels il avait accès auparavant restent accessibles.
- **Destructif** : `restaurant_members` et `invitation_tokens` sont droppées. Pas de rollback facile si on veut un jour re-introduire des rôles (il faudra réécrire les migrations). Acceptable vu le contexte.
- **Cascade user → restaurants** : supprimer un user supprime tous ses restaurants. Vu qu'il n'y a qu'un seul user et que c'est son propre compte, le risque est nul.

## Ordre d'implémentation (aperçu)

L'ordre précis sera détaillé dans le plan d'implémentation (étape suivante via `writing-plans`). Aperçu :

1. Schéma Prisma + migration SQL.
2. Middleware (`role.middleware.js`, `auth.middleware.js`).
3. Controllers + routes backend, suppression du module member.
4. Validators Zod + docs API.
5. Tests backend.
6. Frontend : types, API client, composants, pages.
7. Documentation projet (`Claude.md`, `README.md`).
