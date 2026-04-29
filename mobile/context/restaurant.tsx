import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";
import type { Restaurant, User } from "../types/api";
import { useAuth } from "./auth";
import { apiFetch, setRestaurantId } from "@/lib/api";

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

  const { session } = useAuth();

  useEffect(() => {
    if (!session) {
      setRestaurants([]);
      setSelectedRestaurant(null);
      setError(null);
      return;
    }

    const init = async () => {
      setIsLoading(true);
      const result = await apiFetch<User>("/user/me");
      if ("error" in result) {
        setError(result.error);
      } else {
        setRestaurants(result.data.restaurants ?? []);
      }
      setIsLoading(false);
    };

    init();
  }, [session]);

  const selectRestaurant = useCallback(
    (id: string) => {
      const restaurant = restaurants.find((r) => r.id === id) ?? null;
      setSelectedRestaurant(restaurant);
      setRestaurantId(restaurant?.id ?? "");
    },
    [restaurants],
  );

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
