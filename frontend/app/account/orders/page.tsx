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
    <div className="min-h-screen px-5 pt-12 pb-10 max-w-md mx-auto">
      <div className="flex items-end justify-between mb-8">
        <h1 className="font-display text-display-sm tracking-tighter leading-none text-foreground">
          Mes commandes<span className="text-primary">.</span>
        </h1>
        <Link
          href="/account"
          className="font-sans-medium text-action text-muted-foreground hover:text-foreground underline underline-offset-4"
        >
          Mon compte
        </Link>
      </div>

      {orders.length === 0 ? (
        <p className="text-muted-foreground text-center mt-12 text-body">
          Aucune commande pour l&apos;instant.
        </p>
      ) : (
        <div className="space-y-3">
          {orders.map((order) => (
            <div
              key={order.id}
              className="bg-background border border-brand-border rounded-card px-5 py-4 shadow-sm shadow-black/5"
            >
              <div className="flex items-center justify-between mb-2">
                <span className="font-display-italic text-card-label leading-none text-foreground">
                  #{order.orderNumber ?? order.id.slice(-6)}
                </span>
                <span className="font-sans font-semibold text-caption uppercase tracking-meta text-muted-foreground">
                  {STATUS_LABELS[order.status] ?? order.status}
                </span>
              </div>
              <p className="font-sans-medium text-body text-foreground">
                {order.restaurant.name}
              </p>
              <p className="text-action text-muted-foreground mt-1 line-clamp-1">
                {order.orderProducts
                  .map((op) => `${op.quantity}× ${op.product.name}`)
                  .join(", ")}
              </p>
              <div className="flex items-center justify-between mt-3">
                <span className="font-sans font-semibold text-heading text-foreground">
                  {parseFloat(order.totalPrice).toFixed(2)} €
                </span>
                <span className="text-action text-muted-foreground">
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
