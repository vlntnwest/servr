# Users — `/api/user`

All routes require authentication (`checkAuth`).

## Routes

| Method   | Endpoint | Description      | Auth | Role |
| -------- | -------- | ---------------- | ---- | ---- |
| `GET`    | `/me`    | Get current user | Yes  | --   |
| `PUT`    | `/me`    | Update user      | Yes  | --   |
| `DELETE` | `/me`    | Delete user      | Yes  | --   |

## PUT `/me`

Update the authenticated user's profile.

```json
{
  "fullName": "John Doe",
  "phone": "06 12 34 56 78"
}
```

All fields are optional. Phone must be a valid French phone number.

## DELETE `/me`

Deletes the user from Supabase Auth (which cascades to the `users` table).
