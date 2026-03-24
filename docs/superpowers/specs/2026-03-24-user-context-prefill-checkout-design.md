# Design : Context utilisateur global + préremplissage du checkout

**Date :** 2026-03-24
**Statut :** Approuvé

---

## Contexte

Actuellement, le formulaire de commande (`checkout-modal.tsx`) est toujours vide, même pour les utilisateurs connectés. L'utilisateur doit ressaisir son nom et téléphone à chaque commande. L'email est collecté dans le formulaire alors qu'il est déjà connu via l'authentification.

## Objectif

- Créer un context React global portant le profil utilisateur connecté
- Préremplir les champs du formulaire de commande pour les utilisateurs connectés
- Masquer le champ email si l'utilisateur est connecté (l'email est connu)
- Les champs restent modifiables

---

## Architecture

### 1. `UserContext` — `frontend/contexts/user-context.tsx`

Nouveau context React exposé au niveau du layout racine.

**État exposé :**
```typescript
interface UserContextValue {
  user: UserProfile | null   // null si non connecté ou en cours de chargement
  isLoading: boolean
  refetch: () => Promise<void>
}

interface UserProfile {
  id: string
  email: string
  fullName: string | null
  phone: string | null
}
```

**Comportement :**
- Au montage, s'abonne à `supabase.auth.onAuthStateChange`
- Sur événement `SIGNED_IN` ou session active : appelle `GET /api/user/me` avec le token Bearer
- Sur événement `SIGNED_OUT` : remet `user` à `null`
- `refetch()` : re-appelle `GET /api/user/me` (utilisé après édition du profil)
- `isLoading: true` pendant le fetch initial uniquement

**Placement :** dans le layout racine (`frontend/app/layout.tsx` ou le provider wrapper existant)

---

### 2. Préremplissage dans `checkout-modal.tsx`

**Comportement :**
- Lit `user` depuis `useUserContext()`
- À l'ouverture du modal (via `useEffect` sur un prop `open` ou `onOpenChange`), appelle `form.reset()` avec les valeurs disponibles :
  ```typescript
  form.reset({
    fullName: user?.fullName ?? "",
    phone: user?.phone ?? "",
    // email non inclus si connecté
  })
  ```
- Si `user` est `null` (non connecté), le formulaire reste vide comme actuellement

**Champ email :**
- Si `user !== null` : le champ email est **masqué** du JSX et retiré du schema Zod de validation côté client
- L'email est envoyé au backend depuis le context (`user.email`), pas depuis le formulaire
- Si `user === null` : le champ email est affiché normalement (commande invitée)

**Champ email dans le payload API :**
```typescript
const payload = {
  ...formValues,
  email: user ? user.email : formValues.email,
}
```

---

### 3. Migration des composants existants

**`customer-sheet.tsx`**
- Actuellement : appelle `supabase.auth.getUser()` directement
- Migration : lire `user` depuis `useUserContext()` — supprime le fetch dupliqué

**`account/page.tsx`**
- Après sauvegarde réussie du profil (`PUT /api/user/me`), appeler `refetch()` depuis le context pour maintenir la cohérence

**`header.tsx`**
- Si le header affiche des informations utilisateur (nom, avatar), les lire depuis le context

---

## Flux de données

```
App mount
  └─ UserContext monte
       └─ supabase.auth.getUser() → session active ?
            ├─ Oui → GET /api/user/me → user = { id, email, fullName, phone }
            └─ Non → user = null

User ouvre le checkout modal
  └─ useUserContext() → user
       ├─ user !== null → form.reset({ fullName, phone }), email masqué
       └─ user === null → formulaire vide, email affiché

User soumet le formulaire
  └─ payload = { ...formValues, email: user?.email ?? formValues.email }
```

---

## Ce qui ne change pas

- Le formulaire reste entièrement modifiable (les valeurs préremplies ne sont pas verrouillées)
- Le backend ne change pas : il accepte toujours `fullName`, `email`, `phone` en optionnel
- Le comportement pour les commandes invitées (non connectés) est identique à aujourd'hui
- Le panier (`cart-context.tsx`) et la logique de paiement ne changent pas

---

## Fichiers impactés

| Fichier | Action |
|---------|--------|
| `frontend/contexts/user-context.tsx` | **Créer** |
| `frontend/app/layout.tsx` (ou provider wrapper) | Ajouter `UserProvider` |
| `frontend/components/cart/checkout-modal.tsx` | Préremplissage + masquage email |
| `frontend/components/store/customer-sheet.tsx` | Migrer vers `useUserContext()` |
| `frontend/app/account/page.tsx` | Appeler `refetch()` après sauvegarde |
| `frontend/components/layout/header.tsx` | Lire depuis context si besoin |
