# Gestion de l'affluence — Design Spec

**Date :** 2026-05-10
**Scope :** Mobile (widget affluence) + Frontend (fix CLOSED + labels temps + "Prévu pour")

---

## Contexte

Le restaurant dispose d'un niveau de préparation (`preparationLevel`) parmi quatre valeurs :
`EASY | MEDIUM | BUSY | CLOSED`. Ce niveau est stocké en base et exposé via :
- `GET /api/v1/user/me` → `user.restaurants[].preparationLevel`
- `PATCH /api/v1/restaurants/:id/preparation-level`

Côté mobile, le composant `Affluence` existe mais est vide. Le hook `use-affluence.ts` est un stub.
Côté frontend, les labels sont des noms texte ("Calme", "Forte affluence"…) et le blocage des commandes quand CLOSED est partiel.

---

## Labels temps

| Level | Label affiché |
|-------|---------------|
| EASY | ~15 min |
| MEDIUM | ~25 min |
| BUSY | ~40 min |
| CLOSED | Fermé |

Ces valeurs sont constantes et définies côté client (mobile + frontend). Pas de config backend.

---

## Surface 1 — Mobile : widget affluence

### Emplacement
Au-dessus du titre *Commandes* dans `mobile/app/(app)/(tabs)/orders/index.tsx`.

### Composants

**`hooks/use-affluence.ts`**
- Lit `selectedRestaurant.preparationLevel` depuis `useRestaurant()`
- Expose `level: PreparationLevel` et `setLevel(level) → Promise<void>`
- `setLevel` : optimistic update local → PATCH `/restaurants/:id/preparation-level` via `apiFetch` → `refresh()` si succès, rollback si erreur

**`orders/components/affluence.tsx`**
- Segmented control 4 boutons pleine largeur
- Container : `bg-sand rounded-xl p-1 mx-5 mb-2`
- Bouton actif : fond coloré selon le niveau
  - EASY → `bg-brand-forest/20 text-brand-forest`
  - MEDIUM → `bg-brand-yellow/40 text-brand-ink`
  - BUSY → `bg-brand-orange/20 text-brand-orange`
  - CLOSED → fond rouge léger, texte rouge
- Bouton inactif : transparent, `text-stone`
- Chaque bouton affiche le label temps (`~15 min`, `~25 min`, `~40 min`, `Fermé`)
- Au tap : appelle `setLevel` du hook

**`orders/index.tsx`**
- Importe et place `<Affluence />` entre le `SafeAreaView` et le titre *Commandes*

### Comportement
- État initial : niveau venant du contexte restaurant (pas de fetch dédié)
- Optimistic update : le bouton sélectionné change immédiatement, se rollback si l'API échoue
- Pas de loading state visible (optimistic)

---

## Surface 2 — Frontend : fix blocage CLOSED

### Problème
Quand `preparationLevel === "CLOSED"` :
- `asapAvailable` est `false` → ASAP désactivé ✓
- Le composant auto-bascule sur "programmée" → le client peut quand même commander ✗
- Le bouton *Finaliser* dans `cart.tsx` ne vérifie pas CLOSED ✗

### Fix

**`frontend/components/cart/order-date.tsx`**
- `availableDays` retourne `[]` quand `preparationLevel === "CLOSED"`, en plus du filtre d'horaires existant
- L'auto-switch vers "scheduled" ne s'active que si `availableDays.length > 0`

**`frontend/components/cart/cart.tsx`**
- Le bouton *Finaliser la commande* est désactivé si `preparationLevel === "CLOSED"` (en plus de `total < 1`)
- Afficher un message sous le bouton : *"Le restaurant est actuellement fermé"*

---

## Surface 3 — Frontend : labels temps + "Prévu pour"

### Labels dans le restaurant header

**`frontend/components/store/restaurant-header.tsx`**
- Mettre à jour `PREP_BADGES` :
  - EASY → `~15 min` (badge affiché seulement si non-EASY, comportement existant conservé)
  - MEDIUM → `~25 min`
  - BUSY → `~40 min`
  - CLOSED → `Fermé`

### "Prévu pour HH:MM" dans le sélecteur ASAP

**`frontend/components/cart/order-date.tsx`**
- Quand l'option ASAP est sélectionnée, afficher sous le bouton : *"Prévu pour HH:MM"*
- Calcul : `maintenant + durée du niveau` (15, 25 ou 40 minutes selon `preparationLevel`)
- Arrondi à la minute supérieure
- Ne pas afficher si CLOSED (ASAP déjà désactivé)

---

## Fichiers touchés

| Fichier | Modification |
|---------|-------------|
| `mobile/hooks/use-affluence.ts` | Implémenter le hook |
| `mobile/app/(app)/(tabs)/orders/components/affluence.tsx` | Implémenter le composant |
| `mobile/app/(app)/(tabs)/orders/index.tsx` | Intégrer `<Affluence />` |
| `frontend/components/cart/order-date.tsx` | Fix CLOSED + "Prévu pour" |
| `frontend/components/cart/cart.tsx` | Désactiver bouton si CLOSED |
| `frontend/components/store/restaurant-header.tsx` | Mettre à jour labels |

---

## Hors scope

- Configuration dynamique des durées par restaurant (hardcodé côté client)
- Validation CLOSED côté backend (endpoint checkout existant, pas modifié)
- Notifications push au changement de niveau
