# Spécification Technique — Backend v2 (Source de vérité pour l'agent frontend Next.js)

> Généré le 2026-02-28. Basé sur une analyse directe du code source : routes, controllers, validators (Zod), schéma Prisma, middleware.

---

<api_v2_overview>

## Vue d'ensemble et changements drastiques v1 → v2

### Ce qui existait en v1 (état initial documenté dans Claude.md)

Le backend v1 ne couvrait que : users, restaurants, menu (catégories + produits basiques). Les orders, opening hours, Stripe, email, options de produits, codes promo, membres et stats n'existaient **pas**.

### Nouveautés v2 (toutes implémentées et actives)

| Domaine               | v1  | v2                                                                            |
| --------------------- | --- | ----------------------------------------------------------------------------- |
| Options produits      | ❌  | ✅ `OptionGroup` + `OptionChoice` (système de personnalisation multi-niveaux) |
| Commandes             | ❌  | ✅ Création publique + gestion staff (pagination, statuts)                    |
| Paiement              | ❌  | ✅ Stripe Connect avec fallback paiement sur place                            |
| Codes promo           | ❌  | ✅ PERCENTAGE / FIXED, limites, expiration                                    |
| Membres / Invitations | ❌  | ✅ Système d'invitation par email + rôles (OWNER/ADMIN/STAFF)                 |
| Horaires d'ouverture  | ❌  | ✅ Contrôle d'ouverture automatique à la commande                             |
| Statistiques          | ❌  | ✅ Revenue, commandes, top produits (day/week/month)                          |
| Upload images         | ❌  | ✅ Supabase Storage (JPEG/PNG/WebP/GIF, max 5 MB)                             |
| Email transactionnel  | ❌  | ✅ Confirmation de commande + invitation membre (Nodemailer)                  |

### Philosophie architecturale v2

1. **Multi-tenant restaurant-scoped** : presque toutes les ressources sont préfixées par `/:restaurantId`. Un utilisateur peut appartenir à plusieurs restaurants avec des rôles différents.
2. **Double montage de routes** : les routes sont enregistrées sous `/api` ET `/api/v1` simultanément (compatibilité). **Le nouveau frontend doit utiliser `/api/v1`**.
3. **Séparation strict public / protégé** : les routes de lecture du menu, de création de commande, et de validation de promo code sont **sans authentification**. Tout ce qui écrit en base (hors commande client) exige `ADMIN` ou `OWNER`.
4. **Réponses normalisées** : `{ data: ... }` (succès), `{ error: "..." }` (erreur), `{ message: "..." }` (confirmation sans données). Jamais de format ad-hoc.
5. **Validation Zod systématique** : tous les payloads entrants passent par le middleware `validate()` avant d'atteindre un controller. Les erreurs de validation retournent `400` avec `{ error: "Validation failed", details: [{ field: string, message: string }] }`.
6. **Calcul du prix côté serveur** : le total d'une commande est **recalculé serveur** à partir des prix en base. Le frontend n'envoie jamais un prix.

### Stack technique (à connaître pour le fetch côté Next.js)

- **Runtime** : Node.js v20+, Express v4
- **Base de données** : PostgreSQL (Supabase), ORM Prisma v7
- **Auth** : Supabase Auth — JWT vérifié via `supabase.auth.getUser(token)` côté backend
- **Paiement** : Stripe v17 (Stripe Connect — marketplace model)
- **Images** : Supabase Storage, bucket `images`, URLs publiques
- **Sentry** : monitoring d'erreurs activé si `SENTRY_DSN` est défini

### Rate Limiting (à respecter dans le frontend)

| Limiteur | Fenêtre | Max requêtes | S'applique à                        |
| -------- | ------- | ------------ | ----------------------------------- |
| Global   | 15 min  | 100 req/IP   | Toutes les routes                   |
| Auth     | 15 min  | 15 req/IP    | `/api/v1/user/*`                    |
| Payment  | 15 min  | 10 req/IP    | `/api/v1/checkout/*` (hors webhook) |

En dépassement : `429` avec `{ error: "Too many requests, please try again later." }`.

### CORS

Seule l'origine définie dans `CLIENT_URL` est autorisée. Le header `Authorization` est explicitement dans `allowedHeaders`. Les credentials sont activés (`credentials: true`).

</api_v2_overview>

---

<endpoints_documentation>

## Documentation exhaustive des endpoints

**Base URL** : `https://<host>/api/v1`

Légende : 🔓 Public | 🔑 Auth (Bearer JWT) | 👮 STAFF+ | 🛡️ ADMIN+ | 👑 OWNER seul

---

### 1. Santé

#### `GET /health`

🔓 Public. Pas de rate limit.

**Response 200**

```json
{ "status": "ok" }
```

---

### 2. User (`/user`)

#### `GET /user/me`

🔑 Auth

Retourne le profil de l'utilisateur authentifié (depuis la table `users` Postgres, pas de Supabase Auth).

**Response 200**

