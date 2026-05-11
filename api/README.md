# Pokey Webapp Backend

Node.js/Express backend for a restaurant online ordering system. Customers can place orders through a web app, with Stripe payment integration and kitchen order management.

## Tech Stack

- **Runtime:** Node.js v20+
- **Framework:** Express.js
- **Database:** PostgreSQL (Supabase)
- **ORM:** Prisma
- **Auth:** Supabase Auth (JWT)
- **Payment:** Stripe
- **Validation:** Zod
- **Logging:** Pino (pino-pretty in dev)
- **Tests:** Vitest + Supertest

## Installation

### Prerequisites

- Node.js v20.0.0+
- npm v9.0.0+
- PostgreSQL database (Supabase)

### Setup

```bash
git clone <repo-url>
cd pokey_webapp

npm install

cp .env.example .env
# Edit .env with your values

npx prisma generate
npx prisma migrate dev

npm run dev
```

## Scripts

| Command       | Description                            |
| ------------- | -------------------------------------- |
| `npm start`   | Start production server                |
| `npm run dev` | Start server with hot-reload (nodemon) |
| `npm test`    | Run tests (Vitest)                     |

## Environment Variables

Copy `.env.example` to `.env` and fill in the values:

```env
PORT="5001"
SUPABASE_URL="https://[YOUR_PROJECT].supabase.co"
SUPABASE_ANON_KEY="[YOUR_ANON_KEY]"
DATABASE_URL="postgresql://postgres:[YOUR_DB_PASSWORD]@db.[YOUR_PROJECT].supabase.co:5432/postgres"
SUPABASE_SERVICE_ROLE_KEY="[YOUR_SERVICE_ROLE_KEY]"
```

Supabase credentials: Dashboard → Project Settings → API.

## Project Structure

```
pokey_webapp/
├── index.js                          # Server entry point
├── app.js                            # Express configuration
├── controllers/
│   ├── user.controllers.js           # User CRUD
│   └── restaurant.controllers.js     # Restaurant CRUD
├── routes/
│   ├── user.routes.js                # User endpoints
│   └── restaurant.routes.js          # Restaurant endpoints
├── logger.js                         # Pino logger (pino-pretty in dev)
├── middleware/
│   ├── auth.middleware.js            # JWT verification (Supabase)
│   ├── error.middleware.js           # Centralized error handler
│   ├── role.middleware.js            # Role authorization (isRestaurantAdmin)
│   └── validate.middleware.js        # Zod validation
├── lib/
│   ├── supabase.js                   # Supabase client
│   └── prisma.js                     # Prisma client
├── validators/
│   └── schemas.js                    # Zod schemas
├── prisma/
│   └── schema.prisma                 # Database schema
└── tests/
    ├── user.spec.js                  # User integration tests
    └── restaurant.spec.js            # Restaurant integration tests
```

## API Documentation

**Base URL:** `http://localhost:5001/api`

All protected routes require the header:

```
Authorization: Bearer <supabase_jwt_token>
```

See the [docs/](docs/) folder for detailed API documentation:

- **[API Reference (complete)](docs/api.md)** — All endpoints, request/response formats, error codes
- [Users](docs/users.md) — `/api/user`
- [Restaurants](docs/restaurants.md) — `/api/restaurants`

## Authentication

Authentication (signup, login, logout) is handled on the **frontend** via the Supabase SDK:

```js
await supabase.auth.signUp({ email, password });
await supabase.auth.signInWithPassword({ email, password });
await supabase.auth.signOut();
```

A Supabase trigger automatically creates a row in `public.users` on signup.

The backend verifies tokens via the `checkAuth` middleware and checks restaurant admin access via `isRestaurantAdmin`.

## Middleware

### Rate Limiting

| Type    | Limit           | Window     |
| ------- | --------------- | ---------- |
| Global  | 100 requests/IP | 15 minutes |
| Payment | 10 requests/IP  | 15 minutes |

### Error Handling

