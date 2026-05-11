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