```json
{
  "data": {
    "id": "uuid",
    "email": "user@example.com",
    "fullName": "Jean Dupont",
    "phone": "+33612345678",
    "createdAt": "2024-01-01T00:00:00.000Z",
    "updatedAt": "2024-01-01T00:00:00.000Z",
    "restaurantMembers": [
      {
        "id": "uuid",
        "restaurantId": "uuid",
        "userId": "uuid",
        "role": "OWNER",
        "createdAt": "...",
        "updatedAt": "...",
        "restaurant": { "id": "uuid", "name": "...", "..." }
      }
    ]
  }
}
```

> ⚠️ Le champ `restaurantMembers` est inclus car le middleware `checkAuth` l'eager-load. Il peut être utilisé pour construire la navigation multi-restaurant côté frontend.

#### `PUT /user/me`

🔑 Auth

**Request body** (au moins un champ requis) :

```json
{
  "fullName": "string (1-50 chars, optionnel)",
  "phone": "string (format téléphone français, optionnel)"
}
```

Format téléphone accepté : regex `/^(?:(?:\+|00)33|0)\s*[1-9](?:[\s.-]*\d{2}){4}$/`
Exemples valides : `0612345678`, `+33612345678`, `06 12 34 56 78`

**Response 200**

```json
{
  "data": {
    /* User mis à jour */
  }
}
```

#### `DELETE /user/me`

🔑 Auth

Supprime le compte dans Supabase Auth (suppression en cascade côté DB via triggers Supabase).

**Response 200**

```json
{ "message": "User deleted successfully" }
```

---

### 3. Restaurants (`/restaurants`)

#### `GET /restaurants/:restaurantId`

🔓 Public

**Response 200**

```json
{
  "data": {
    "id": "uuid",
    "name": "Le Pokey",
    "address": "12 rue de la Paix",
    "zipCode": "75001",
    "city": "Paris",
    "phone": "0142000000",
    "email": "contact@lepokey.fr",
    "imageUrl": "https://...",
    "stripeAccountId": "acct_xxx",
    "createdAt": "...",
    "updatedAt": "..."
  }
}
```

> ⚠️ `stripeAccountId` est retourné dans la réponse. Le frontend peut vérifier sa présence pour savoir si le restaurant accepte le paiement en ligne ou seulement sur place.

#### `POST /restaurants`

🔑 Auth (devient OWNER du restaurant créé)

**Request body** :

```json
{
  "name": "string (1-50, requis)",
  "address": "string (1-255, requis)",
  "zipCode": "string (5 chiffres exactement, requis)",
  "city": "string (1-50, requis)",
  "phone": "string (format FR, requis)",
  "email": "string (email valide, optionnel)",
  "imageUrl": "string (URL valide, optionnel)"
}
```

**Response 201**

```json
{
  "data": {
    /* Restaurant créé */
  }
}
```

La création du restaurant crée automatiquement (dans une transaction) une entrée `RestaurantMember` avec `role: "OWNER"` pour l'utilisateur courant.

#### `PUT /restaurants/:restaurantId`

🔑 Auth + 🛡️ ADMIN

Tous les champs du `restaurantSchema` en optionnel (`.partial()`). Au moins un champ requis.

**Response 200**

```json
{
  "data": {
    /* Restaurant mis à jour */
  }
}
```

#### `DELETE /restaurants/:restaurantId`

🔑 Auth + 👑 OWNER

Supprime le restaurant et **en cascade** : membres, catégories, produits, option groups, commandes, promo codes, horaires.

**Response 200**

```json
{ "message": "Restaurant deleted successfully" }
```

---

### 4. Menu

> Le préfixe des routes menu est `/menu/restaurants/:restaurantId/...` (monté sous `/api/v1/menu`).

#### `GET /menu/restaurants/:restaurantId/menu`

🔓 Public

Retourne l'intégralité du menu : catégories ordonnées → produits → optionGroups → optionChoices.

**Response 200**

```json
{
  "data": [
    {
      "id": "uuid",
      "restaurantId": "uuid",
      "name": "Entrées",
      "subHeading": "Nos suggestions",
      "displayOrder": 1,
      "createdAt": "...",
      "updatedAt": "...",
      "productCategories": [
        {
          "id": "uuid",
          "productId": "uuid",
          "categorieId": "uuid",
          "product": {
            "id": "uuid",
            "restaurantId": "uuid",
            "name": "Poké Saumon",
            "description": "...",
            "imageUrl": "https://...",
            "price": "12.90",
            "tags": ["pescatarian", "bestseller"],
            "discount": "0.00",
            "isAvailable": true,
            "displayOrder": 1,
            "optionGroups": [
              {
                "id": "uuid",
                "restaurantId": "uuid",
                "name": "Taille",
                "hasMultiple": false,
                "isRequired": true,
                "minQuantity": 1,
                "maxQuantity": 1,
                "displayOrder": 0,
                "optionChoices": [
                  {
                    "id": "uuid",
                    "optionGroupId": "uuid",
                    "name": "Regular",
                    "priceModifier": "0.00",
                    "displayOrder": 0
                  },
                  {
                    "id": "uuid",
                    "optionGroupId": "uuid",
                    "name": "Large",
                    "priceModifier": "2.50",
                    "displayOrder": 1
                  }
                ]
              }
            ]
          }
        }
      ]
    }
  ]
}
```

