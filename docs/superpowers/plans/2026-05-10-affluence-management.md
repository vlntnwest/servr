# Affluence Management Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implémenter la gestion de l'affluence sur mobile (segmented control) et corriger/améliorer les comportements CLOSED + labels temps sur le frontend.

**Architecture:** Le hook `use-affluence` lit le `preparationLevel` du contexte restaurant et expose un `setLevel` optimiste qui appelle le PATCH API existant. Le composant `Affluence` est un segmented control 4 boutons intégré au-dessus du titre Commandes. Sur le frontend, les corrections sont localisées dans 3 fichiers existants.

**Tech Stack:** React Native + NativeWind 4, Expo Router, Next.js 15, Tailwind CSS

---

## Fichiers modifiés

| Fichier | Rôle |
|---------|------|
| `mobile/hooks/use-affluence.ts` | Hook : état local + PATCH API + sync contexte |
| `mobile/app/(app)/(tabs)/orders/components/affluence.tsx` | Composant segmented control |
| `mobile/app/(app)/(tabs)/orders/index.tsx` | Intégration du composant |
| `frontend/components/cart/order-date.tsx` | Fix CLOSED + "Prévu pour HH:MM" |
| `frontend/components/cart/cart.tsx` | Désactiver bouton si CLOSED |
| `frontend/components/store/restaurant-header.tsx` | Labels temps dans PREP_BADGES |

---

## Task 1 : Hook use-affluence (mobile)

**Files:**
- Modify: `mobile/hooks/use-affluence.ts`

- [ ] **Remplacer le contenu du hook**

```typescript
import { useCallback, useEffect, useState } from "react";
import { useRestaurant } from "@/context/restaurant";
import { apiFetch, getRestaurantId } from "@/lib/api";
import { PreparationLevel, Restaurant } from "@/types/api";

export const PREP_LEVEL_LABELS: Record<PreparationLevel, string> = {
  EASY: "~15 min",
  MEDIUM: "~25 min",
  BUSY: "~40 min",
  CLOSED: "Fermé",
};

export function useAffluence() {
  const { selectedRestaurant, refresh } = useRestaurant();
  const [level, setLevelState] = useState<PreparationLevel>(
    selectedRestaurant?.preparationLevel ?? "EASY",
  );

  useEffect(() => {
    if (selectedRestaurant?.preparationLevel) {
      setLevelState(selectedRestaurant.preparationLevel);
    }
  }, [selectedRestaurant?.preparationLevel]);

  const setLevel = useCallback(
    async (newLevel: PreparationLevel) => {
      const previous = level;
      setLevelState(newLevel);
      const result = await apiFetch<Restaurant>(
        `/restaurants/${getRestaurantId()}/preparation-level`,
        { method: "PATCH", body: JSON.stringify({ preparationLevel: newLevel }) },
      );
      if ("error" in result) {
        setLevelState(previous);
      } else {
        await refresh();
      }
    },
    [level, refresh],
  );

  return { level, setLevel };
}
```

- [ ] **Commit**

```bash
git add mobile/hooks/use-affluence.ts
git commit -m "feat(mobile): implement use-affluence hook with optimistic update"
```

---

## Task 2 : Composant Affluence (mobile)

**Files:**
- Modify: `mobile/app/(app)/(tabs)/orders/components/affluence.tsx`

- [ ] **Remplacer le contenu du composant**

```typescript
import { Pressable, View } from "react-native";
import { Text } from "@/components/ui/text";
import { useAffluence, PREP_LEVEL_LABELS } from "@/hooks/use-affluence";
import { PreparationLevel } from "@/types/api";

const LEVELS: PreparationLevel[] = ["EASY", "MEDIUM", "BUSY", "CLOSED"];

const ACTIVE_STYLE: Record<PreparationLevel, { bg: string; text: string }> = {
  EASY: { bg: "bg-brand-forest/20", text: "text-brand-forest" },
  MEDIUM: { bg: "bg-brand-yellow/40", text: "text-brand-ink" },
  BUSY: { bg: "bg-brand-orange/20", text: "text-brand-orange" },
  CLOSED: { bg: "bg-brand-maroon/15", text: "text-brand-maroon" },
};

export default function Affluence() {
  const { level, setLevel } = useAffluence();

  return (
    <View className="flex-row bg-brand-sand rounded-xl p-1 mx-5 mb-2">
      {LEVELS.map((l) => {
        const active = level === l;
        const { bg, text } = ACTIVE_STYLE[l];
        return (
          <Pressable
            key={l}
            onPress={() => setLevel(l)}
            className={`flex-1 py-2 rounded-lg items-center ${active ? bg : ""}`}
          >
            <Text
              className={`text-action font-sans-medium ${active ? text : "text-brand-stone"}`}
            >
              {PREP_LEVEL_LABELS[l]}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}
```

- [ ] **Commit**