Centralized error middleware (`error.middleware.js`) catches all errors forwarded via `next(error)`:

| Error type                         | Status | Response                  |
| ---------------------------------- | ------ | ------------------------- |
| `ZodError`                         | 400    | Validation details        |
| Prisma `P2025` (not found)         | 404    | Resource not found        |
| Prisma `P2002` (unique constraint) | 409    | Resource already exists   |
| Other Prisma errors                | 400    | Database request error    |
| Unexpected errors                  | 500    | Internal server error     |

### Logging

Structured logging with [Pino](https://getpino.io/). Pretty-printed in dev, JSON in production.

Logs are emitted in controllers, middleware (auth, role), and the error handler. Process-level `uncaughtException` and `unhandledRejection` handlers log fatal errors before exiting.

### CORS

Accepts requests from `CLIENT_URL` with headers: `sessionId`, `Content-Type`, `Authorization`.

## Database

### Models

| Model          | Description                        |
| -------------- | ---------------------------------- |
| `User`         | Users (0..N restaurants as admin)  |
| `Restaurant`   | Restaurant information (single `adminId` → `User.id`) |
| `OpeningHour`  | Opening hours per day              |
| `Category`     | Menu categories                    |
| `Product`      | Menu items                         |
| `OptionGroup`  | Option groups for customization    |
| `OptionChoice` | Choices within an option group     |
| `Order`        | Customer orders                    |
| `OrderProduct` | Products within an order           |

### Restaurant Access

Each `Restaurant` has a single admin (`Restaurant.adminId` → `User.id`). A user can own 0..N restaurants. Admin-only endpoints are gated by the `isRestaurantAdmin` middleware.

### Order Statuses

`PENDING` → `IN_PROGRESS` → `COMPLETED` → `DELIVERED` | `CANCELLED`

## Testing with Postman

### 1. Signup

**POST** `https://<SUPABASE_URL>/auth/v1/signup`

Headers: `apikey: <SUPABASE_ANON_KEY>`

```json
{ "email": "test@example.com", "password": "password123" }
```

### 2. Login

**POST** `https://<SUPABASE_URL>/auth/v1/token?grant_type=password`

Headers: `apikey: <SUPABASE_ANON_KEY>`

```json
{ "email": "test@example.com", "password": "password123" }
```

### 3. Use the token

```
Authorization: Bearer <access_token>
```

## Stripe Connect setup

The platform uses Stripe Connect with **direct charges**: customer payments are
created on each restaurant's connected account, with a 5% application fee
routed back to the platform.

### Webhook configuration (REQUIRED)

The webhook must be registered as a **Connect webhook** in the Stripe
Dashboard, not a regular account-level one. Otherwise events fired on
connected accounts never reach the API and orders never transition from
`DRAFT` to `PENDING`.

1. Stripe Dashboard → Developers → Webhooks → Add an endpoint
2. URL: `https://<your-api-host>/api/checkout/webhook`
3. Toggle **Listen to events on Connected accounts**
4. Subscribe to: `checkout.session.completed`, `checkout.session.expired`,
   `payment_intent.payment_failed`, `account.updated`
5. Copy the signing secret into `STRIPE_WEBHOOK_SECRET`

Local testing:
`stripe listen --forward-connect-to localhost:5001/api/checkout/webhook`.

### Pre-launch checklist

- [ ] All vars in `REQUIRED_ENV_VARS` set (server refuses to boot otherwise)
- [ ] `npx prisma migrate deploy` run on the live DB
- [ ] Restaurant has completed Stripe onboarding — `GET /restaurants/:id/stripe/status` returns `chargesEnabled: true`
- [ ] Connect webhook configured (see above) and test event delivered
- [ ] SMTP verified at boot (`SMTP connection verified` in logs)
- [ ] Kitchen tablet: logged in, push permission granted, `users.push_token` populated
- [ ] End-to-end real-card test: order → webhook → kitchen ticket → email → status update

## License

Private project — All rights reserved.