> ⚠️ **`price` et `priceModifier` sont des strings** (type `Decimal` Prisma sérialisé en JSON). Parser avec `parseFloat()` côté frontend.
>
> ⚠️ `optionGroups` est le résultat d'un **flatten** côté serveur : la table pivot `productOptionGroups` est supprimée, `optionGroups` est un tableau direct sur le produit.

#### `GET /menu/restaurants/:restaurantId/products`

🔓 Public

**Query params** :
| Param | Type | Description |
|---|---|---|
| `q` | string (optionnel) | Recherche insensible à la casse sur `name` et `description` |
| `isAvailable` | `"true"` ou `"false"` (optionnel) | Filtre par disponibilité |

**Response 200** : `{ "data": Product[] }` — même format produit que dans `/menu` avec `optionGroups` flattened.

#### `GET /menu/restaurants/:restaurantId/products/:productId`

🔓 Public

**Response 200** : `{ "data": Product }` — inclut en plus `productCategories: [{ id, productId, categorieId, categorie: { ... } }]`.

#### `POST /menu/restaurants/:restaurantId/categories`

🔑 Auth + 🛡️ ADMIN

**Request body** :

```json
{
  "name": "string (1-50, requis)",
  "subHeading": "string (1-255, optionnel)",
  "displayOrder": "number (requis)"
}
```

**Response 201** : `{ "data": Categorie }`

#### `PUT /menu/restaurants/:restaurantId/categories/:categorieId`

🔑 Auth + 🛡️ ADMIN

**Request body** : tous champs optionnels (même schema que POST).

**Response 200** : `{ "data": Categorie }`

#### `DELETE /menu/restaurants/:restaurantId/categories/:categorieId`

🔑 Auth + 🛡️ ADMIN

**Response 200** : `{ "message": "Product categorie deleted" }`

#### `POST /menu/restaurants/:restaurantId/products`

🔑 Auth + 🛡️ ADMIN

**Request body** :

```json
{
  "name": "string (1-50, requis)",
  "description": "string (1-255, requis)",
  "imageUrl": "string (URL valide, requis)",
  "price": "number (requis)",
  "tags": ["string", "..."],
  "discount": "number (défaut 0)",
  "isAvailable": "boolean (défaut true)",
  "displayOrder": "number (défaut 999)",
  "categorieId": "uuid (requis)"
}
```

**Response 201** : `{ "data": Product }` (sans les joins optionGroups)

#### `PUT /menu/restaurants/:restaurantId/products/:productId`

🔑 Auth + 🛡️ ADMIN

Tous les champs optionnels. Si `categorieId` est fourni et différent, une **nouvelle** liaison `ProductCategorie` est créée (l'ancienne n'est pas supprimée automatiquement).

**Response 200** : `{ "data": Product }`

#### `DELETE /menu/restaurants/:restaurantId/products/:productId`

🔑 Auth + 🛡️ ADMIN

**Response 200** : `{ "message": "Product deleted" }`

---

#### Option Groups (niveau restaurant — réutilisables)

> Les option groups sont définis au niveau du restaurant, puis **liés** aux produits.

#### `GET /menu/restaurants/:restaurantId/option-groups`

🔑 Auth + 🛡️ ADMIN

**Response 200** :

```json
{
  "data": [
    {
      "id": "uuid",
      "restaurantId": "uuid",
      "name": "Taille",
      "hasMultiple": false,
      "isRequired": true,
      "minQuantity": 1,
      "maxQuantity": 1,
      "displayOrder": 0,
      "optionChoices": [
        /* OptionChoice[] */
      ]
    }
  ]
}
```

#### `POST /menu/restaurants/:restaurantId/option-groups`

🔑 Auth + 🛡️ ADMIN

**Request body** :

```json
{
  "name": "string (1-50, requis)",
  "hasMultiple": "boolean (défaut false)",
  "isRequired": "boolean (défaut false)",
  "minQuantity": "number (défaut 1)",
  "maxQuantity": "number (défaut 1)",
  "displayOrder": "number int (défaut 0)",
  "choices": [
    {
      "name": "string (1-50, requis)",
      "priceModifier": "number (défaut 0)",
      "displayOrder": "number int (défaut 0)"
    }
  ]
}
```

Le champ `choices` est optionnel et permet de créer les choix **en même temps** que le groupe (transaction atomique).

**Response 201** : `{ "data": OptionGroup }` avec `optionChoices` inclus.

#### `PUT /menu/restaurants/:restaurantId/option-groups/:optionGroupId`

🔑 Auth + 🛡️ ADMIN

Tous champs optionnels sauf `choices` (non modifiable ici, utiliser les routes option-choices).

**Response 200** : `{ "data": OptionGroup }` avec `optionChoices`.

#### `DELETE /menu/restaurants/:restaurantId/option-groups/:optionGroupId`

🔑 Auth + 🛡️ ADMIN

**Response 200** : `{ "message": "Option group deleted" }`

---

#### Lier / délier des option groups à un produit

#### `POST /menu/restaurants/:restaurantId/products/:productId/option-groups`

🔑 Auth + 🛡️ ADMIN

**Request body** :

```json
{
  "optionGroupIds": ["uuid", "uuid"]
}
```

`skipDuplicates: true` — idempotent.

**Response 200** : `{ "message": "Option groups linked" }`

#### `DELETE /menu/restaurants/:restaurantId/products/:productId/option-groups/:optionGroupId`