```bash
git add mobile/app/\(app\)/\(tabs\)/orders/components/affluence.tsx
git commit -m "feat(mobile): implement Affluence segmented control"
```

---

## Task 3 : Intégration dans la page Commandes (mobile)

**Files:**
- Modify: `mobile/app/(app)/(tabs)/orders/index.tsx`

- [ ] **Ajouter l'import et le composant**

Remplacer le fichier par :

```typescript
import { ScrollView, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Text } from "@/components/ui/text";
import { useOrders } from "@/hooks/use-orders";
import { orderStore } from "@/lib/order-store";
import { Order } from "@/types/api";
import { router, useFocusEffect } from "expo-router";
import { useCallback } from "react";
import OrderCard from "./components/orderCard";
import Affluence from "./components/affluence";

export default function Orders() {
  const { orders, refetch } = useOrders();

  useFocusEffect(
    useCallback(() => {
      refetch();
    }, [refetch]),
  );

  const handlePress = (order: Order) => {
    orderStore.set(order);
    router.push(`/(app)/order/${order.id}`);
  };

  return (
    <SafeAreaView className="flex-1" edges={["top"]}>
      <View style={{ flex: 1 }}>
        <ScrollView style={{ flex: 1 }}>
          <Affluence />

          <View className="px-5 pt-4 pb-2">
            <Text variant="display">Commandes</Text>
          </View>

          <View className="flex flex-row flex-wrap gap-3 px-5">
            {orders?.map((order) => (
              <OrderCard
                key={order.id}
                order={order}
                onPress={() => handlePress(order)}
                className="w-full md:w-[48%] lg:w-[31%]"
              />
            ))}
          </View>
        </ScrollView>
      </View>
    </SafeAreaView>
  );
}
```

- [ ] **Vérifier visuellement dans le simulateur**

Lancer l'app et aller sur l'onglet Commandes :
- Le segmented control apparaît sous le titre "Commandes"
- Le niveau actuel du restaurant est sélectionné (fond coloré)
- Taper un autre niveau → le bouton change immédiatement (optimistic)
- Recharger l'app → le niveau persiste (vient du backend)

- [ ] **Commit**

```bash
git add mobile/app/\(app\)/\(tabs\)/orders/index.tsx
git commit -m "feat(mobile): integrate Affluence widget on orders screen"
```

---

## Task 4 : Fix CLOSED dans order-date (frontend)

**Files:**
- Modify: `frontend/components/cart/order-date.tsx`

- [ ] **Ajouter la constante PREP_DURATION_MINUTES et corriger availableDays**

Ajouter après les imports :

```typescript
import type { PreparationLevel } from "@/types/api";

const PREP_DURATION_MINUTES: Record<PreparationLevel, number> = {
  EASY: 15,
  MEDIUM: 25,
  BUSY: 40,
  CLOSED: 0,
};
```

Remplacer le `useMemo` de `availableDays` (lignes 84–103) par :

```typescript
const availableDays = useMemo(() => {
  if (restaurantCtx?.restaurant.preparationLevel === "CLOSED") return [];
  const days: { dateKey: string; label: string; slots: string[] }[] = [];
  for (let i = 0; i < DAYS_AHEAD; i++) {
    const date = new Date();
    date.setDate(date.getDate() + i);
    const dayOfWeek = date.getDay();
    const ranges = openingHours.filter((h) => h.dayOfWeek === dayOfWeek);
    if (ranges.length === 0) continue;
    const slots = ranges
      .sort((a, b) => a.openTime.localeCompare(b.openTime))
      .flatMap((h) => generateSlotsForDate(date, h.openTime, h.closeTime));
    if (slots.length === 0) continue;
    days.push({
      dateKey: date.toDateString(),
      label: formatDayLabel(date),
      slots,
    });
  }
  return days;
}, [openingHours, restaurantCtx?.restaurant.preparationLevel]);
```

Remplacer le `useEffect` d'auto-switch (lignes 106–115) par :

```typescript
useEffect(() => {
  if (!asapAvailable && orderType === "asap" && availableDays.length > 0) {
    setOrderType("scheduled");
    const first = availableDays[0];
    if (first) {
      setSelectedDay(first.dateKey);
      setScheduledFor(first.slots[0] ?? "");
    }
  }
}, [asapAvailable, availableDays, orderType, setScheduledFor]);
```

- [ ] **Ajouter le calcul du temps estimé et l'afficher**

Ajouter après le `useEffect` d'auto-switch :

```typescript
const estimatedReadyTime = useMemo(() => {
  const lvl = restaurantCtx?.restaurant.preparationLevel;
  if (!lvl || lvl === "CLOSED" || !asapAvailable) return null;
  const minutes = PREP_DURATION_MINUTES[lvl];
  const ready = new Date(Date.now() + minutes * 60 * 1000);
  return `${String(ready.getHours()).padStart(2, "0")}:${String(ready.getMinutes()).padStart(2, "0")}`;
}, [restaurantCtx?.restaurant.preparationLevel, asapAvailable]);
```

