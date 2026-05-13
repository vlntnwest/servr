import { useEffect, useRef } from "react";
import { AppState, AppStateStatus } from "react-native";
import { useRestaurant } from "@/context/restaurant";

export function useAppLifecycle() {
  const { refresh } = useRestaurant();
  const appState = useRef<AppStateStatus>(AppState.currentState);

  useEffect(() => {
    const subscription = AppState.addEventListener(
      "change",
      async (nextState) => {
        const prevState = appState.current;
        appState.current = nextState;

        if (nextState === "active" && prevState !== "active") {
          await refresh();
        }
      },
    );

    return () => subscription.remove();
  }, [refresh]);
}