🔑 Auth + 🛡️ ADMIN

**Response 200** : `{ "message": "Option group unlinked" }`

---

#### Option Choices

#### `POST /menu/restaurants/:restaurantId/option-groups/:optionGroupId/option-choices`

🔑 Auth + 🛡️ ADMIN

**Request body** :

```json
{
  "name": "string (1-50, requis)",
  "priceModifier": "number (défaut 0)",
  "displayOrder": "number int (défaut 0)"
}
```

**Response 201** : `{ "data": OptionChoice }`

#### `POST /menu/restaurants/:restaurantId/option-groups/:optionGroupId/option-choices/bulk`

🔑 Auth + 🛡️ ADMIN

**Request body** : tableau d'`OptionChoice` (min 1) :

```json
[
  { "name": "string", "priceModifier": 0, "displayOrder": 0 },
  { "name": "string", "priceModifier": 1.5, "displayOrder": 1 }
]
```

**Response 201** : `{ "data": OptionChoice[] }` — tous les choix du groupe après création.

#### `PUT /menu/restaurants/:restaurantId/option-choices/:optionChoiceId`

🔑 Auth + 🛡️ ADMIN

**Request body** : `{ name?, priceModifier?, displayOrder? }`

**Response 200** : `{ "data": OptionChoice }`

#### `DELETE /menu/restaurants/:restaurantId/option-choices/:optionChoiceId`

🔑 Auth + 🛡️ ADMIN

**Response 200** : `{ "message": "Option choice deleted" }`

---

### 5. Commandes (`/restaurants/:restaurantId/orders`)

#### `POST /restaurants/:restaurantId/orders`

🔓 Public

Créé une commande avec paiement différé (sur place ou post-paiement). **Le prix total est calculé côté serveur.**

**Contrôles serveur** :

- Le restaurant doit être ouvert (vérification des `openingHours`) — sinon `400`
- Tous les `productId` doivent exister dans ce restaurant — sinon `404`
- Si `promoCode` fourni : vérifie validité, expiration, maxUses, minOrderAmount

**Request body** :

```json
{
  "fullName": "string (1-50, optionnel)",
  "phone": "string (format FR, optionnel)",
  "email": "string (email, optionnel)",
  "items": [
    {
      "productId": "uuid",
      "quantity": "number int (min 1)",
      "optionChoiceIds": ["uuid", "..."]
    }
  ],
  "promoCode": "string (1-50, optionnel)"
}
```

**Response 201**

```json
{
  "data": {
    "id": "uuid",
    "restaurantId": "uuid",
    "fullName": "Jean Dupont",
    "phone": "0612345678",
    "email": "jean@example.com",
    "status": "PENDING",
    "totalPrice": "25.40",
    "stripePaymentIntentId": null,
    "createdAt": "...",
    "orderProducts": [
      {
        "id": "uuid",
        "orderId": "uuid",
        "productId": "uuid",
        "quantity": 2,
        "product": {
          /* Product */
        },
        "orderProductOptions": [
          {
            "id": "uuid",
            "orderProductId": "uuid",
            "optionChoiceId": "uuid",
            "optionChoice": {
              /* OptionChoice */
            }
          }
        ]
      }
    ]
  }
}
```

Un email de confirmation est envoyé à `email` si fourni.

#### `GET /restaurants/:restaurantId/orders`

🔑 Auth + 👮 STAFF

**Query params** :
| Param | Type | Défaut | Max |
|---|---|---|---|
| `page` | number | 1 | — |
| `limit` | number | 20 | 100 |

**Response 200** :

```json
{
  "data": [
    /* Order[] avec orderProducts inclus */
  ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 142,
    "totalPages": 8
  }
}
```

Ordonnées par `createdAt DESC`.

#### `GET /restaurants/:restaurantId/orders/:orderId`

🔑 Auth + 👮 STAFF

**Response 200** : `{ "data": Order }` avec `orderProducts` + `orderProductOptions` inclus.

#### `PATCH /restaurants/:restaurantId/orders/:orderId/status`

🔑 Auth + 👮 STAFF

**Request body** :

```json
{
  "status": "PENDING | IN_PROGRESS | COMPLETED | DELIVERED | CANCELLED | PENDING_ON_SITE_PAYMENT"
}
```

**Response 200** : `{ "data": Order }` (sans include des products)

---

### 6. Checkout / Paiement Stripe

#### `POST /checkout/create-session`

🔓 Public (rate limit: 10 req/15min/IP)

Point d'entrée principal du tunnel de commande payante.

**Cas 1 — Restaurant avec Stripe Connect** (`stripeAccountId` présent) :

**Request body** :

```json
{
  "restaurantId": "uuid",
  "fullName": "string (1-50, optionnel)",
  "phone": "string (format FR, optionnel)",
  "email": "string (email, optionnel)",
  "items": [
    {
      "productId": "uuid",
      "quantity": "number int (min 1)",
      "optionChoiceIds": ["uuid"]
    }
  ]
}
```

> ⚠️ Pas de `promoCode` dans le checkout Stripe — les promos ne s'appliquent qu'à la route `/orders`.

**Response 201** :

