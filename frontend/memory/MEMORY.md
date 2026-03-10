# Pokey App Frontend — Project Memory

## Project Migration (completed Feb 2026)
- **v1 source**: preserved at `src-v1/` (CRA, MUI, Auth0, Redux, react-router-dom)
- **v2 stack**: Next.js 15 App Router, Tailwind CSS v3, shadcn/ui (manual), TypeScript, Supabase Auth
- **API spec**: documented in `api-v2.md` — base URL `/api/v1`, restaurant-scoped routes

## Architecture

### Directory structure
```
app/                   # Next.js App Router pages
  layout.tsx           # Root layout (CartProvider)
  page.tsx             # Main menu (Server Component, fetches menu)
  admin/page.tsx       # Admin dashboard (client, requires auth)
  login/page.tsx       # Supabase login
  order/success/       # Stripe success redirect
  order/cancel/        # Stripe cancel redirect
  order/confirmation/  # On-site payment confirmation
  members/accept/      # Invitation acceptance
components/
  ui/                  # shadcn-style components (Button, Card, Dialog, Sheet, etc.)
  layout/header.tsx    # Sticky header with cart icon + auth button
  menu/                # ProductCard, ProductDetailSheet, CategorySection, MenuPage
  cart/                # Cart, CartItem, CheckoutModal
  admin/               # OrdersTab, StatsTab, MembersTab, OpeningHoursTab
  auth/auth-button.tsx # Supabase auth toggle
contexts/cart-context.tsx  # Cart state (sessionStorage)
lib/
  supabase/client.ts   # Browser Supabase client
  supabase/server.ts   # Server Supabase client
  api.ts               # All API v2 fetch functions
  utils.ts             # cn(), formatEuros(), cart helpers
types/api.ts           # Full TypeScript types for API v2
```

### Key env vars
- `NEXT_PUBLIC_API_URL` — backend URL (e.g. `http://localhost:5001`)
- `NEXT_PUBLIC_SUPABASE_URL` — Supabase project URL
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` — Supabase anon key
- `NEXT_PUBLIC_RESTAURANT_ID` — single restaurant ID

### Design tokens (from v1 theme)
- Primary blue: `#1f4493`
- Orange accent: `#e67400`
- Muted text: `#676767`
- Background: `rgba(208, 208, 208, 0.12)`
- Font: Roboto Condensed (variable font at `/assets/fonts/`)

### Build status
- `npm run build` → ✅ passing, 9 pages
- `npm run lint` → ✅ no errors
