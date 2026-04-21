# Restaurants — `/api/restaurants`

## Routes

| Method   | Endpoint | Description       | Auth | Role          |
| -------- | -------- | ----------------- | ---- | ------------- |
| `POST`   | `/`      | Create restaurant | Yes  | --            |
| `PUT`    | `/:id`   | Update restaurant | Yes  | Admin         |
| `DELETE` | `/:id`   | Delete restaurant | Yes  | Admin         |

## POST `/`

Creates a restaurant and sets the authenticated user as its admin (`adminId`).

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

`email` and `imageUrl` are optional.

## PUT `/:id`

Partial update. Same body as POST, all fields are optional.

Requires the user to be the admin of the restaurant (`isRestaurantAdmin`).

## DELETE `/:id`

Deletes the restaurant and all related data (opening hours, categories, products, orders) via cascade.

Requires the user to be the admin of the restaurant (`isRestaurantAdmin`).
