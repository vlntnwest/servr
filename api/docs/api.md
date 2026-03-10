# API Reference

**Base URL :** `http://localhost:5001/api`

Toutes les routes protegees necessitent le header :

```
Authorization: Bearer <supabase_jwt_token>
```

## Table des endpoints

| Methode  | Endpoint                                                                  | Auth | Role         | Description                 |
| -------- | ------------------------------------------------------------------------- | ---- | ------------ | --------------------------- |
| `GET`    | `/user/me`                                                                | Oui  | --           | Profil de l'utilisateur     |
| `PUT`    | `/user/me`                                                                | Oui  | --           | Modifier son profil         |
| `DELETE` | `/user/me`                                                                | Oui  | --           | Supprimer son compte        |
| `POST`   | `/restaurants`                                                            | Oui  | --           | Creer un restaurant         |
| `PUT`    | `/restaurants/:restaurantId`                                              | Oui  | OWNER, ADMIN | Modifier un restaurant      |
| `DELETE` | `/restaurants/:restaurantId`                                              | Oui  | OWNER        | Supprimer un restaurant     |
| `GET`    | `/menu/restaurants/:restaurantId/menu`                                    | Non  | --           | Menu complet du restaurant  |
| `GET`    | `/menu/restaurants/:restaurantId/products/:productId`                     | Non  | --           | Detail d'un produit         |
| `POST`   | `/menu/restaurants/:restaurantId/categories`                              | Oui  | OWNER, ADMIN | Creer une categorie         |
| `PUT`    | `/menu/restaurants/:restaurantId/categories/:categorieId`                 | Oui  | OWNER, ADMIN | Modifier une categorie      |
| `DELETE` | `/menu/restaurants/:restaurantId/categories/:categorieId`                 | Oui  | OWNER, ADMIN | Supprimer une categorie     |
| `POST`   | `/menu/restaurants/:restaurantId/products`                                | Oui  | OWNER, ADMIN | Creer un produit            |
| `PUT`    | `/menu/restaurants/:restaurantId/products/:productId`                     | Oui  | OWNER, ADMIN | Modifier un produit         |
| `DELETE` | `/menu/restaurants/:restaurantId/products/:productId`                     | Oui  | OWNER, ADMIN | Supprimer un produit        |
| `POST`   | `/menu/restaurants/:restaurantId/products/:productId/option-groups`       | Oui  | OWNER, ADMIN | Creer un groupe d'options   |
| `PUT`    | `/menu/restaurants/:restaurantId/option-groups/:optionGroupId`            | Oui  | OWNER, ADMIN | Modifier un groupe          |
| `DELETE` | `/menu/restaurants/:restaurantId/option-groups/:optionGroupId`            | Oui  | OWNER, ADMIN | Supprimer un groupe         |
| `POST`   | `/menu/restaurants/:restaurantId/option-groups/:optionGroupId/option-choices` | Oui  | OWNER, ADMIN | Creer un choix d'option |
| `PUT`    | `/menu/restaurants/:restaurantId/option-choices/:optionChoiceId`          | Oui  | OWNER, ADMIN | Modifier un choix           |
| `DELETE` | `/menu/restaurants/:restaurantId/option-choices/:optionChoiceId`          | Oui  | OWNER, ADMIN | Supprimer un choix          |

---

## Authentification

L'authentification est geree cote frontend via le SDK Supabase :

```js
// Inscription
await supabase.auth.signUp({ email, password });

// Connexion
await supabase.auth.signInWithPassword({ email, password });

// Deconnexion
await supabase.auth.signOut();
```

Un trigger Supabase cree automatiquement une ligne dans `public.users` a l'inscription.

Le backend verifie le JWT via le middleware `checkAuth` et charge les roles via `isOwner` / `isAdmin` / `isStaff`.

### Hierarchie des roles

| Role    | Permissions                                |
| ------- | ------------------------------------------ |
| `OWNER` | Tout (y compris supprimer le restaurant)   |
| `ADMIN` | Gestion du menu et des infos du restaurant |
| `STAFF` | Acces aux donnees du restaurant (lecture)   |

---

## Users — `/api/user`

### GET `/user/me`

Recupere le profil de l'utilisateur connecte.

