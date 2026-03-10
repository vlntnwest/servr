# Restaurants — `/api/restaurants`

## Routes

| Method   | Endpoint | Description       | Auth | Role          |
| -------- | -------- | ----------------- | ---- | ------------- |
| `POST`   | `/`      | Create restaurant | Yes  | --            |
| `PUT`    | `/:id`   | Update restaurant | Yes  | OWNER / ADMIN |
| `DELETE` | `/:id`   | Delete restaurant | Yes  | OWNER         |

## POST `/`

Creates a restaurant and adds the authenticated user as `OWNER` in the `restaurant_members` table.

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

Requires the user to be `OWNER` or `ADMIN` of the restaurant.

## DELETE `/:id`

Deletes the restaurant and all related data (members, opening hours, categories, products, orders) via cascade.

Requires the user to be `OWNER` of the restaurant.
