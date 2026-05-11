# Historique des commandes — Plan d'implémentation

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ajouter une page "Historique des commandes" accessible depuis les Réglages, affichant les commandes DELIVERED et CANCELLED avec infinite scroll.

**Architecture:** Un nouveau hook `useOrderHistory` gère la pagination accumulative via l'API existante. La page `history.tsx` utilise un `FlatList` avec `onEndReached` pour charger les pages suivantes. L'écran de détail existant (`/order/[id]`) est réutilisé tel quel, avec une correction pour que le bouton Imprimer y soit toujours visible.

**Tech Stack:** Expo Router, React Native FlatList, NativeWind, Supabase, API REST interne (`apiFetch`)

---

## Fichiers concernés

| Action | Fichier |
|---|---|
| Créer | `mobile/hooks/use-order-history.tsx` |
| Créer | `mobile/app/(app)/(tabs)/settings/history.tsx` |
| Modifier | `mobile/app/(app)/(tabs)/orders/components/orderDetail.tsx` |
| Modifier | `mobile/app/(app)/(tabs)/settings/components/settingsList.tsx` |
| Modifier | `mobile/app/(app)/(tabs)/settings/_layout.tsx` |

---

## Task 1 : Créer la branche feature

**Files:** aucun

- [ ] **Créer et basculer sur la branche**

```bash
git checkout dev
git checkout -b feature/order-history
```

Expected : prompt shell affiche `feature/order-history`

---

## Task 2 : Corriger le bouton Imprimer dans `orderDetail.tsx`

**Files:**
- Modify: `mobile/app/(app)/(tabs)/orders/components/orderDetail.tsx`

Actuellement, le bouton Imprimer est à l'intérieur du bloc `{actions.length > 0 && (...)}`. Pour DELIVERED et CANCELLED, `getStatusActions` retourne `[]`, donc le bouton est invisible. Il faut le sortir du bloc conditionnel.

- [ ] **Modifier `orderDetail.tsx`**

Remplacer le bloc Actions (lignes 132–156) :

```tsx
      {/* Actions */}
      {actions.length > 0 && (
        <>
          <Separator />
          <View className="flex-row gap-2">
            {actions.map((action) => (
              <Button
                key={action.targetStatus}
                variant={action.variant}
                className="flex-1"
                disabled={updating}
                onPress={() => onStatusChange(action.targetStatus)}
              >
                <Text>{updating ? "En cours…" : action.label}</Text>
              </Button>
            ))}
          </View>
        </>
      )}

      <Separator />
      <View>
        <Button variant="link" onPress={handlePrint}>
          <Text>Imprimer</Text>
        </Button>
      </View>
```

- [ ] **Vérifier visuellement** : ouvrir une commande active → boutons d'action + Imprimer visibles. Ouvrir une commande DELIVERED ou CANCELLED → seul Imprimer visible.

- [ ] **Commit**

```bash
git add mobile/app/\(app\)/\(tabs\)/orders/components/orderDetail.tsx
git commit -m "fix(mobile): always show print button in order detail"
```

---

## Task 3 : Hook `useOrderHistory`

**Files:**
- Create: `mobile/hooks/use-order-history.tsx`

Ce hook gère la pagination accumulative. Il expose `orders`, `isLoading`, `hasMore`, `loadMore`, et `reset` (pour relancer depuis la page 1).

- [ ] **Créer `mobile/hooks/use-order-history.tsx`**

```tsx
import { useCallback, useEffect, useRef, useState } from "react";
import { apiFetch } from "@/lib/api";
import { Order, PaginatedResponse } from "@/types/api";
import { useRestaurant } from "@/context/restaurant";

export function useOrderHistory() {
  const { selectedRestaurant } = useRestaurant();
  const [orders, setOrders] = useState<Order[]>([]);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const isFetchingRef = useRef(false);

  const fetchPage = useCallback(
    async (pageToFetch: number) => {
      if (!selectedRestaurant || isFetchingRef.current) return;
      isFetchingRef.current = true;
      setIsLoading(true);

      const result = await apiFetch<PaginatedResponse<Order>>(
        `/restaurants/${selectedRestaurant.id}/orders?status=DELIVERED,CANCELLED&page=${pageToFetch}&limit=20`,
      );

      if (!("error" in result)) {
        const { data, pagination } = result.data;
        setOrders((prev) =>
          pageToFetch === 1 ? data : [...prev, ...data],
        );
        setHasMore(pageToFetch < pagination.totalPages);
      }

      setIsLoading(false);
      isFetchingRef.current = false;
    },
    [selectedRestaurant],
  );

  useEffect(() => {
    fetchPage(1);
  }, [fetchPage]);

  const loadMore = useCallback(() => {
    if (isLoading || !hasMore) return;
    const next = page + 1;
    setPage(next);
    fetchPage(next);
  }, [isLoading, hasMore, page, fetchPage]);

  const reset = useCallback(() => {
    setOrders([]);
    setPage(1);
    setHasMore(true);
    fetchPage(1);
  }, [fetchPage]);

  return { orders, isLoading, hasMore, loadMore, reset };
}
```

- [ ] **Commit**