```json
{
  "data": {
    "sessionId": "cs_test_xxx",
    "url": "https://checkout.stripe.com/pay/cs_test_xxx"
  }
}
```

Le frontend doit rediriger vers `data.url`. La commission plateforme de **5%** est appliquée automatiquement.

Les `success_url` / `cancel_url` sont configurés côté backend : `${CLIENT_URL}/order/success?session_id={CHECKOUT_SESSION_ID}` et `${CLIENT_URL}/order/cancel`.

**Cas 2 — Restaurant sans Stripe** (`stripeAccountId` absent) :

La commande est créée directement avec `status: "PENDING_ON_SITE_PAYMENT"`.

**Response 201** :

```json
{
  "data": {
    "order": {
      /* Order complet */
    },
    "paymentMethod": "on_site"
  }
}
```

#### `POST /checkout/webhook`

Stripe uniquement. Body en `raw` (pas JSON parsé). Header : `stripe-signature`.

Traite l'événement `checkout.session.completed` : crée la commande en base avec `status: "PENDING"` et `stripePaymentIntentId` renseigné.

**Response 200** : `{ "received": true }`

> ⚠️ **Ne jamais appeler ce endpoint depuis le frontend.** En cas d'erreur 5xx, Stripe retentera automatiquement.

#### `POST /checkout/restaurants/:restaurantId/orders/:orderId/refund`

🔑 Auth + 🛡️ ADMIN

Rembourse via `stripe.refunds.create()` avec `reverse_transfer: true` (annulation du virement Connect) et met le statut de la commande à `CANCELLED`.

**Pré-conditions** :

- La commande doit avoir un `stripePaymentIntentId`
- La commande ne doit pas être déjà `CANCELLED`

**Response 200** :

```json
{
  "data": {
    "order": {
      /* Order avec status CANCELLED */
    },
    "refund": {
      "id": "re_xxx",
      "status": "succeeded"
    }
  }
}
```

---

### 7. Membres (`/restaurants/:restaurantId/members`)

#### `GET /restaurants/:restaurantId/members`

🔑 Auth + 🛡️ ADMIN

**Query** : `?page=1&limit=20` (max 100)

**Response 200** :

```json
{
  "data": [
    {
      "id": "uuid",
      "restaurantId": "uuid",
      "userId": "uuid",
      "role": "OWNER",
      "createdAt": "...",
      "user": {
        "id": "uuid",
        "email": "owner@example.com",
        "fullName": "Marie Martin",
        "phone": "0601020304"
      }
    }
  ],
  "pagination": {
    /* ... */
  }
}
```

#### `POST /restaurants/:restaurantId/members/invite`

🔑 Auth + 👑 OWNER

Envoie un email d'invitation (valable 7 jours). Si l'utilisateur est déjà membre : `409`.

**Request body** :

```json
{
  "email": "string (email valide, requis)",
  "role": "ADMIN | STAFF (défaut STAFF)"
}
```

**Response 201** : `{ "message": "Invitation sent" }`

#### `PATCH /restaurants/:restaurantId/members/:memberId/role`

🔑 Auth + 👑 OWNER

Impossible de modifier le rôle d'un `OWNER`.

**Request body** :

```json
{
  "role": "ADMIN | STAFF"
}
```

**Response 200** : `{ "data": RestaurantMember }`

#### `DELETE /restaurants/:restaurantId/members/:memberId`

🔑 Auth + 👑 OWNER

Impossible de supprimer le `OWNER`. Supprime uniquement le lien `RestaurantMember`.

**Response 200** : `{ "message": "Member removed successfully" }`

#### `POST /members/accept`

