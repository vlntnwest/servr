import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";
import type { Restaurant } from "../types/api";
import { useAuth } from "./auth";
import { getApiUrl } from "@/lib/api";

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
      return;
    }

    const init = async () => {
      setIsLoading(true);
      try {
        const res = await fetch(`${getApiUrl()}/api/v1/user/me`, {
          headers: {
            Authorization: `Bearer ${session.access_token}`,
          },
        });
        const { data } = await res.json();
        setRestaurants(data.restaurants ?? []);
      } catch (e) {
        setError("Failed to load restaurants");
      } finally {
        setIsLoading(false);
      }
    };

    init();
  }, [session]);

  const selectRestaurant = useCallback(
    (id: string) => {
      setSelectedRestaurant(restaurants.find((r) => r.id === id) ?? null);
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
