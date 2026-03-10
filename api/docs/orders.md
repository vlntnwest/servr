# Orders — `/api/restaurants/:restaurantId/orders`

## Routes summary

| Method  | Endpoint                                        | Description           | Auth  | Role   |
| ------- | ----------------------------------------------- | --------------------- | ----- | ------ |
| `POST`  | `/restaurants/:restaurantId/orders`             | Create order (public) | No    | —      |
| `GET`   | `/restaurants/:restaurantId/orders`             | List orders           | Yes   | STAFF+ |
| `GET`   | `/restaurants/:restaurantId/orders/:orderId`    | Get order             | Yes   | STAFF+ |
| `PATCH` | `/restaurants/:restaurantId/orders/:orderId/status` | Update status     | Yes   | STAFF+ |

### Checkout (Stripe)

| Method  | Endpoint                                                             | Description        | Auth  | Role  |
| ------- | -------------------------------------------------------------------- | ------------------ | ----- | ----- |
| `POST`  | `/api/checkout/create-session`                                       | Create Stripe session | No | —     |
| `POST`  | `/api/checkout/webhook`                                              | Stripe webhook     | No    | —     |
| `POST`  | `/api/checkout/restaurants/:restaurantId/orders/:orderId/refund`     | Refund order       | Yes   | ADMIN |

---

## POST `/restaurants/:restaurantId/orders`

Creates an order directly (no Stripe payment). The restaurant must be open.

**Body**
```json
{
  "fullName": "John Doe",
  "phone": "06 12 34 56 78",
  "email": "john@example.com",
  "items": [
    { "productId": "uuid", "quantity": 2, "optionChoiceIds": ["uuid"] }
  ]
}
```

`fullName`, `phone`, `email` are optional. `items` is required (min 1).

**Response `201`** — `{ "data": { order with products } }`

**Errors**
- `400` — Restaurant is currently closed
- `404` — One or more products not found

---

## PATCH `/restaurants/:restaurantId/orders/:orderId/status`

**Body**
```json
{ "status": "IN_PROGRESS" }
```

Valid statuses: `PENDING` | `IN_PROGRESS` | `COMPLETED` | `DELIVERED` | `CANCELLED` | `PENDING_ON_SITE_PAYMENT`

**Response `200`** — `{ "data": { updated order } }`

---

## POST `/api/checkout/create-session`

Creates a Stripe Checkout session (Stripe Connect). If the restaurant has no Stripe account, creates a `PENDING_ON_SITE_PAYMENT` order.

**Body**
```json
{
  "restaurantId": "uuid",
  "fullName": "John Doe",
  "email": "john@example.com",
  "items": [{ "productId": "uuid", "quantity": 1, "optionChoiceIds": [] }]
}
```

**Response `201`**
```json
{ "data": { "sessionId": "cs_xxx", "url": "https://checkout.stripe.com/..." } }
```

Or for on-site payment:
```json
{ "data": { "order": { ... }, "paymentMethod": "on_site" } }
```

---

## POST `/api/checkout/webhook`

Stripe sends `checkout.session.completed` events here. Creates the order in the database with status `PENDING`.

Requires `stripe-signature` header and `STRIPE_WEBHOOK_SECRET` env variable.

**Response `200`** — `{ "received": true }`

---

## POST `/api/checkout/restaurants/:restaurantId/orders/:orderId/refund`

Refunds a Stripe payment and sets order status to `CANCELLED`.

**Response `200`**
```json
{ "data": { "order": { ... }, "refund": { "id": "re_xxx", "status": "succeeded" } } }
```

**Errors**
- `400` — No Stripe payment associated with this order
- `409` — Order is already cancelled