🔑 Auth (l'invité doit être connecté)

Accepte une invitation par token. Vérifie que l'email du token correspond à celui de l'utilisateur connecté.

**Request body** :

```json
{
  "token": "string (hex 64 chars)"
}
```

**Response 201** : `{ "data": RestaurantMember }`

---

### 8. Horaires d'ouverture

#### `GET /restaurants/:restaurantId/opening-hours`

🔓 Public

**Response 200** :

```json
{
  "data": [
    {
      "id": "uuid",
      "restaurantId": "uuid",
      "dayOfWeek": 1,
      "openTime": "11:30",
      "closeTime": "22:00",
      "order": 0
    }
  ]
}
```

`dayOfWeek` : `0` = Dimanche, `1` = Lundi, ..., `6` = Samedi (convention JavaScript `Date.getDay()`).

`openTime` / `closeTime` : format `HH:MM` (string). La comparaison est lexicographique.

#### `PUT /restaurants/:restaurantId/opening-hours`

🔑 Auth + 🛡️ ADMIN

**Comportement destructif** : supprime tous les horaires existants et les recrée dans une transaction.

**Request body** : tableau (peut être vide pour supprimer tous les horaires) :

```json
[
  {
    "dayOfWeek": 1,
    "openTime": "11:30",
    "closeTime": "22:00",
    "order": 0
  }
]
```

**Validation** : `dayOfWeek` ∈ [0,6] ; `openTime`/`closeTime` regex `/^\d{2}:\d{2}$/`.

**Response 200** : `{ "data": OpeningHour[] }`

---

### 9. Statistiques

#### `GET /restaurants/:restaurantId/stats`

🔑 Auth + 🛡️ ADMIN

**Query** :
| Param | Valeurs | Défaut |
|---|---|---|
| `period` | `day` \| `week` \| `month` | `month` |

- `day` → depuis minuit aujourd'hui
- `week` → depuis le dimanche de la semaine courante (minuit)
- `month` → depuis le 1er du mois courant (minuit)

Les commandes `CANCELLED` sont exclues du calcul.

**Response 200** :

```json
{
  "data": {
    "period": "month",
    "since": "2026-02-01T00:00:00.000Z",
    "totalOrders": 42,
    "revenue": 1284.5,
    "popularProducts": [
      { "name": "Poké Saumon", "count": 18 },
      { "name": "Poké Thon", "count": 12 }
    ]
  }
}
```

`revenue` est en euros. `popularProducts` : top 5 par quantité totale vendue.

---

### 10. Upload d'images

#### `POST /restaurants/:restaurantId/upload`

🔑 Auth + 🛡️ ADMIN

**Content-Type** : `multipart/form-data`

| Champ   | Type | Contraintes                     |
| ------- | ---- | ------------------------------- |
| `image` | File | JPEG, PNG, WebP, GIF — max 5 MB |

L'image est stockée dans le bucket Supabase `images` sous le path `restaurants/{restaurantId}/{timestamp}-{random}.{ext}`.

**Response 201** :

```json
{
  "data": {
    "url": "https://<supabase-project>.supabase.co/storage/v1/object/public/images/restaurants/uuid/1234567890-abc123.jpg"
  }
}
```

L'URL retournée est **publique** (sans expiration). À stocker en tant que `imageUrl` d'un restaurant ou produit.

---

### 11. Codes promo

#### `POST /restaurants/:restaurantId/promo-codes/validate`

🔓 Public

Permet au frontend de pré-valider un code et d'afficher la réduction **avant** de soumettre la commande.

**Request body** :

```json
{
  "code": "string (min 1, requis)",
  "orderTotal": "number (positif, requis)"
}
```

**Response 200** :

```json
{
  "data": {
    "code": "ETE10",
    "discountType": "PERCENTAGE",
    "discountValue": 10,
    "discountAmount": 2.59,
    "finalTotal": 23.31
  }
}
```

**Erreurs possibles** : `404` code introuvable, `400` inactif / expiré / maxUses atteint / montant min non atteint.

#### `GET /restaurants/:restaurantId/promo-codes`

🔑 Auth + 🛡️ ADMIN

**Response 200** :

```json
{
  "data": [
    {
      "id": "uuid",
      "restaurantId": "uuid",
      "code": "ETE10",
      "discountType": "PERCENTAGE",
      "discountValue": "10.00",
      "minOrderAmount": "15.00",
      "maxUses": 100,
      "usedCount": 23,
      "expiresAt": "2026-09-01T00:00:00.000Z",
      "isActive": true,
      "createdAt": "..."
    }
  ]
}
```

#### `POST /restaurants/:restaurantId/promo-codes`

🔑 Auth + 🛡️ ADMIN

**Request body** :

```json
{
  "code": "string (1-50, requis — stocké en MAJUSCULES)",
  "discountType": "PERCENTAGE | FIXED",
  "discountValue": "number (positif, requis)",
  "minOrderAmount": "number (positif, optionnel)",
  "maxUses": "number int (positif, optionnel)",
  "expiresAt": "string (ISO datetime, optionnel)",
  "isActive": "boolean (défaut true)"
}
```

Unicité : `(restaurantId, code)` — `409` si doublon.

**Response 201** : `{ "data": PromoCode }`

#### `DELETE /restaurants/:restaurantId/promo-codes/:promoCodeId`

🔑 Auth + 🛡️ ADMIN

**Response 200** : `{ "message": "Promo code deleted" }`

---

### Codes d'erreur standards

| HTTP  | Signification                                     | Format                                                                                             |
| ----- | ------------------------------------------------- | -------------------------------------------------------------------------------------------------- |
| `400` | Validation Zod échouée                            | `{ "error": "Validation failed", "details": [{ "field": "items.0.quantity", "message": "..." }] }` |
| `400` | Erreur métier (restaurant fermé, promo invalide…) | `{ "error": "..." }`                                                                               |
| `401` | Token absent ou invalide                          | `{ "error": "Not authenticated" }` ou `{ "error": "Invalid token" }`                               |
| `403` | Rôle insuffisant                                  | `{ "error": "Access denied" }`                                                                     |
| `404` | Ressource introuvable                             | `{ "error": "Resource not found" }` ou message spécifique                                          |
| `409` | Conflit (doublon)                                 | `{ "error": "Resource already exists" }`                                                           |
| `429` | Rate limit dépassé                                | `{ "error": "Too many requests, please try again later." }`                                        |
| `500` | Erreur serveur                                    | `{ "error": "Internal server error" }`                                                             |

</endpoints_documentation>

---

<auth_and_state>

## Authentification et gestion des sessions

### Mécanisme global

L'authentification est **100% déléguée à Supabase Auth** côté client. Le backend ne gère pas d'inscription ni de connexion directe. Il reçoit uniquement le JWT émis par Supabase et le vérifie.

### Flux complet

```
1. Frontend → supabase.auth.signInWithPassword({ email, password })
2. Supabase Auth → retourne { session: { access_token, refresh_token, ... }, user }
3. Frontend → stocke la session (Supabase SDK la gère automatiquement en localStorage)
4. Frontend → appel API → Header: Authorization: Bearer <access_token>
5. Backend auth.middleware → supabase.auth.getUser(access_token) — vérifie le JWT
6. Backend → prisma.user.findUnique({ where: { id: user.id }, include: { restaurantMembers } })
7. req.user = { id, email, fullName, phone, restaurantMembers: [...] }
8. role.middleware → vérifie req.user.restaurantMembers pour le restaurantId concerné
```

### Ce que `req.user` contient (disponible dans tous les controllers protégés)

```typescript
type ReqUser = {
  id: string; // UUID — même ID que Supabase Auth user.id
  email: string | null;
  fullName: string | null;
  phone: string | null;
  createdAt: Date | null;
  updatedAt: Date | null;
  restaurantMembers: Array<{
    id: string;
    restaurantId: string;
    userId: string;
    role: "OWNER" | "ADMIN" | "STAFF";
    createdAt: Date | null;
    updatedAt: Date | null;
    restaurant: { id: string; name: string /* ... */ };
  }>;
};
```

### Hiérarchie des rôles

```
OWNER > ADMIN > STAFF
```

| Middleware | Qui passe             |
| ---------- | --------------------- |
| `isStaff`  | STAFF + ADMIN + OWNER |
| `isAdmin`  | ADMIN + OWNER         |
| `isOwner`  | OWNER uniquement      |

Le check est fait sur `restaurantMembers` filtré par le `restaurantId` de la route. Un utilisateur peut être OWNER d'un restaurant et STAFF d'un autre.

### Gestion du refresh token

Le SDK Supabase JS gère le refresh automatique. Le frontend ne doit **pas** gérer manuellement les refresh tokens. Utiliser `supabase.auth.getSession()` pour obtenir la session courante et `session.access_token` pour les appels API.

Pour écouter les changements de session :

```js
supabase.auth.onAuthStateChange((event, session) => {
  // event: SIGNED_IN, SIGNED_OUT, TOKEN_REFRESHED, etc.
  // session?.access_token à utiliser dans les headers
});
```

### Suppression de compte

`DELETE /api/v1/user/me` appelle `supabase.auth.admin.deleteUser(id)` côté backend, ce qui invalide immédiatement toutes les sessions. Le frontend doit appeler `supabase.auth.signOut()` localement après.

### CORS — header obligatoire

```
Authorization: Bearer <access_token>
```

Le header `Authorization` est dans la liste blanche CORS. Pas de cookie d'authentification — le backend est stateless.

</auth_and_state>

---

<nextjs_migration_tips>

## Guide de migration React → Next.js

### Principe directeur : déplacer le maximum de fetching vers les Server Components

La nouvelle API v2 a une séparation claire public/protégé qui s'aligne parfaitement avec le modèle Next.js App Router.

---

### Routes publiques → Server Components (RSC)

Ces routes ne nécessitent pas de token et peuvent être fetchées directement dans les Server Components (pas d'accès au localStorage, pas de Supabase SDK) :

| Endpoint                                 | Usage recommandé                                        |
| ---------------------------------------- | ------------------------------------------------------- |
| `GET /restaurants/:id`                   | `page.tsx` du restaurant (layout côté serveur)          |
| `GET /menu/restaurants/:id/menu`         | Page menu complète — fetch côté serveur, cache agressif |
| `GET /menu/restaurants/:id/products`     | Search page, `searchParams` passés au fetch             |
| `GET /menu/restaurants/:id/products/:id` | Page produit avec `generateStaticParams` si menu stable |
| `GET /restaurants/:id/opening-hours`     | Composant de statut "ouvert/fermé" (côté serveur)       |

```typescript
// app/[restaurantId]/menu/page.tsx
export default async function MenuPage({ params }: { params: { restaurantId: string } }) {
  const res = await fetch(`${process.env.API_URL}/api/v1/menu/restaurants/${params.restaurantId}/menu`, {
    next: { revalidate: 60 }, // revalider toutes les 60s (ISR)
  });
  const { data } = await res.json();
  // data = Category[] avec products et optionGroups
  return <MenuDisplay categories={data} />;
}
```

---

### Routes protégées → Client Components + Supabase SDK

Les endpoints nécessitant un Bearer token **ne peuvent pas** être appelés dans des Server Components sans passer le token via cookies ou headers. Deux approches :

**Approche A — Client Components (recommandé pour les actions utilisateur)**

```typescript
// hooks/useApi.ts (Client Component)
"use client";
import { createClient } from "@/lib/supabase/client";

export function useApi() {
  const supabase = createClient();

  async function apiFetch(path: string, options?: RequestInit) {
    const {
      data: { session },
    } = await supabase.auth.getSession();
    return fetch(`${process.env.NEXT_PUBLIC_API_URL}${path}`, {
      ...options,
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${session?.access_token}`,
        ...options?.headers,
      },
    });
  }

  return { apiFetch };
}
```

**Approche B — Route Handlers Next.js (proxy BFF)**

Pour les données protégées à afficher dans des RSC, créer un Route Handler qui lit le cookie Supabase et forward le token :

```typescript
// app/api/orders/route.ts
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