```bash
git add mobile/hooks/use-order-history.tsx
git commit -m "feat(mobile): add useOrderHistory hook with paginated loading"
```

---

## Task 4 : Page `history.tsx`

**Files:**
- Create: `mobile/app/(app)/(tabs)/settings/history.tsx`

La page utilise `FlatList` (pas `ScrollView`) pour le support natif de `onEndReached`. Elle réutilise `OrderCard` et `orderStore` exactement comme `orders/index.tsx`.

- [ ] **Créer `mobile/app/(app)/(tabs)/settings/history.tsx`**

```tsx
import { ActivityIndicator, FlatList, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Text } from "@/components/ui/text";
import { useOrderHistory } from "@/hooks/use-order-history";
import { orderStore } from "@/lib/order-store";
import { Order } from "@/types/api";
import { router, useFocusEffect } from "expo-router";
import { useCallback } from "react";
import OrderCard from "../orders/components/orderCard";

export default function OrderHistory() {
  const { orders, isLoading, hasMore, loadMore, reset } = useOrderHistory();

  useFocusEffect(
    useCallback(() => {
      reset();
    }, [reset]),
  );

  const handlePress = (order: Order) => {
    orderStore.set(order);
    router.push(`/(app)/order/${order.id}`);
  };

  return (
    <SafeAreaView className="flex-1" edges={["bottom"]}>
      <FlatList
        data={orders}
        keyExtractor={(item) => item.id}
        contentContainerClassName="px-5 pt-4 pb-8 gap-3"
        numColumns={1}
        ListHeaderComponent={
          <View className="pb-2">
            <Text variant="display">Historique</Text>
          </View>
        }
        ListEmptyComponent={
          !isLoading ? (
            <Text variant="muted" className="text-center mt-8">
              Aucune commande dans l'historique
            </Text>
          ) : null
        }
        ListFooterComponent={
          isLoading ? (
            <ActivityIndicator className="py-4" />
          ) : null
        }
        renderItem={({ item }) => (
          <OrderCard
            order={item}
            onPress={() => handlePress(item)}
            className="w-full"
          />
        )}
        onEndReached={loadMore}
        onEndReachedThreshold={0.3}
      />
    </SafeAreaView>
  );
}
```

- [ ] **Commit**

```bash
git add mobile/app/\(app\)/\(tabs\)/settings/history.tsx
git commit -m "feat(mobile): add order history screen with infinite scroll"
```

---

## Task 5 : Enregistrer l'écran dans `settings/_layout.tsx`

**Files:**
- Modify: `mobile/app/(app)/(tabs)/settings/_layout.tsx`

Sans ce `Stack.Screen`, Expo Router génère un header par défaut (titre, back button complet). On veut le même style minimaliste que `printer` et `general`.

- [ ] **Modifier `_layout.tsx`** — dans le bloc `return (<Stack>...)`, ajouter après le `Stack.Screen` `"general"` :

```tsx
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

- [ ] **Commit**

```bash
git add mobile/app/\(app\)/\(tabs\)/settings/_layout.tsx
git commit -m "feat(mobile): register history screen in settings layout"
```

---

## Task 6 : Ajouter la Row dans `settingsList.tsx`

**Files:**
- Modify: `mobile/app/(app)/(tabs)/settings/components/settingsList.tsx`

Nouvelle section "Activité" après la section "Matériel", avec une seule Row.

- [ ] **Modifier `settingsList.tsx`** — ajouter après la section Matériel (après la `</View>` qui ferme le groupe Imprimante) et avant le `<Button>` Se déconnecter :

```tsx
      <Text variant="default" className="px-5 mb-1.5 mt-4">
        Activité
      </Text>
      <View className={`${isTablet ? "" : "px-5"}`}>
        <View className="rounded-[30px] overflow-hidden">
          <Row
            iconName="clock.arrow.circlepath"
            iconBg={BRAND.stone}
            label="Historique des commandes"
            onPress={() => router.push("/settings/history")}
            active={pathname === "/settings/history"}
            showSeparator={false}
          />
        </View>
      </View>
```

- [ ] **Commit**

```bash
git add mobile/app/\(app\)/\(tabs\)/settings/components/settingsList.tsx
git commit -m "feat(mobile): add order history entry in settings"
```

---

## Task 7 : Test manuel de bout en bout

- [ ] Lancer l'app : `npx expo start`
- [ ] Ouvrir l'onglet **Réglages** → vérifier que la section "Activité" avec "Historique des commandes" apparaît
- [ ] Taper la row → la page Historique s'ouvre avec le header minimaliste
- [ ] Vérifier que les commandes DELIVERED/CANCELLED apparaissent en cartes
- [ ] Scroller jusqu'en bas → la page suivante se charge automatiquement (spinner visible puis nouvelles cartes)
- [ ] Taper une carte → écran de détail s'ouvre, seul le bouton "Imprimer" est visible (aucun bouton d'action de statut)
- [ ] Quitter puis revenir sur Historique → liste rechargée depuis la page 1
- [ ] Sur tablette (≥768px) : vérifier que la row Historique apparaît dans la sidebar et que le layout de la liste est correct
