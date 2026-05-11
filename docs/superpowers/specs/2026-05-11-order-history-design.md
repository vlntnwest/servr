# Design — Historique des commandes

## Contexte

L'app mobile (Expo Router, NativeWind) permet aux restaurateurs de gérer leurs commandes en temps réel. La page Commandes affiche les statuts actifs (`PENDING`, `IN_PROGRESS`, `COMPLETED`). Il n'existe aucun accès aux commandes terminées (`DELIVERED`, `CANCELLED`). Ce design ajoute une entrée dans les Réglages et une page dédiée à l'historique.

---

## Architecture

### Nouveaux fichiers

| Fichier | Rôle |
|---|---|
| `mobile/hooks/use-order-history.tsx` | Hook de pagination accumulative |
| `mobile/app/(app)/(tabs)/settings/history.tsx` | Page historique |

### Fichiers modifiés

| Fichier | Modification |
|---|---|
| `settings/components/settingsList.tsx` | +1 section "Activité" + Row |
| `settings/_layout.tsx` | +1 Stack.Screen "history" |
| `orders/components/orderDetail.tsx` | Bouton Imprimer sorti du bloc conditionnel |

---

## Hook `useOrderHistory`

```
état : orders[], page, isLoading, hasMore
```

- Fetch `GET /restaurants/:id/orders?status=DELIVERED,CANCELLED&page=X&limit=20`
- Les résultats s'**accumulent** (`[...prev, ...newOrders]`), jamais remplacés
- `hasMore = page < pagination.totalPages`
- `loadMore()` : no-op si `isLoading` ou `!hasMore`, sinon incrémente `page` et fetch
- Fetch initial au montage via `useEffect`

---

## Page `history.tsx`

- `FlatList` (pas `ScrollView`) pour le support natif de `onEndReached`
- `onEndReachedThreshold={0.3}` → déclenche `loadMore()` à 30% avant la fin
- `ListFooterComponent` : `ActivityIndicator` si `isLoading`, `null` sinon
- `ListEmptyComponent` : texte "Aucune commande dans l'historique" si liste vide et `!isLoading`
- Tap sur une carte → `orderStore.set(order)` + `router.push('/(app)/order/${order.id}')` (identique à `orders/index.tsx`)
- Layout responsive : `className="w-full md:w-[48%] lg:w-[31%]"` sur chaque `OrderCard`
- `useFocusEffect` + `refetch` (reset page=1, vider tableau) au focus de l'écran

---

## Modification `orderDetail.tsx`

Le bouton Imprimer est actuellement à l'intérieur du bloc `{actions.length > 0 && ...}`. Il en sort pour être **toujours rendu**, indépendamment des actions de statut disponibles.

Résultat pour DELIVERED / CANCELLED :
- Aucun bouton d'action de statut
- Bouton "Imprimer" visible

---

## Modification `settingsList.tsx`

Nouvelle section sous "Matériel" :

```
Activité
└── Row — icône: clock.arrow.circlepath, fond: BRAND.stone
          label: "Historique des commandes"
          onPress: router.push("/settings/history")
```

---

## Modification `settings/_layout.tsx`

Ajout d'un `Stack.Screen` pour `"history"` avec les mêmes options que `"printer"` et `"general"` :

```ts
<Stack.Screen
  name="history"
  options={{
    headerBackButtonDisplayMode: "minimal",
    headerTitle: "",
    headerStyle: { backgroundColor: bg },
    headerShadowVisible: false,
  }}
/>
```

---

## Ce qui n'est pas dans ce scope

- Filtrage par statut (DELIVERED vs CANCELLED) — liste mixte uniquement
- Recherche dans l'historique
- Modification du statut depuis l'historique