export async function GET(request: Request) {
  const cookieStore = cookies();
  const supabase = createServerClient(/* ... */, { cookies: () => cookieStore });
  const { data: { session } } = await supabase.auth.getSession();

  const { searchParams } = new URL(request.url);
  const restaurantId = searchParams.get("restaurantId");

  const res = await fetch(`${process.env.API_URL}/api/v1/restaurants/${restaurantId}/orders`, {
    headers: { Authorization: `Bearer ${session?.access_token}` },
  });

  return Response.json(await res.json());
}
```

---

### Tunnel de commande — Architecture recommandée

Le tunnel de commande est le flux le plus complexe. Voici le mapping :

```
[Server Component] MenuPage        → fetch public GET /menu
[Client Component] ProductCard      → affichage produit + bouton ajout panier
[Client Component] Cart             → état local (useState/zustand) — pas d'API
[Client Component] CheckoutForm     → collecte fullName, phone, email
[Client Component] CheckoutButton   → POST /checkout/create-session ou POST /orders
[Page]             /order/success   → vérifie session_id dans searchParams (Stripe redirect)
[Page]             /order/cancel    → page d'annulation
```

**Logique de branchement paiement** (à implémenter côté frontend) :

```typescript
const response = await fetch("/api/v1/checkout/create-session", {
  /* ... */
});
const { data } = await response.json();

