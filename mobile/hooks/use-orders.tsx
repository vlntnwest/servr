import { useRestaurant } from "@/context/restaurant";
import { apiFetch, getOrder, updateOrderStatus } from "@/lib/api";
import { Order } from "@/types/api";
import { useCallback, useEffect, useRef, useState } from "react";
import { Alert } from "react-native";
import { connectSocket } from "@/lib/socket";
import { usePrinter } from "@/context/printer";
import { useAuth } from "@/context/auth";
import AsyncStorage from "@react-native-async-storage/async-storage";

const ACTIVE_STATUSES =
  "PENDING,PENDING_ON_SITE_PAYMENT,IN_PROGRESS,COMPLETED";

export const useOrders = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [orders, setOrders] = useState<Order[] | null>(null);

  const { selectedRestaurant } = useRestaurant();
  const { session, initialized } = useAuth();
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
      `/restaurants/${selectedRestaurant.id}/orders?status=${ACTIVE_STATUSES}`,
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

  // Real-time order events via Socket.IO. The API emits `order:new` on
  // payment confirmation (Stripe webhook) or on-site order creation, and
  // `order:statusUpdated` whenever an admin advances the state machine.
  useEffect(() => {
    if (!selectedRestaurant || !initialized || !session) return;

    let active = true;
    let socketRef: Awaited<ReturnType<typeof connectSocket>> = null;

    const handleNewOrder = async (order: Order) => {
      const autoValidate = await AsyncStorage.getItem("autoValidate");
      if (autoValidate === "true" && order.status === "PENDING") {
        try {
          await updateOrderStatus(order.id, "IN_PROGRESS");
        } catch {
          /* fetchOrders below will resync state */
        }
      }
      fetchOrders();
    };

    const handleStatusUpdated = async (order: Order) => {
      if (order.status === "IN_PROGRESS") {
        if (printerStatusRef.current !== "connected") {
          Alert.alert(
            "Imprimante déconnectée",
            "La commande a été validée mais l'imprimante n'est pas connectée.",
          );
        } else {
          const result = await getOrder(order.id);
          if (!("error" in result)) {
            printOrderRef.current(result.data);
          }
        }
      }
      fetchOrders();
    };

    (async () => {
      const s = await connectSocket();
      if (!s || !active) return;
      socketRef = s;

      const join = () => s.emit("join:restaurant", selectedRestaurant.id);
      join();

      s.on("connect", join);
      s.on("order:new", handleNewOrder);
      s.on("order:statusUpdated", handleStatusUpdated);
    })();

    return () => {
      active = false;
      if (socketRef) {
        socketRef.off("order:new", handleNewOrder);
        socketRef.off("order:statusUpdated", handleStatusUpdated);
        socketRef.off("connect");
      }
    };
  }, [selectedRestaurant, initialized, session, fetchOrders]);

  return {
    isLoading,
    error,
    orders,
    refetch: fetchOrders,
  };
};