**Auth :** Oui

**Reponse `200` :**

```json
{
  "data": {
    "id": "uuid",
    "email": "user@example.com",
    "fullName": "John Doe",
    "phone": "06 12 34 56 78",
    "createdAt": "2025-01-01T00:00:00.000Z",
    "updatedAt": null
  }
}
```

**Erreurs :**

| Status | Condition              |
| ------ | ---------------------- |
| `401`  | Token absent/invalide  |
| `404`  | Utilisateur non trouve |

---

### PUT `/user/me`

Met a jour le profil de l'utilisateur connecte. Tous les champs sont optionnels.

**Auth :** Oui

**Body :**

```json
{
  "fullName": "John Doe",
  "phone": "06 12 34 56 78"
}
```

| Champ      | Type   | Requis | Regles                                                      |
| ---------- | ------ | ------ | ----------------------------------------------------------- |
| `fullName` | string | Non    | 1-50 caracteres                                             |
| `phone`    | string | Non    | Numero francais valide (`06 12 34 56 78`, `+33 6 12345678`) |

**Reponse `200` :**

```json
{
  "data": {
    "id": "uuid",
    "email": "user@example.com",
    "fullName": "John Doe",
    "phone": "06 12 34 56 78",
    "createdAt": "...",
    "updatedAt": "..."
  }
}
```

**Erreurs :**

| Status | Condition                    |
| ------ | ---------------------------- |
| `400`  | Validation echouee (Zod)     |
| `401`  | Token absent/invalide        |

---

### DELETE `/user/me`

Supprime le compte utilisateur. La suppression dans Supabase Auth cascade vers la table `users`.

**Auth :** Oui

**Reponse `200` :**

```json
{
  "message": "User deleted successfully"
}
```

---

## Restaurants — `/api/restaurants`

### POST `/restaurants`

Cree un restaurant et ajoute automatiquement l'utilisateur connecte comme `OWNER`.

**Auth :** Oui

**Body :**

```json
{
  "name": "Mon Restaurant",
  "address": "123 Rue de Paris",
  "zipCode": "75001",
  "city": "Paris",
  "phone": "06 12 34 56 78",
  "email": "contact@resto.com",
  "imageUrl": "https://example.com/image.jpg"
}
```

| Champ      | Type   | Requis | Regles                          |
| ---------- | ------ | ------ | ------------------------------- |
| `name`     | string | Oui    | 1-50 caracteres                 |
| `address`  | string | Oui    | 1-255 caracteres                |
| `zipCode`  | string | Oui    | Exactement 5 chiffres (`75001`) |
| `city`     | string | Oui    | 1-50 caracteres                 |
| `phone`    | string | Oui    | Numero francais valide          |
| `email`    | string | Non    | Email valide                    |
| `imageUrl` | string | Non    | URL valide                      |

**Reponse `201` :**

```json
{
  "data": {
    "id": "uuid",
    "name": "Mon Restaurant",
    "address": "123 Rue de Paris",
    "zipCode": "75001",
    "city": "Paris",
    "phone": "06 12 34 56 78",
    "email": "contact@resto.com",
    "imageUrl": "https://example.com/image.jpg",
    "createdAt": "...",
    "updatedAt": null
  }
}
```

**Erreurs :**

| Status | Condition                  |
| ------ | -------------------------- |
| `400`  | Validation echouee (Zod)   |
| `401`  | Token absent/invalide      |

---

### PUT `/restaurants/:restaurantId`

Mise a jour partielle d'un restaurant. Meme body que POST, tous les champs sont optionnels.

**Auth :** Oui — **Role :** OWNER ou ADMIN

**Reponse `200` :**

```json
{
  "data": {
    "id": "uuid",
    "name": "Nom Modifie",
    "address": "...",
    "..."
  }
}
```

**Erreurs :**

| Status | Condition                       |
| ------ | ------------------------------- |
| `400`  | Validation echouee / Body vide  |
| `401`  | Token absent/invalide           |
| `403`  | L'utilisateur n'est pas ADMIN+  |
| `404`  | Restaurant non trouve           |

---

### DELETE `/restaurants/:restaurantId`

Supprime le restaurant et toutes les donnees associees (membres, categories, produits, commandes) via cascade.

