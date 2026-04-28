import { updateOrderStatus } from "@/lib/api";
import { orderStore } from "@/lib/order-store";
import { router } from "expo-router";
import { useState } from "react";
import OrderDetail from "./components/orderDetail";

export default function OrderDetailScreen() {
  const order = orderStore.get();
  const [updating, setUpdating] = useState(false);

  if (!order) return null;

  const handleStatusChange = async (targetStatus: string) => {
    setUpdating(true);
    const result = await updateOrderStatus(order.id, targetStatus);
    if ("error" in result) {
      console.error("Failed to update order status:", result.error);
    } else {
      orderStore.clear();
      router.back();
    }
    setUpdating(false);
  };

  return (
    <OrderDetail
      order={order}
      updating={updating}
      onStatusChange={handleStatusChange}
    />
  );
}
