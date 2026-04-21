# Menu — `/api/menu`

## Routes summary

| Method   | Endpoint                                                              | Description              | Auth | Role  |
| -------- | --------------------------------------------------------------------- | ------------------------ | ---- | ----- |
| `GET`    | `/restaurants/:restaurantId/menu`                                     | Get full menu (public)   | No   | —     |
| `GET`    | `/restaurants/:restaurantId/products/:productId`                      | Get product (public)     | No   | —     |
| `POST`   | `/restaurants/:restaurantId/categories`                               | Create category          | Yes  | Admin |
| `PUT`    | `/categories/:categorieId`                                            | Update category          | Yes  | Admin |
| `DELETE` | `/categories/:categorieId`                                            | Delete category          | Yes  | Admin |
| `POST`   | `/restaurants/:restaurantId/products`                                 | Create product           | Yes  | Admin |
| `PUT`    | `/products/:productId`                                                | Update product           | Yes  | Admin |
| `DELETE` | `/products/:productId`                                                | Delete product           | Yes  | Admin |
| `POST`   | `/products/:productId/option-groups`                                  | Create option group      | Yes  | Admin |
| `PUT`    | `/option-groups/:optionGroupId`                                       | Update option group      | Yes  | Admin |
| `DELETE` | `/option-groups/:optionGroupId`                                       | Delete option group      | Yes  | Admin |
| `POST`   | `/option-groups/:optionGroupId/option-choices`                        | Create option choice     | Yes  | Admin |
| `PUT`    | `/option-choices/:optionChoiceId`                                     | Update option choice     | Yes  | Admin |
| `DELETE` | `/option-choices/:optionChoiceId`                                     | Delete option choice     | Yes  | Admin |

---

## GET `/restaurants/:restaurantId/menu`

Returns the full menu for a restaurant including all categories, products, and option groups.

**Response `200`**
```json
{
  "data": [
    {
      "id": "uuid",
      "name": "Pokebowls",
      "displayOrder": 1,
      "productCategories": [
        {
          "product": {
            "id": "uuid",
            "name": "Pokebowl Saumon",
            "price": "14.50",
            "optionGroups": [
              {
                "id": "uuid",
                "name": "Sauce",
                "optionChoices": [{ "id": "uuid", "name": "Sesame", "priceModifier": "0.00" }]
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

## POST `/restaurants/:restaurantId/categories`

**Body**
```json
{ "name": "Entrées", "displayOrder": 1, "subHeading": "Optional subtitle" }
```

**Response `201`** — `{ "data": { category object } }`

---

## POST `/restaurants/:restaurantId/products`

**Body**
```json
{
  "name": "Pokebowl Saumon",
  "description": "Riz, saumon, avocat",
  "imageUrl": "https://example.com/img.jpg",
  "price": 14.50,
  "categorieId": "uuid",
  "tags": [],
  "discount": 0,
  "isAvailable": true,
  "displayOrder": 1
}
```

**Response `201`** — `{ "data": { product object } }`

---

## POST `/products/:productId/option-groups`

**Body**
```json
{
  "name": "Sauce",
  "hasMultiple": false,
  "isRequired": true,
  "minQuantity": 1,
  "maxQuantity": 1
}
```

**Response `201`** — `{ "data": { option group object } }`

---

## POST `/option-groups/:optionGroupId/option-choices`

**Body**
```json
{ "name": "Sesame", "priceModifier": 0 }
```

**Response `201`** — `{ "data": { option choice object } }`