Remplacer le bloc radio ASAP (div avec `onClick={() => asapAvailable && handleTypeChange("asap")}`) par :

```tsx
<div
  onClick={() => asapAvailable && handleTypeChange("asap")}
  className={`flex items-center py-2 -mx-4 px-4 transition-colors ${asapAvailable ? "cursor-pointer hover:bg-brand-ink/[0.02]" : "opacity-40 cursor-not-allowed"}`}
>
  <div className="flex-1">
    <span className="text-body">Au plus vite</span>
    {estimatedReadyTime && orderType === "asap" && (
      <p className="text-body-sm text-brand-stone">
        Prévu pour {estimatedReadyTime}
      </p>
    )}
  </div>
  <RadioGroupItem
    value="asap"
    id="asap"
    className="border-2 pointer-events-none"
    disabled={!asapAvailable}
  />
</div>
```

- [ ] **Vérifier manuellement**

Dans le frontend admin, passer le restaurant en CLOSED :
- L'option "Au plus vite" doit être grisée
- L'option "Prévu pour…" (scheduled) doit aussi être grisée (availableDays vide)
- Repasser en EASY : "Au plus vite" s'active, "Prévu pour 14h15" apparaît sous le label

- [ ] **Commit**

```bash
git add frontend/components/cart/order-date.tsx
git commit -m "fix(frontend): block scheduled orders when CLOSED, add Prévu pour HH:MM on ASAP"
```

---

## Task 5 : Désactiver le bouton Finaliser si CLOSED (frontend)

**Files:**
- Modify: `frontend/components/cart/cart.tsx`

- [ ] **Ajouter useOptionalRestaurant et désactiver le bouton**

Ajouter l'import après les imports existants :

```typescript
import { useOptionalRestaurant } from "@/contexts/restaurant-context";
```

Dans le composant `Cart`, ajouter après `const { items, total, scheduledFor, clearCart } = useCart();` :

```typescript
const restaurantCtx = useOptionalRestaurant();
const isClosed = restaurantCtx?.restaurant.preparationLevel === "CLOSED";
```

Remplacer le bloc bouton + `CheckoutModal` (lignes 93–117) par :

```tsx
<div className="p-4 border-t border-brand-border bg-card">
  <div className="flex justify-between items-center mb-3">
    <span className="text-caption uppercase tracking-label font-semibold text-brand-stone">
      Total
    </span>
    <span className="t-price text-brand-ink">{formatEuros(total)}</span>
  </div>
  <Button
    className="w-full h-12 rounded-full bg-brand-orange hover:bg-brand-orange/90 text-body font-semibold tracking-cta text-brand-cream disabled:opacity-50 disabled:cursor-not-allowed"
    onClick={() => setCheckoutOpen(true)}
    disabled={total < 1 || isClosed}
    variant="default"
  >
    Finaliser la commande
  </Button>
  {isClosed && (
    <p className="text-center text-body-sm text-destructive mt-2">
      Le restaurant est actuellement fermé
    </p>
  )}
</div>
```

- [ ] **Vérifier manuellement**

Passer le restaurant en CLOSED depuis l'admin :
- Le bouton "Finaliser la commande" est grisé + non cliquable
- Le message "Le restaurant est actuellement fermé" apparaît
- Repasser en EASY : le bouton redevient actif, le message disparaît

- [ ] **Commit**

```bash
git add frontend/components/cart/cart.tsx
git commit -m "fix(frontend): disable checkout when restaurant is CLOSED"
```

---

## Task 6 : Mettre à jour les labels PREP_BADGES (frontend)

**Files:**
- Modify: `frontend/components/store/restaurant-header.tsx`

- [ ] **Remplacer PREP_BADGES avec les labels temps**

Remplacer le bloc `PREP_BADGES` (lignes 21–36) par :

```typescript
const PREP_BADGES: Record<PreparationLevel, { label: string; color: string }> = {
  EASY: {
    label: "~15 min",
    color: "bg-brand-forest/10 text-brand-forest",
  },
  MEDIUM: {
    label: "~25 min",
    color: "bg-brand-yellow/20 text-[#7a5e08]",
  },
  BUSY: {
    label: "~40 min",
    color: "bg-brand-orange/15 text-brand-orange",
  },
  CLOSED: { label: "Fermé", color: "bg-destructive/10 text-destructive" },
};
```

- [ ] **Vérifier visuellement**

Sur la page storefront d'un restaurant :
- EASY → badge "~15 min" vert (déjà masqué par la condition `!== "EASY"` existante — comportement conservé)
- MEDIUM → badge "~25 min" jaune
- BUSY → badge "~40 min" orange
- CLOSED → badge "Fermé" rouge

- [ ] **Commit**

```bash
git add frontend/components/store/restaurant-header.tsx
git commit -m "feat(frontend): update PREP_BADGES to show time labels instead of text"
```
