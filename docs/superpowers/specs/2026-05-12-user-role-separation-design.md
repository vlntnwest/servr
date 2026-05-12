# Design — Séparation client / restaurateur

**Date :** 2026-05-12
**Statut :** Approuvé

---

## Contexte

Actuellement, tous les utilisateurs partagent le même modèle `User` sans notion de rôle. Un user devient implicitement "restaurateur" s'il possède des restaurants liés via `Restaurant.adminId`. Cela pose deux problèmes :

- Aucun garde-fou ne bloque un client lambda d'accéder aux pages `/admin`
- Le flux d'inscription redirige tout le monde vers `/admin`, même les clients

---

## Objectif

- Distinguer explicitement les rôles `CUSTOMER` et `RESTAURATEUR`
- Proposer des flux d'inscription séparés selon le rôle
- Protéger les routes `/admin` (frontend) et les endpoints sensibles (backend) contre les clients

---

## Partie 1 — Base de données

### Schéma Prisma

Ajout d'un enum et d'un champ sur `User` :

```prisma
enum UserRole {
  CUSTOMER
  RESTAURATEUR

  @@map("user_role")
  @@schema("public")
}

model User {
  // ...champs existants...
  role UserRole @default(CUSTOMER)
}
```

### Trigger Supabase

Le trigger `on_auth_user_created` (qui peuple `public.users` à chaque signup Supabase Auth) est modifié pour lire le rôle depuis les métadonnées :

```sql
INSERT INTO public.users (id, email, role)
VALUES (
  new.id,
  new.email,
  COALESCE(
    new.raw_user_meta_data->>'role',
    'CUSTOMER'
  )::user_role
);
```

Les users existants conservent leur rôle actuel (migration avec `@default(CUSTOMER)`).

---

## Partie 2 — Backend (API)

### Middleware `isRestaurateur`

Nouveau middleware dans `middleware/role.middleware.js` (à côté de `isRestaurantAdmin` existant) :

```js
const isRestaurateur = (req, res, next) => {
  if (req.user?.role !== 'RESTAURATEUR') {
    return res.status(403).json({ error: 'Forbidden' });
  }
  next();
};
```

### Application

- Routes `POST /api/v1/restaurants` (création restaurant) → ajouter `isRestaurateur` après `checkAuth`
- Routes admin restaurant (`PUT`, `DELETE`) → déjà protégées par `isRestaurantAdmin`, pas de changement nécessaire

Le `checkAuth` existant n'est pas modifié : il charge déjà le user complet depuis la DB, donc `req.user.role` est disponible automatiquement après la migration.

---

## Partie 3 — Frontend

### Pages d'inscription

| Page | Rôle | Redirection post-inscription |
|------|------|------------------------------|
| `/register` | `CUSTOMER` | `?redirect` ou `/` |
| `/register/restaurateur` | `RESTAURATEUR` | `/admin` |

Les deux pages ont le même formulaire (email + mot de passe). La différence est le rôle passé au `signUp` :

```ts
supabase.auth.signUp({
  email,
  password,
  options: { data: { role: 'CUSTOMER' } }, // ou 'RESTAURATEUR'
})
```

Le lien "Créer un compte" dans `customer-sheet.tsx` pointe vers `/register` (client uniquement).

### Garde-fous sur `/admin`

Les pages `admin/page.tsx`, `admin/create/page.tsx`, `admin/[restaurantId]/page.tsx` ajoutent une vérification du rôle après la vérification de session :

```ts
const { data: { user } } = await supabase.auth.getUser();
// Appel GET /api/v1/user/me pour obtenir le rôle
if (me.role !== 'RESTAURATEUR') {
  router.replace('/');
  return;
}
```

### Fix `/register` actuel

La page `/register` actuelle redirige vers `/admin` après inscription — corrigé vers `?redirect` ou `/`.

---

## Ce qui ne change pas

- L'app mobile (Expo) est pour les restaurateurs — pas de changement
- `isRestaurantAdmin` middleware existant — pas touché
- Les commandes clients (`Order.userId`) — pas touchées, un client peut commander sans compte (userId nullable)

---

## Ordre d'implémentation suggéré

1. Migration DB (enum + champ + trigger Supabase)
2. Backend : middleware `isRestaurateur` + application sur les routes
3. Frontend : fix `/register`, nouvelle page `/register/restaurateur`, garde-fous `/admin`