if (data.paymentMethod === "on_site") {
  // Pas de Stripe → commande créée directement
  router.push(`/order/confirmation/${data.order.id}`);
} else {
  // Stripe Connect → redirection vers Stripe Checkout
  window.location.href = data.url;
}
```

---

### Validation des codes promo — UX recommandée

Ne pas appliquer le promo code dans le state local. Toujours le valider via API avant soumission :

```typescript
// Quand l'utilisateur tape un code promo :
const res = await fetch(
  `/api/v1/restaurants/${restaurantId}/promo-codes/validate`,
  {
    method: "POST",
    body: JSON.stringify({ code, orderTotal: cartTotal }),
  },
);
const { data, error } = await res.json();

if (error) {
  setPromoError(error); // afficher l'erreur
} else {
  setDiscount({ amount: data.discountAmount, finalTotal: data.finalTotal });
}
```

> ⚠️ La route `/orders` re-valide le promo code côté serveur. Le frontend ne doit jamais calculer le total final lui-même.

---

### Gestion des options produits (nouveau en v2)

La structure `optionGroups` d'un produit permet de construire un configurateur :

```typescript
type OptionGroup = {
  id: string;
  name: string;
  hasMultiple: boolean; // true = checkboxes, false = radio buttons
  isRequired: boolean;
  minQuantity: number;
  maxQuantity: number;
  optionChoices: OptionChoice[];
};

type OptionChoice = {
  id: string;
  name: string;
  priceModifier: string; // à parseFloat()
};
```

- `hasMultiple: false` + `isRequired: true` → Radio group (sélection unique obligatoire)
- `hasMultiple: true` + `isRequired: false` → Checkboxes (sélection multiple optionnelle, respecter min/maxQuantity)

À la commande, envoyer les `id` des choix sélectionnés dans `optionChoiceIds[]`.

---

### Pagination des listes (commandes, membres)

Tous les endpoints paginés retournent le même format :

```json
{
  "data": [],
  "pagination": { "page": 1, "limit": 20, "total": 142, "totalPages": 8 }
}
```

Recommandation : utiliser `useSearchParams` pour persister `page` et `limit` dans l'URL.

---

### Gestion des statuts de commande

```
PENDING                → En attente de traitement (post Stripe webhook)
PENDING_ON_SITE_PAYMENT → En attente de paiement sur place
IN_PROGRESS            → En cours de préparation
COMPLETED              → Prêt / servi
DELIVERED              → Livré
CANCELLED              → Annulé (remboursement éventuel)
```

Le PATCH `/orders/:id/status` est réservé au STAFF+ — à exposer dans le dashboard restaurant, pas dans l'interface client.

---

### Chargement des images

- Les images produits/restaurant sont des URLs Supabase Storage publiques (pas d'auth requise pour les afficher).
- Utiliser `next/image` avec le domaine Supabase dans `next.config.js` :

```js
// next.config.js
module.exports = {
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "*.supabase.co",
        pathname: "/storage/v1/object/public/**",
      },
    ],
  },
};
```

---

### Variables d'environnement côté Next.js

| Variable                        | Visibilité        | Usage                                                        |
| ------------------------------- | ----------------- | ------------------------------------------------------------ |
| `NEXT_PUBLIC_API_URL`           | Client + Server   | Base URL du backend (`https://...`)                          |
| `NEXT_PUBLIC_SUPABASE_URL`      | Client + Server   | URL du projet Supabase                                       |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Client + Server   | Clé publique Supabase (pour auth client)                     |
| `API_URL`                       | Server uniquement | Base URL backend (server-side fetch, sans exposer au client) |

> ⚠️ Ne jamais exposer `SUPABASE_SERVICE_ROLE_KEY` ou `STRIPE_SECRET_KEY` côté client.

</nextjs_migration_tips>
