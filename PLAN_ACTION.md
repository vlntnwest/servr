# Plan d'action — Servr

> Audit du 18 mars 2026 — Corrections classées par priorité

## Convention Git

- Branche principale : `main`
- Chaque correctif = une branche dédiée mergée dans `main` via PR
- Nommage : `fix/<nom-court>` ou `feat/<nom-court>`
- Commit conventionnel : `fix: ...`, `feat: ...`, `refactor: ...`
- Merge via squash merge pour garder un historique propre

---

## Phase 1 — Critiques (sécurité & intégrité des données) ✅ TERMINÉE

- [x] **1.1** — IDOR menu controller → `fix/menu-idor` ✅
- [x] **1.2** — Bloquer commandes quand CLOSED → `fix/block-orders-when-closed` ✅
- [x] **1.3** — Auto-refund à l'annulation → `fix/auto-refund-on-cancel` ✅
- [x] **1.4** — Idempotence des refunds → `fix/refund-idempotency` ✅
- [x] **1.5** — Authentification WebSocket → `fix/websocket-auth` ✅
- [x] **1.6** — Compléter la state machine → `fix/state-machine-dead-states` ✅

### Correctifs additionnels (hors plan initial)

- [x] **1.7** — Commandes planifiées autorisées quand fermé + "Au plus vite" grisé → `fix/closed-scheduled-orders` ✅
- [x] **1.8** — Support plages horaires multiples par jour (matin + après-midi) → `fix/multiple-opening-hours-per-day` ✅
- [x] **1.8b** — Dépendance circulaire order ↔ checkout cassée (`isScheduledTimeValid` → `lib/openingHours.js`) ✅

---

## Phase 2 — Important (fonctionnalité & fiabilité) ✅ TERMINÉE

- [x] **2.1** — Brancher les codes promo au checkout → `feat/promo-code-checkout` ✅
- [x] **2.2** — Webhooks Stripe manquants → fait dans Phase 1 (inclus dans `fix/auto-refund-on-cancel`) ✅
- [x] **2.3** — Transaction atomique pour les refunds → fait dans `refundStripePayment()` ✅
- [x] **2.4** — Webhook respecte la state machine → fait dans Phase 1 ✅

---

## Phase 3 — Moyen (UX & robustesse) ✅ TERMINÉE

- [x] **3.1** — PENDING ajouté aux notifications email → fait dans Phase 1 ✅
- [x] **3.2** — WebSocket events manquants (`order:new` dans createOrder, events dans webhooks) → fait dans Phase 1 ✅
- [x] **3.3** — Reconnexion et error handling WebSocket → `fix/websocket-resilience` ✅
- [x] **3.4** — Validation SMTP au démarrage → `fix/smtp-startup-check` ✅

---

## Résumé visuel

```
main
 │
 ├── fix/menu-idor                        ← 1.1 ✅
 ├── fix/block-orders-when-closed         ← 1.2 ✅
 ├── fix/auto-refund-on-cancel            ← 1.3 ✅
 ├── fix/refund-idempotency               ← 1.4 ✅
 ├── fix/websocket-auth                   ← 1.5 ✅
 ├── fix/state-machine-dead-states        ← 1.6 ✅
 ├── fix/closed-scheduled-orders          ← 1.7 ✅
 ├── fix/multiple-opening-hours-per-day   ← 1.8 ✅
 │
 ├── feat/promo-code-checkout             ← 2.1 ✅
 │
 ├── fix/websocket-resilience             ← 3.3 ✅
 └── fix/smtp-startup-check              ← 3.4 ✅
```

> Toutes les phases sont terminées. 2.2–2.4 et 3.1–3.2 ont été résolues dans les correctifs de Phase 1.
