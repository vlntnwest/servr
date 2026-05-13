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
  const [optimisticLevel, setOptimisticLevel] = useState<PreparationLevel | null>(null);

  const level: PreparationLevel =
    optimisticLevel ?? selectedRestaurant?.preparationLevel ?? "EASY";

  console.log("[affluence] optimistic:", optimisticLevel, "| context:", selectedRestaurant?.preparationLevel, "| displayed:", level);

  useEffect(() => {
    console.log("[affluence] selectedRestaurant changed →", selectedRestaurant?.id, "preparationLevel:", selectedRestaurant?.preparationLevel);
  }, [selectedRestaurant]);

  const setLevel = useCallback(
    async (newLevel: PreparationLevel) => {
      const previous = selectedRestaurant?.preparationLevel ?? null;
      setOptimisticLevel(newLevel);
      const result = await apiFetch<Restaurant>(
        `/restaurants/${getRestaurantId()}/preparation-level`,
        {
          method: "PATCH",
          body: JSON.stringify({ preparationLevel: newLevel }),
        },
      );
      if ("error" in result) {
        setOptimisticLevel(previous);
      } else {
        setOptimisticLevel(null);
        await refresh();
      }
    },
    [selectedRestaurant?.preparationLevel, refresh],
  );

  return { level, setLevel };
}
