# Design : Flow de création de restaurant (restaurateur)

**Date :** 2026-05-12  
**Statut :** Approuvé

---

## Contexte

Après inscription, un restaurateur sans restaurant atterrit sur `/admin` qui affiche "Aucun restaurant trouvé." sans aucune action possible. Le backend expose déjà `POST /api/v1/restaurants/` avec authentification et validation complète. Il manque uniquement le flow frontend.

---

## Flux utilisateur

```
/register ou /login
       ↓ (auth OK)
/admin  →  fetch /user/me
       ├─ restaurants[0] existe → redirect /admin/[id]
       └─ pas de restaurant    → redirect /admin/create
              ↓ (formulaire soumis avec succès)
       POST /api/v1/restaurants/
              ↓ (201 OK)
       redirect /admin/[restaurantId]
```

---

## Fichiers modifiés / créés

| Fichier | Action | Description |
|---------|--------|-------------|
| `frontend/app/admin/page.tsx` | Modifier | Remplacer le dead-end par `router.replace("/admin/create")` |
| `frontend/app/admin/create/page.tsx` | Créer | Page avec formulaire de création |
| `frontend/lib/api.ts` | Modifier | Ajouter la fonction `createRestaurant()` |

---

## API

### Nouvelle fonction `createRestaurant()` dans `lib/api.ts`

```ts
export async function createRestaurant(payload: {
  name: string;
  address: string;
  zipCode: string;
  city: string;
  phone: string;
  email?: string;
}): Promise<{ data?: Restaurant; error?: string }> {
  const result = await apiFetch<Restaurant>("/restaurants/", {
    method: "POST",
    body: JSON.stringify(payload),
  });
  return "data" in result ? { data: result.data } : { error: result.error };
}
```

---

## Page `/admin/create`

### Champs du formulaire

| Champ | Type | Requis | Validation |
|-------|------|--------|------------|
| Nom du restaurant | text | oui | 1–50 chars |
| Adresse | text | oui | 1–255 chars |
| Code postal | text | oui | regex `/^[0-9]{5}$/` |
| Ville | text | oui | 1–50 chars |
| Téléphone | tel | oui | validation backend |
| Email | email | non | format email |

Champs non exposés à la création (modifiables dans les settings) : `slug`, `imageUrl`.

### État local

```ts
const [name, setName] = useState("")
const [address, setAddress] = useState("")
const [zipCode, setZipCode] = useState("")
const [city, setCity] = useState("")
const [phone, setPhone] = useState("")
const [email, setEmail] = useState("")
const [loading, setLoading] = useState(false)
const [error, setError] = useState<string | null>(null)
```

### Comportement

- **Montage :** vérification de session Supabase. Si non connecté → `/login`. Si déjà un restaurant → `/admin/[id]` (protection contre l'accès direct à la page par un restaurateur existant).
- **Validation client :** champs requis vides bloquent la soumission avec message inline. Code postal validé par regex avant appel API.
- **Soumission :** appel `createRestaurant()`, spinner sur le bouton. En cas d'erreur API → message affiché sous le formulaire. En cas de succès → `router.replace(`/admin/${data.id}`)`.

### UI

- Même style que `register/page.tsx` : carte `border border-brand-border rounded-lg p-6`
- Composants du design system : `Input`, `Label`, `Button` de `@/components/ui`
- Loader : `<Loader2 className="w-4 h-4 animate-spin" />` pendant la soumission

---

## Modification de `/admin/page.tsx`

Remplacer le bloc `if (noRestaurant)` par une redirection :

```ts
// Avant
setNoRestaurant(true);

// Après
router.replace("/admin/create");
```

Supprimer l'état `noRestaurant` et le JSX associé.

---

## Ce qui est hors scope

- Upload d'image à la création (disponible dans settings)
- Slug personnalisé (auto-généré par le backend, modifiable dans settings)
- Formulaire multi-étapes
- Composant `RestaurantForm` partagé entre création et settings