**Auth :** Oui — **Role :** OWNER uniquement

**Reponse `200` :**

```json
{
  "response": "Restaurant deleted successfully"
}
```

**Erreurs :**

| Status | Condition                       |
| ------ | ------------------------------- |
| `401`  | Token absent/invalide           |
| `403`  | L'utilisateur n'est pas OWNER   |
| `404`  | Restaurant non trouve           |

---

## Menu — `/api/menu`

### GET `/menu/restaurants/:restaurantId/menu`

Recupere le menu complet d'un restaurant : categories triees par `displayOrder`, avec les produits et leurs options imbriques.

**Auth :** Non (endpoint public)

**Reponse `200` :**

```json
{
  "data": [
    {
      "id": "uuid",
      "restaurantId": "uuid",
      "name": "Pokebowls",
      "subHeading": "Composez votre bowl",
      "displayOrder": 1,
      "productCategories": [
        {
          "id": "uuid",
          "productId": "uuid",
          "categorieId": "uuid",
          "product": {
            "id": "uuid",
            "name": "Bowl Saumon",
            "description": "Riz, saumon, avocat, edamame",
            "imageUrl": "https://...",
            "price": "14.50",
            "tags": ["populaire", "nouveau"],
            "discount": "0.00",
            "isAvailable": true,
            "displayOrder": 1,
            "optionGroups": [
              {
                "id": "uuid",
                "name": "Taille",
                "hasMultiple": false,
                "isRequired": true,
                "minQuantity": 1,
                "maxQuantity": 1,
                "optionChoices": [
                  {
                    "id": "uuid",
                    "name": "Medium",
                    "priceModifier": "0.00"
                  },
                  {
                    "id": "uuid",
                    "name": "Large",
                    "priceModifier": "3.00"
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

---

### GET `/menu/restaurants/:restaurantId/products/:productId`

Recupere le detail d'un produit avec ses categories et options.

**Auth :** Non (endpoint public)

**Reponse `200` :**

```json
{
  "data": {
    "id": "uuid",
    "restaurantId": "uuid",
    "name": "Bowl Saumon",
    "description": "Riz, saumon, avocat, edamame",
    "imageUrl": "https://...",
    "price": "14.50",
    "tags": ["populaire"],
    "discount": "0.00",
    "isAvailable": true,
    "displayOrder": 1,
    "productCategories": [
      {
        "id": "uuid",
        "categorie": {
          "id": "uuid",
          "name": "Pokebowls",
          "subHeading": "...",
          "displayOrder": 1
        }
      }
    ],
    "optionGroups": [
      {
        "id": "uuid",
        "name": "Taille",
        "hasMultiple": false,
        "isRequired": true,
        "minQuantity": 1,
        "maxQuantity": 1,
        "optionChoices": [
          { "id": "uuid", "name": "Medium", "priceModifier": "0.00" },
          { "id": "uuid", "name": "Large", "priceModifier": "3.00" }
        ]
      }
    ]
  }
}
```

**Erreurs :**

| Status | Condition          |
| ------ | ------------------ |
| `404`  | Produit non trouve |

---

### POST `/menu/restaurants/:restaurantId/categories`

Cree une categorie dans le menu d'un restaurant.

**Auth :** Oui — **Role :** OWNER ou ADMIN

**Body :**

```json
{
  "restaurantId": "uuid",
  "name": "Pokebowls",
  "subHeading": "Composez votre bowl",
  "displayOrder": 1
}
```

| Champ          | Type   | Requis | Regles           |
| -------------- | ------ | ------ | ---------------- |
| `restaurantId` | string | Oui    | UUID valide      |
| `name`         | string | Oui    | 1-50 caracteres  |
| `subHeading`   | string | Non    | 1-255 caracteres |
| `displayOrder` | number | Oui    | Entier           |

**Reponse `201` :**

```json
{
  "data": {
    "id": "uuid",
    "restaurantId": "uuid",
    "name": "Pokebowls",
    "subHeading": "Composez votre bowl",
    "displayOrder": 1,
    "createdAt": "...",
    "updatedAt": null
  }
}
```

---

### PUT `/menu/restaurants/:restaurantId/categories/:categorieId`

Met a jour une categorie. Tous les champs sont optionnels.

**Auth :** Oui — **Role :** OWNER ou ADMIN

**Body :**

```json
{
  "name": "Bowls Signature",
  "subHeading": "Nos creations",
  "displayOrder": 2
}
```

| Champ          | Type   | Requis | Regles           |
| -------------- | ------ | ------ | ---------------- |
| `name`         | string | Non    | 1-50 caracteres  |
| `subHeading`   | string | Non    | 1-255 caracteres |
| `displayOrder` | number | Non    | Entier           |

**Reponse `201` :**

```json
{
  "data": { "..." }
}
```

---

### DELETE `/menu/restaurants/:restaurantId/categories/:categorieId`

Supprime une categorie et ses associations produit-categorie.

**Auth :** Oui — **Role :** OWNER ou ADMIN

**Reponse `201` :**

```json
"Product categorie deleted"
```

---

### POST `/menu/restaurants/:restaurantId/products`

Cree un produit et l'associe a une categorie (via la table `products_categories`). Operation transactionnelle.

**Auth :** Oui — **Role :** OWNER ou ADMIN

**Body :**

```json
{
  "restaurantId": "uuid",
  "name": "Bowl Saumon",
  "description": "Riz, saumon, avocat, edamame",
  "imageUrl": "https://example.com/bowl.jpg",
  "price": 14.50,
  "tags": ["populaire", "nouveau"],
  "discount": 0,
  "isAvailable": true,
  "displayOrder": 1,
  "categorieId": "uuid"
}
```

| Champ          | Type     | Requis | Defaut | Regles               |
| -------------- | -------- | ------ | ------ | -------------------- |
| `restaurantId` | string   | Oui    | --     | UUID valide          |
| `name`         | string   | Oui    | --     | 1-50 caracteres      |
| `description`  | string   | Oui    | --     | 1-255 caracteres     |
| `imageUrl`     | string   | Oui    | --     | URL valide           |
| `price`        | number   | Oui    | --     | Nombre positif       |
| `tags`         | string[] | Non    | --     | Tableau de strings   |
| `discount`     | number   | Non    | `0`    | Nombre               |
| `isAvailable`  | boolean  | Non    | `true` | true/false           |
| `displayOrder` | number   | Non    | `999`  | Entier               |
| `categorieId`  | string   | Oui    | --     | UUID categorie valide|

**Reponse `201` :**

```json
{
  "data": {
    "id": "uuid",
    "restaurantId": "uuid",
    "name": "Bowl Saumon",
    "description": "Riz, saumon, avocat, edamame",
    "imageUrl": "https://example.com/bowl.jpg",
    "price": "14.50",
    "tags": ["populaire", "nouveau"],
    "discount": "0.00",
    "isAvailable": true,
    "displayOrder": 1,
    "createdAt": "...",
    "updatedAt": null
  }
}
```

---

### PUT `/menu/restaurants/:restaurantId/products/:productId`

Met a jour un produit. Si `categorieId` est fourni et different de la categorie actuelle, une nouvelle association est creee (l'ancienne n'est pas supprimee). Operation transactionnelle.

**Auth :** Oui — **Role :** OWNER ou ADMIN

**Body :** Meme structure que POST, tous les champs sont optionnels.

**Reponse `201` :**

```json
{
  "data": { "..." }
}
```

---

### DELETE `/menu/restaurants/:restaurantId/products/:productId`

Supprime un produit et toutes ses associations (categories, options) via cascade.

**Auth :** Oui — **Role :** OWNER ou ADMIN

**Reponse `201` :**

```json
"Product deleted"
```

---

### POST `/menu/restaurants/:restaurantId/products/:productId/option-groups`

Cree un groupe d'options pour un produit (ex: "Taille", "Supplements", "Sauce").

**Auth :** Oui — **Role :** OWNER ou ADMIN

**Body :**

```json
{
  "name": "Taille",
  "hasMultiple": false,
  "isRequired": true,
  "minQuantity": 1,
  "maxQuantity": 1
}
```

| Champ         | Type    | Requis | Defaut  | Description                                           |
| ------------- | ------- | ------ | ------- | ----------------------------------------------------- |
| `name`        | string  | Oui    | --      | 1-50 caracteres                                       |
| `hasMultiple` | boolean | Non    | `false` | `true` = choix multiples, `false` = choix unique      |
| `isRequired`  | boolean | Non    | `false` | Le client doit-il faire un choix ?                    |
| `minQuantity` | number  | Non    | `1`     | Nombre minimum de selections                          |
| `maxQuantity` | number  | Non    | `1`     | Nombre maximum de selections                          |

**Reponse `201` :**

```json
{
  "data": {
    "id": "uuid",
    "productId": "uuid",
    "name": "Taille",
    "hasMultiple": false,
    "isRequired": true,
    "minQuantity": 1,
    "maxQuantity": 1,
    "createdAt": "...",
    "updatedAt": null
  }
}
```

---

### PUT `/menu/restaurants/:restaurantId/option-groups/:optionGroupId`

Met a jour un groupe d'options. Tous les champs sont optionnels.

**Auth :** Oui — **Role :** OWNER ou ADMIN

**Body :** Meme structure que POST, tous les champs optionnels.

**Reponse `200` :**

```json
{
  "data": { "..." }
}
```

---

### DELETE `/menu/restaurants/:restaurantId/option-groups/:optionGroupId`

Supprime un groupe d'options et tous ses choix via cascade.

**Auth :** Oui — **Role :** OWNER ou ADMIN

**Reponse `200` :**

```json
"Option group deleted"
```

---

### POST `/menu/restaurants/:restaurantId/option-groups/:optionGroupId/option-choices`

Cree un choix dans un groupe d'options (ex: "Medium", "Large").

**Auth :** Oui — **Role :** OWNER ou ADMIN

**Body :**

```json
{
  "name": "Large",
  "priceModifier": 3.00
}
```

| Champ           | Type   | Requis | Defaut | Description                              |
| --------------- | ------ | ------ | ------ | ---------------------------------------- |
| `name`          | string | Oui    | --     | 1-50 caracteres                          |
| `priceModifier` | number | Non    | `0`    | Supplement de prix (peut etre negatif)   |

**Reponse `201` :**

```json
{
  "data": {
    "id": "uuid",
    "optionGroupId": "uuid",
    "name": "Large",
    "priceModifier": "3.00",
    "createdAt": "...",
    "updatedAt": null
  }
}
```

---

### PUT `/menu/restaurants/:restaurantId/option-choices/:optionChoiceId`

Met a jour un choix d'option. Tous les champs sont optionnels.

**Auth :** Oui — **Role :** OWNER ou ADMIN

**Body :** Meme structure que POST, tous les champs optionnels.

**Reponse `200` :**

```json
{
  "data": { "..." }
}
```

---

### DELETE `/menu/restaurants/:restaurantId/option-choices/:optionChoiceId`

Supprime un choix d'option.

**Auth :** Oui — **Role :** OWNER ou ADMIN

**Reponse `200` :**

```json
"Option choice deleted"
```

---

## Erreurs globales

### Format d'erreur

Toutes les erreurs suivent ce format :

```json
{
  "error": "Message d'erreur"
}
```

Pour les erreurs de validation Zod :

```json
{
  "error": "Validation failed",
  "details": [
    { "field": "name", "message": "Required" },
    { "field": "phone", "message": "Invalid French phone number" }
  ]
}
```

### Codes d'erreur communs

| Status | Description                                         |
| ------ | --------------------------------------------------- |
| `400`  | Validation echouee (Zod) ou erreur de requete DB    |
| `401`  | Token absent, invalide ou expire                    |
| `403`  | Role insuffisant pour cette operation               |
| `404`  | Ressource non trouvee                               |
| `409`  | Conflit (contrainte d'unicite violee)               |
| `429`  | Trop de requetes (rate limit atteint)               |
| `500`  | Erreur serveur inattendue                           |

### Rate limiting

| Scope    | Limite        | Fenetre    |
| -------- | ------------- | ---------- |
| Global   | 100 req/IP    | 15 minutes |
| Auth     | 15 req/IP     | 15 minutes |
| Payment  | 10 req/IP     | 15 minutes |

Reponse quand la limite est atteinte :

```json
{
  "error": "Too many requests, please try again later."
}
```
