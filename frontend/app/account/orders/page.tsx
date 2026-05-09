"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Loader2 } from "lucide-react";

const API_URL = process.env.NEXT_PUBLIC_API_URL;

type Order = {
  id: string;
  orderNumber: string | null;
  status: string;
  totalPrice: string;
  createdAt: string;
  restaurant: { name: string; slug: string | null };
  orderProducts: { product: { name: string }; quantity: number }[];
};

const STATUS_LABELS: Record<string, string> = {
  PENDING: "En attente",
  IN_PROGRESS: "En cours",
  COMPLETED: "Terminée",
  DELIVERED: "Livrée",
  CANCELLED: "Annulée",
  PENDING_ON_SITE_PAYMENT: "Paiement sur place",
};

export default function OrderHistoryPage() {
  const router = useRouter();
  const supabase = createClient();

  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const init = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        router.push("/login?redirect=/account/orders");
        return;
      }

      const res = await fetch(`${API_URL}/api/user/me/orders`, {
        headers: { Authorization: `Bearer ${session.access_token}` },
      });
      if (res.ok) {
        const { data } = await res.json();
        setOrders(data.orders);
      }
      setLoading(false);
    };
    init();
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-6 h-6 animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen p-4 max-w-md mx-auto">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Mes commandes</h1>
        <Link href="/account" className="text-sm underline text-muted-foreground">
          Mon compte
        </Link>
      </div>

      {orders.length === 0 ? (
        <p className="text-muted-foreground text-center mt-12">Aucune commande pour l&apos;instant.</p>
      ) : (
        <div className="space-y-3">
          {orders.map((order) => (
            <div
              key={order.id}
              className="border border-border rounded-lg p-4"
            >
              <div className="flex items-center justify-between mb-1">
                <span className="font-mono text-sm font-medium">
                  #{order.orderNumber ?? order.id.slice(-8)}
                </span>
                <span className="text-xs text-muted-foreground">
                  {STATUS_LABELS[order.status] ?? order.status}
                </span>
              </div>
              <p className="text-sm font-medium">{order.restaurant.name}</p>
              <p className="text-xs text-muted-foreground mt-1">
                {order.orderProducts
                  .map((op) => `${op.quantity}× ${op.product.name}`)
                  .join(", ")}
              </p>
              <div className="flex items-center justify-between mt-2">
                <span className="text-sm font-semibold">
                  {parseFloat(order.totalPrice).toFixed(2)} €
                </span>
                <span className="text-xs text-muted-foreground">
                  {new Date(order.createdAt).toLocaleDateString("fr-FR")}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
