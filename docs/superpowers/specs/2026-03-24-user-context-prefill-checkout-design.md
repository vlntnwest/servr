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

Nouveau context React Client Component exposé au niveau du layout racine.

**Note Next.js App Router :** `layout.tsx` est un Server Component. `UserProvider` doit être un Client Component (`"use client"`). Il s'utilise comme `CartProvider` dans ce projet : ajouté comme enfant dans le body du Server Component, ce qui est supporté par Next.js.

**État exposé :**
```typescript
interface UserContextValue {
  user: UserProfile | null   // null si non connecté
  isLoading: boolean         // true uniquement pendant le fetch initial
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
- Sur événement `SIGNED_IN` ou session active : appelle `GET /api/user/me`
- Avant chaque appel `GET /api/user/me`, récupère un token frais via `supabase.auth.getSession()` (évite les 401 sur token expiré)
- Sur événement `SIGNED_OUT` : remet `user` à `null`
- `refetch()` : appelle `supabase.auth.getSession()` puis `GET /api/user/me`, sans paramètre token (self-contained)
- `isLoading: true` uniquement pendant le fetch initial

**Flash d'état non-connecté :** pendant `isLoading`, les composants qui conditionnent leur affichage sur `user` (ex: `customer-sheet.tsx`) doivent vérifier `isLoading` avant de rendre l'UI auth-dépendante, pour éviter un flash "Se connecter" au chargement.

---

### 2. Préremplissage dans `checkout-modal.tsx`

Le modal actuel utilise `useState` avec un objet de formulaire (pas react-hook-form). On conserve cette approche.

**Comportement :**
- Lit `user` depuis `useUserContext()`
- À l'ouverture du modal, **snapshot** la valeur `user` dans un state local pour figer les données pendant toute la durée du modal (évite tout comportement inattendu si l'utilisateur se déconnecte pendant la commande).
- **Important :** `CheckoutModal` n'est jamais démonté (il utilise `<Dialog open={open}>`), donc `useState(() => user)` n'exécuterait son initializer qu'une seule fois au premier montage. Le snapshot doit être défini à l'intérieur du `useEffect` sur `[open]` :
  ```typescript
  const [localUser, setLocalUser] = useState<UserProfile | null>(null)

  useEffect(() => {
    if (open) {
      setLocalUser(user) // snapshot au moment de l'ouverture
      setForm(prev => ({
        ...prev,
        fullName: user?.fullName ?? "",
        phone: user?.phone ?? "",
      }))
    }
  }, [open])
  ```
- Si `localUser === null` (non connecté), le formulaire reste vide comme actuellement

**Champ email :**
- Si `localUser !== null` : le champ email est **masqué** du JSX. Pas de modification du schema de validation — le champ email reste optionnel dans le schema existant, il n'est juste pas rendu.
- Si `localUser === null` : le champ email est affiché normalement (commande invitée)

**Payload envoyé au backend :**
```typescript
const payload = {
  ...formValues,
  email: localUser ? localUser.email : formValues.email,
}
```

---

### 3. Migration des composants existants

**`customer-sheet.tsx`**
- Actuellement : a son propre `onAuthStateChange` + state local `user` (type Supabase)
- Migration : lire `user` et `isLoading` depuis `useUserContext()`
- Supprimer la subscription locale ET son `subscription.unsubscribe()` dans le cleanup — laisser deux subscriptions actives créerait des conflits
- `customer-sheet.tsx` n'a besoin que de savoir si un user est connecté (`user !== null`), ce que `UserProfile` fournit

**`account/page.tsx`**
- Après sauvegarde réussie (`PUT /api/user/me`), appeler `refetch()` depuis le context pour maintenir la cohérence globale

**`header.tsx`**
- Si le header affiche des informations utilisateur, lire depuis `useUserContext()`

---

## Flux de données

```
App mount
  └─ UserProvider monte (Client Component dans layout.tsx)
       └─ supabase.auth.getSession() → session active ?
            ├─ Oui → supabase.auth.getSession() pour token frais
            │         → GET /api/user/me → user = { id, email, fullName, phone }
            └─ Non → user = null, isLoading = false

User ouvre le checkout modal
  └─ useState(() => user) → localUser (snapshot)
       ├─ localUser !== null → setForm({ fullName, phone }), email masqué dans JSX
       └─ localUser === null → formulaire vide, email affiché

User se déconnecte pendant le modal (edge case)
  └─ localUser reste figé (snapshot) → commande continue normalement
     avec l'email de localUser dans le payload

User soumet le formulaire
  └─ payload = { ...formValues, email: localUser?.email ?? formValues.email }
```

---

## Ce qui ne change pas

- Le formulaire reste entièrement modifiable (les valeurs préremplies ne sont pas verrouillées)
- Le backend ne change pas : il accepte toujours `fullName`, `email`, `phone` en optionnel
- Le comportement pour les commandes invitées (non connectés) est identique à aujourd'hui
- Le panier (`cart-context.tsx`) et la logique de paiement ne changent pas
- Pas d'introduction de react-hook-form dans cette itération

---

## Fichiers impactés

| Fichier | Action |
|---------|--------|
| `frontend/contexts/user-context.tsx` | **Créer** |
| `frontend/app/layout.tsx` | Ajouter `UserProvider` (comme `CartProvider`) |
| `frontend/components/cart/checkout-modal.tsx` | Snapshot + préremplissage + masquage email |
| `frontend/components/store/customer-sheet.tsx` | Migrer vers `useUserContext()`, supprimer subscription locale |
| `frontend/app/account/page.tsx` | Appeler `refetch()` après sauvegarde |
| `frontend/components/layout/header.tsx` | Lire depuis context si besoin |
