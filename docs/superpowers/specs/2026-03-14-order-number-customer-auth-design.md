# Design — Numéro de commande & Inscription client

**Date :** 2026-03-14
**Statut :** Approuvé

---

## Contexte

Servr est une plateforme de commande en ligne pour restaurants. Deux fonctionnalités manquantes prioritaires ont été identifiées :
1. Les commandes n'ont pas de numéro lisible humainement
2. Les clients n'ont pas de compte (historique, profil, pré-remplissage)

Le guest checkout reste disponible dans les deux cas.

---

## 1. Numéro de commande

### Objectif

Chaque commande doit avoir un identifiant court, lisible, et unique — affiché sur la confirmation client et visible du staff restaurant.

### Décision

**Format :** 6 caractères alphanumériques — charset constant `ABCDEFGHJKLMNPQRSTUVWXYZ23456789` (sans O, 0, I, 1 pour éviter les ambiguïtés).
**Exemple :** `A4X9K2`
**Portée :** Globale (unique sur toute la plateforme).
**Génération :** Aléatoire côté applicatif, avec retry en cas de collision (max 5 tentatives). En cas d'échec après 5 tentatives : HTTP 500 `{ error: "Failed to generate unique order number" }`.

### Changements DB

```prisma
model Order {
  orderNumber String? @unique @map("order_number") // nullable pour migration
  // ... champs existants
}
```

**Stratégie de migration :**
- Le champ est ajouté **nullable** (`String?`) pour permettre la migration sur une DB avec des commandes existantes.
- Si la DB est vierge au lancement, le champ peut être rendu non-nullable après le premier déploiement via une seconde migration.
- Toute nouvelle commande créée après le déploiement aura toujours un `orderNumber`.

### Logique de génération

**Pattern recommandé : génération avant la transaction + retry sur erreur Prisma `P2002`.**

```js
// Générer le code AVANT la transaction
// Passer le code à la transaction
// Si la transaction échoue avec P2002 (unique constraint), retry
// Max 5 tentatives, puis HTTP 500
```

Ce pattern évite tout problème de deadlock lié à une vérification SELECT dans la transaction. La contrainte unique DB est le filet de sécurité réel.

**Les deux chemins de création de commande** (on-site payment et webhook Stripe) doivent tous les deux appeler `generateOrderNumber()` de façon identique.

### Affichage

- Page confirmation commande : `Commande #A4X9K2`
- **Chemin on-site payment :** `orderNumber` généré avant la transaction, disponible immédiatement dans la réponse et affiché sur la page confirmation.
- **Chemin Stripe :** `orderNumber` est généré dans le **webhook handler** (pas au moment de la création de la session). Il n'est donc **pas** dans les `metadata` de la session Stripe. La page de confirmation récupère l'`orderNumber` via l'API à partir de l'`orderId` ou du `session_id`.

---

## 2. Inscription & authentification client

### Objectif

Les clients peuvent créer un compte pour accéder à leur historique de commandes, pré-remplir leurs infos, et suivre leurs commandes. Le guest checkout reste disponible.

### Architecture

**Auth :** Supabase Auth existant — même système que le staff.
**Distinction client/staff :** Un user sans `RestaurantMember` est traité comme client. Un staff peut commander en tant que client avec le même compte.
**Pas de champ `role`** — la présence d'un `RestaurantMember` suffit.

### Changements DB

```prisma
model User {
  // champs ajoutés
  address String? @map("address")
  city    String? @map("city")
  zipCode String? @map("zip_code")

  // relation ajoutée (userId existe déjà sur Order comme String? nullable)
  orders  Order[]

  // ... champs existants (fullName, phone déjà présents)
}

model Order {
  // relation ajoutée
  user   User?   @relation(fields: [userId], references: [id])
  // userId String? @map("user_id") existe déjà dans le schéma
}
```

### Méthodes d'inscription

- Email + mot de passe
- Google OAuth
- Apple OAuth

Les providers OAuth sont activés dans le dashboard Supabase. Le frontend doit implémenter une route `/auth/callback` pour gérer l'échange PKCE Supabase après le redirect OAuth.

### Pages frontend (nouvelles)

| Route | Description |
|-------|-------------|
| `/auth/callback` | Handler OAuth — échange le code Supabase, redirige vers destination |
| `/register` | Inscription client (email/password ou social) |
| `/account` | Profil client — modifier nom, téléphone, adresse |
| `/account/orders` | Historique des commandes du client connecté |

### Redirect post-login

| Contexte | Redirect |
|----------|---------|
| Login client (`/login`) | Paramètre `?redirect=` ou `/` par défaut |
| Login staff (page dédiée) | `/admin` |
| Staff passant par `/login` client | Traité comme client → `/` |

**Sécurité redirect :** Le paramètre `redirect` est validé ainsi avant utilisation :
1. URL-décoder la valeur
2. Vérifier qu'elle commence par `/` et **pas** par `//` (pour éviter les protocol-relative redirects)
3. Vérifier qu'elle ne contient pas de domaine externe (`http://`, `https://`)
4. Si invalide → fallback vers `/`

Chemins autorisés exemples : `/`, `/account`, `/account/orders`, `/store/[slug]`.

### API — changements

**`PUT /api/user/me`** (existant) : étendu pour accepter `address`, `city`, `zipCode`. Le schéma Zod `updateUserSchema` est mis à jour avec les contraintes suivantes :

```js
address: z.string().max(200).optional(),
city:    z.string().max(100).optional(),
zipCode: z.string().regex(/^[0-9]{5}$/).optional(), // code postal français 5 chiffres
```

Cohérent avec les contraintes existantes sur le modèle `Restaurant`.

**`GET /api/user/me/orders`** (nouveau) :
- Authentification requise
- Requête par `userId` sur le modèle `Order`
- Tri : `createdAt DESC`
- Pagination : `?limit=20&offset=0` (limit max : 50)
- Réponse : `{ data: { orders: [...], total: N } }`

### Guest-to-user linking

**Limitation connue et acceptée au lancement :** Les commandes passées en guest (sans compte) ne sont pas automatiquement liées à un compte créé ultérieurement avec le même email. `GET /api/user/me/orders` ne retourne que les commandes où `Order.userId = req.user.id`. La migration des commandes guest vers un compte est hors scope pour cette version.

### OAuth callback

La route `/auth/callback` (Next.js App Router) gère l'échange de code PKCE Supabase. Après succès, redirige vers `?redirect=` ou `/` par défaut. C'est la même route utilisée pour Google et Apple.

---

## Ordre d'implémentation suggéré

1. **Numéro de commande** — migration DB + `generateOrderNumber()` + intégration dans les deux chemins de création + affichage frontend
2. **Inscription client** — migration DB (champs User + relation Order) + Zod schema update + pages register/account/auth-callback + redirect post-login + endpoint orders

---

## Hors scope (à traiter séparément)

- Inscription restaurant (onboarding Stripe Connect inclus)
- Checkout branché (Direct Charges Stripe)
- Fusion des commandes guest vers compte utilisateur
- Design shadcn
- Landing page
- App mobile
