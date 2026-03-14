"use client";

import { useEffect, useState, useCallback } from "react";
import { getOrders, updateOrderStatus } from "@/lib/api";
import type { Order } from "@/types/api";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import {
  formatEuros,
  getOrderStatusLabel,
  getOrderStatusColor,
} from "@/lib/utils";
import dayjs from "dayjs";
import relativeTime from "dayjs/plugin/relativeTime";
import "dayjs/locale/fr";

dayjs.extend(relativeTime);
dayjs.locale("fr");

const ORDER_STATUSES = [
  "PENDING",
  "PENDING_ON_SITE_PAYMENT",
  "IN_PROGRESS",
  "COMPLETED",
  "DELIVERED",
  "CANCELLED",
] as const;

export default function OrdersTab() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  const fetchOrders = useCallback(async () => {
    setLoading(true);
    try {
      const result = await getOrders(page, 20);
      setOrders(result.data);
      setTotalPages(result?.pagination?.totalPages || 1);
    } finally {
      setLoading(false);
    }
  }, [page]);

  useEffect(() => {
    fetchOrders();
  }, [fetchOrders]);

  const handleStatusChange = async (orderId: string, status: string) => {
    await updateOrderStatus(orderId, status);
    fetchOrders();
  };

  if (loading) {
    return (
      <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
        {[1, 2, 3, 4].map((i) => (
          <Skeleton key={i} className="h-48 rounded-lg" />
        ))}
      </div>
    );
  }

  if (orders?.length === 0) {
    return <p className="text-[#676767] text-center py-12">Aucune commande</p>;
  }

  return (
    <div>
      <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
        {orders?.map((order) => (
          <OrderCard
            key={order.id}
            order={order}
            onStatusChange={handleStatusChange}
          />
        ))}
      </div>

      {totalPages > 1 && (
        <div className="flex justify-center gap-2 mt-6">
          <Button
            variant="outline"
            size="sm"
            disabled={page <= 1}
            onClick={() => setPage((p) => p - 1)}
          >
            Précédent
          </Button>
          <span className="flex items-center text-sm text-[#676767]">
            Page {page} / {totalPages}
          </span>
          <Button
            variant="outline"
            size="sm"
            disabled={page >= totalPages}
            onClick={() => setPage((p) => p + 1)}
          >
            Suivant
          </Button>
        </div>
      )}
    </div>
  );
}

function OrderCard({
  order,
  onStatusChange,
}: {
  order: Order;
  onStatusChange: (id: string, status: string) => void;
}) {
  return (
    <div className="bg-white border border-black/5 rounded-lg p-4 flex flex-col gap-2">
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="font-bold text-sm">
            {order.fullName ?? "Client anonyme"}
          </p>
          {order.phone && (
            <p className="text-xs text-[#676767]">{order.phone}</p>
          )}
        </div>
        <span
          className={`text-xs px-2 py-0.5 rounded-full font-medium ${getOrderStatusColor(order.status)}`}
        >
          {getOrderStatusLabel(order.status)}
        </span>
      </div>

      <Separator />

      <div className="space-y-1">
        {order.orderProducts.map((op) => (
          <div key={op.id} className="flex justify-between text-sm">
            <span>
              {op.quantity}x {op.product.name}
            </span>
          </div>
        ))}
      </div>

      <Separator />

      <div className="flex justify-between items-center text-sm font-semibold">
        <span>Total</span>
        <span>{formatEuros(parseFloat(order.totalPrice))}</span>
      </div>

      <p className="text-xs text-[#676767]">
        {dayjs(order.createdAt).fromNow()}
      </p>

      {order.scheduledFor && (
        <span className="inline-flex items-center gap-1 text-xs font-medium text-amber-700 bg-amber-50 border border-amber-200 rounded-full px-2 py-0.5">
          Prévu pour {new Date(order.scheduledFor).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })}
        </span>
      )}

      <div className="mt-1">
        <select
          className="w-full text-xs border border-black/15 rounded px-2 py-1.5 focus:outline-none focus:ring-2 focus:ring-primary"
          value={order.status}
          onChange={(e) => onStatusChange(order.id, e.target.value)}
        >
          {ORDER_STATUSES.map((s) => (
            <option key={s} value={s}>
              {getOrderStatusLabel(s)}
            </option>
          ))}
        </select>
      </div>
    </div>
  );
}
