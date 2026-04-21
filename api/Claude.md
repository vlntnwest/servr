# Claude.md — Instructions pour Claude Code

## Projet

Pokey Webapp est le backend Node.js/Express d'un systeme de commande en ligne pour restaurants. Le frontend est separe (non inclus dans ce repo). L'app gere les utilisateurs, les restaurants, les menus (categories, produits, options) et les commandes. L'authentification est geree par Supabase Auth cote client, le backend verifie les JWT.

## Stack technique

- **Runtime** : Node.js v20+ (CommonJS, pas d'ESM dans le code source — `require`/`module.exports`)
- **Framework** : Express.js v4
- **Base de donnees** : PostgreSQL heberge sur Supabase
- **ORM** : Prisma v7 avec l'adapter `@prisma/adapter-pg`
- **Auth** : Supabase Auth — le backend utilise le service_role_key pour verifier les tokens
- **Validation** : Zod
- **Logging** : Pino (pino-pretty en dev)
- **Paiement** : Stripe (en cours d'implementation)
- **Email** : Nodemailer (en cours d'implementation)
- **Tests** : Vitest + Supertest (tests d'integration contre Supabase reel)

## Commandes

```bash
npm start        # Demarrer le serveur (production)
npm run dev      # Demarrer avec nodemon (dev, hot-reload)
npm test         # Lancer les tests (vitest run)
```

## Structure du projet

```
pokey_webapp/
├── index.js                 # Point d'entree — demarre le serveur Express
├── app.js                   # Configuration Express (CORS, rate limiting, routes, error handler)
├── logger.js                # Configuration Pino
├── prisma.config.ts         # Configuration Prisma (datasource, migrations)
├── vitest.config.js         # Configuration Vitest
├── controllers/
│   ├── user.controllers.js       # CRUD utilisateur (/api/user)
│   ├── restaurant.controllers.js # CRUD restaurant (/api/restaurants)
│   └── menu.controllers.js       # CRUD menu : categories, produits, options (/api/menu)
├── routes/
│   ├── user.routes.js            # Routes user (GET/PUT/DELETE /me)
│   ├── restaurant.routes.js      # Routes restaurant (POST/PUT/DELETE)
│   └── menu.routes.js            # Routes menu (categories, products, option-groups, option-choices)
├── middleware/
│   ├── auth.middleware.js        # checkAuth — verifie le JWT Supabase, charge le user depuis la DB
│   ├── role.middleware.js        # isRestaurantAdmin — verifie que req.user est l'admin du restaurant via Restaurant.adminId
│   ├── validate.middleware.js    # validate({ body, params, query }) — middleware generique Zod
│   └── error.middleware.js       # Error handler centralise (ZodError, Prisma, generique)
├── lib/
│   ├── prisma.js                 # Instance PrismaClient (singleton)
│   └── supabase.js               # Client Supabase admin (service_role_key)
├── validators/
│   └── schemas.js                # Tous les schemas Zod (user, restaurant, menu)
├── prisma/
│   └── schema.prisma             # Schema de la base de donnees
├── tests/
│   ├── user.spec.js              # Tests integration user
│   └── restaurant.spec.js        # Tests integration restaurant
├── Template/
│   └── emailTemplate.html        # Template email confirmation commande
└── docs/
    ├── users.md                  # Doc API users
    └── restaurants.md            # Doc API restaurants
```

## Architecture et conventions

### Flux d'une requete

```
Client → Express → Rate Limiter → CORS → auth.middleware → role.middleware → validate.middleware → Controller → Prisma → DB
                                                                                                        ↓
                                                                                                  error.middleware (si erreur)
```

### Conventions de code

- **CommonJS** : Utiliser `require()` et `module.exports`, jamais `import/export` (sauf dans les fichiers de config `.ts`)
- **Controllers** : Chaque fonction est `async (req, res, next)` et wrappe sa logique dans `try/catch` avec `next(error)` en cas d'erreur
- **Format de reponse** : Toujours renvoyer `{ data: ... }` pour les succes, `{ error: "..." }` pour les erreurs, `{ message: "..." }` pour les confirmations
- **Status codes** : 200 (OK), 201 (created), 400 (validation), 401 (non auth), 403 (forbidden), 404 (not found), 409 (conflict), 500 (serveur)
- **Validation** : Utiliser le middleware `validate({ body: schema })` dans les routes, ne pas valider manuellement dans les controllers
- **Logging** : Utiliser `logger.info/warn/error` avec un objet de contexte en premier argument (`{ userId, restaurantId }`)
- **Nommage DB** : Les tables et colonnes sont en snake_case dans Postgres, mappees en camelCase dans Prisma via `@map()`

### Base de donnees

- **11 modeles** : User, Restaurant, OpeningHour, Categorie, Product, ProductCategorie, OptionGroup, OptionChoice, Order, OrderProduct, OrderProductOption
- **Access** : chaque Restaurant a un admin unique (User.id via Restaurant.adminId) — verification via `isRestaurantAdmin`
- **Statuts commande** : `PENDING` → `IN_PROGRESS` → `COMPLETED` → `DELIVERED` | `CANCELLED`
- **Cascade** : Supprimer un restaurant supprime tout ce qui lui est lie (membres, categories, produits, commandes)
- Les IDs sont des UUID v4 generes par PostgreSQL (`gen_random_uuid()`)

### Authentification

1. Le client s'authentifie via Supabase Auth (SDK frontend)
2. Il envoie le JWT dans le header `Authorization: Bearer <token>`
3. `auth.middleware.js` verifie le token via `supabase.auth.getUser(token)`
4. Il charge le user depuis la table `users` avec ses `restaurants`
5. `req.user` est disponible dans les controllers suivants

### Tests

- Les tests sont des **tests d'integration** qui appellent Supabase Auth en reel (signup/login)
- Ils necessitent un `.env` avec les credentials Supabase valides
- Chaque suite cree un user de test, effectue les operations, puis nettoie (delete user)
- Lancer avec `npm test` (vitest run)

## Variables d'environnement requises

```
PORT=5001
SUPABASE_URL=https://[project].supabase.co
SUPABASE_ANON_KEY=[anon_key]
SUPABASE_SERVICE_ROLE_KEY=[service_role_key]
DATABASE_URL=postgresql://postgres:[password]@db.[project].supabase.co:5432/postgres
CLIENT_URL=http://localhost:3000
STRIPE_SECRET_KEY=[a_venir]
STRIPE_WEBHOOK_SECRET=[a_venir]
```

## Regles importantes

1. **Ne jamais commiter de secrets** (.env, cles API, credentials)
2. **Toujours utiliser le middleware `validate`** pour la validation — ne pas valider dans les controllers
3. **Toujours renvoyer un status code semantique** (pas de 201 pour un update/delete)
4. **Toujours passer les erreurs a `next(error)`** — ne pas catch silencieusement
5. **Toujours logguer les actions** avec le contexte pertinent (IDs, action)
6. **Tester les nouvelles routes** avec des tests d'integration dans `tests/`
7. **Verifier les permissions** : les routes modifiant des donnees restaurant doivent passer par `isRestaurantAdmin`

## Problemes connus (voir ROADMAP.md pour details)

- Les tests user/restaurant ont des assertions incorrectes (mauvaises cles dans `response.body`)
- `updateUserData` contient du code mort (check `if (!result)` inutile)
- `createRestaurant` valide manuellement au lieu d'utiliser le middleware
- Certains delete/update renvoient 201 au lieu de 200
- Messages d'erreur en melange francais/anglais
- Orders, Opening Hours, Stripe et Email ne sont pas encore implementes
