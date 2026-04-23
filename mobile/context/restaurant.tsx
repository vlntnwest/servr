import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import type { Restaurant } from "../types/api";

type RestaurantContextType = {
  restaurants: Restaurant[]; // liste pour l'écran de sélection
  selectedRestaurant: Restaurant | null;
  selectRestaurant: (id: string) => void;
  isLoading: boolean;
  error: string | null;
  refresh: () => Promise<void>; // refresh manuel si besoin
};

const RestaurantContext = createContext<RestaurantContextType>({
  restaurants: [],
  selectedRestaurant: null,
  selectRestaurant: () => {},
  isLoading: false,
  error: null,
  refresh: () => Promise.resolve(),
});

export function RestaurantProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [restaurants, setRestaurants] = useState<Restaurant[]>([]);
  const [selectedRestaurant, setSelectedRestaurant] =
    useState<Restaurant | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setRestaurants([]);
  }, []);

  const selectRestaurant = useCallback((id: string) => {
    // TODO: select restaurant
  }, []);

  const refresh = useCallback(async () => {
    // TODO: refresh restaurants
  }, []);

  return (
    <RestaurantContext.Provider
      value={{
        restaurants: restaurants,
        selectedRestaurant: selectedRestaurant,
        selectRestaurant: selectRestaurant,
        isLoading: isLoading,
        error: error,
        refresh: refresh,
      }}
    >
      {children}
    </RestaurantContext.Provider>
  );
}

export function useRestaurant() {
  return useContext(RestaurantContext);
}
