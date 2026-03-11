"use client";

import { createContext, useContext, type ReactNode } from "react";
import type { Restaurant } from "@/types/api";

type RestaurantContextType = {
  restaurant: Restaurant;
  slug: string;
};

const RestaurantContext = createContext<RestaurantContextType | null>(null);

export function RestaurantProvider({
  restaurant,
  slug,
  children,
}: {
  restaurant: Restaurant;
  slug: string;
  children: ReactNode;
}) {
  return (
    <RestaurantContext.Provider value={{ restaurant, slug }}>
      {children}
    </RestaurantContext.Provider>
  );
}

export function useRestaurant() {
  const ctx = useContext(RestaurantContext);
  if (!ctx) throw new Error("useRestaurant must be used within RestaurantProvider");
  return ctx;
}

export function useOptionalRestaurant() {
  return useContext(RestaurantContext);
}
