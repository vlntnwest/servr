import { useRestaurant } from "@/context/restaurant";
import { apiFetch } from "@/lib/api";
import { Order } from "@/types/api";
import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

export const useOrders = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [orders, setOrders] = useState<Order[] | null>(null);

  const { selectedRestaurant } = useRestaurant();

  const fetchOrders = useCallback(async () => {
    if (!selectedRestaurant) return;
    setIsLoading(true);
    setError(null);
    const result = await apiFetch<Order[]>(
      `/restaurants/${selectedRestaurant.id}/orders?status=PENDING,IN_PROGRESS,COMPLETED`,
    );
    if ("error" in result) {
      setError(result.error);
    } else {
      setOrders(result.data);
    }
    setIsLoading(false);
  }, [selectedRestaurant]);

  useEffect(() => {
    fetchOrders();
  }, [fetchOrders]);

  useEffect(() => {
    if (!selectedRestaurant) return;
    const realTimeOrdersSubscription = () => {
      if (!selectedRestaurant) return;

      const subscription = supabase
        .channel(`orders-${selectedRestaurant.id}`)
        .on(
          "postgres_changes",
          {
            event: "*",
            schema: "public",
            table: "orders",
          },
          () => {
            fetchOrders();
          },
        )
        .subscribe();

      return () => {
        subscription.unsubscribe();
      };
    };

    const cleanup = realTimeOrdersSubscription();
    return cleanup;
  }, [selectedRestaurant]);

  return {
    isLoading,
    error,
    orders,
    refetch: fetchOrders,
  };
};
