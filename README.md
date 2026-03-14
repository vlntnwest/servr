# servr

Online ordering platform for restaurants — monorepo.

## Structure

```
servr/
├── api/        # Node.js/Express REST API
└── frontend/   # Next.js 15 frontend
```

## Quick start

```bash
# API
cd api
cp .env.example .env   # fill in Supabase + Stripe credentials
npm install
npx prisma generate
npx prisma migrate dev
npm run dev            # http://localhost:5001

# Frontend
cd frontend
cp .env.local.example .env.local
npm install
npm run dev            # http://localhost:3000
```

## Tech stack

| Layer    | Tech                              |
|----------|-----------------------------------|
| API      | Node.js v20, Express, Prisma, Zod |
| Database | PostgreSQL via Supabase           |
| Auth     | Supabase Auth (JWT)               |
| Payment  | Stripe                            |
| Frontend | Next.js 15, React 19, Tailwind    |

See [`api/README.md`](api/README.md) for full API documentation.
