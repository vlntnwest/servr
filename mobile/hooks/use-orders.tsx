import { useRestaurant } from "@/context/restaurant";
import { apiFetch, getOrder, updateOrderStatus } from "@/lib/api";
import { Order } from "@/types/api";
import { useCallback, useEffect, useRef, useState } from "react";
import { Alert } from "react-native";
import { supabase } from "@/lib/supabase";
import { usePrinter } from "@/context/printer";
import { useAuth } from "@/context/auth";
import AsyncStorage from "@react-native-async-storage/async-storage";

export const useOrders = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [orders, setOrders] = useState<Order[] | null>(null);

  const { selectedRestaurant } = useRestaurant();
  const { initialized } = useAuth();
  const { printOrder, status: printerStatus } = usePrinter();
  const printOrderRef = useRef(printOrder);
  const printerStatusRef = useRef(printerStatus);
  useEffect(() => {
    printOrderRef.current = printOrder;
  }, [printOrder]);
  useEffect(() => {
    printerStatusRef.current = printerStatus;
  }, [printerStatus]);

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
    if (!selectedRestaurant || !initialized) return;

    const subscription = supabase
      .channel(`orders:${selectedRestaurant.id}`, {
        config: { private: true },
      })
      .on("broadcast", { event: "UPDATE" }, async (payload) => {
        const { record, old_record } = payload.payload;
        if (old_record?.status === "DRAFT" && record?.status === "PENDING") {
          const autoValidate = await AsyncStorage.getItem("autoValidate");
          if (autoValidate === "true") {
            await updateOrderStatus(record.id, "IN_PROGRESS");
          }
        }
        if (
          old_record?.status === "PENDING" &&
          record?.status === "IN_PROGRESS"
        ) {
          if (printerStatusRef.current !== "connected") {
            Alert.alert(
              "Imprimante déconnectée",
              "La commande a été validée mais l'imprimante n'est pas connectée.",
            );
          } else {
            const result = await getOrder(record.id);
            if (!("error" in result)) {
              printOrderRef.current(result.data);
            }
          }
        }
        fetchOrders();
      })
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  }, [selectedRestaurant, initialized]);

  return {
    isLoading,
    error,
    orders,
    refetch: fetchOrders,
  };
};
