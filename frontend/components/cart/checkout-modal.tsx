"use client";

import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";
import { createCheckoutSession } from "@/lib/api";
import { useCart } from "@/contexts/cart-context";
import { useOptionalRestaurant } from "@/contexts/restaurant-context";
import { useRouter } from "next/navigation";

interface CheckoutModalProps {
  open: boolean;
  onClose: () => void;
  initialScheduledFor?: string;
}

export default function CheckoutModal({ open, onClose, initialScheduledFor = "" }: CheckoutModalProps) {
  const { toCheckoutItems, clearCart, total } = useCart();
  const restaurantCtx = useOptionalRestaurant();
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState({
    fullName: "",
    phone: "",
    email: "",
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  };

  function translateApiError(raw: string): string {
    if (raw.includes("currently closed") || raw.includes("fermé")) return "Le restaurant est actuellement fermé.";
    if (raw.includes("Scheduled time")) return "Le créneau sélectionné est en dehors des horaires d'ouverture.";
    if (raw.includes("Unavailable products")) {
      const match = raw.match(/Unavailable products: (.+)/);
      return match ? `Ce produit n'est plus disponible : ${match[1]}.` : "Un article de votre panier n'est plus disponible.";
    }
    if (raw.includes("not found")) return "Un article de votre panier est introuvable. Veuillez le retirer et réessayer.";
    if (raw.includes("paiement") || raw.includes("indisponible")) return raw;
    if (raw.includes("configuré")) return raw;
    return "Une erreur est survenue. Veuillez réessayer.";
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (loading) return; // prevent double-submit
    setLoading(true);
    setError(null);

    try {
      const items = toCheckoutItems();
      const result = await createCheckoutSession(
        {
          fullName: form.fullName || undefined,
          phone: form.phone || undefined,
          email: form.email || undefined,
          items,
          scheduledFor: initialScheduledFor || undefined,
        },
        restaurantCtx?.restaurant.id,
      );

      if ("error" in result) {
        setError(translateApiError(result.error));
        return;
      }

      const data = result.data;

      if ("url" in data) {
        clearCart();
        window.location.href = data.url;
      } else if (data.paymentMethod === "on_site") {
        clearCart();
        const basePath = restaurantCtx ? `/store/${restaurantCtx.slug}` : "";
        router.push(`${basePath}/order/confirmation/${data.order.id}`);
        onClose();
      }
    } catch (err) {
      setError("Une erreur est survenue. Veuillez réessayer.");
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Finaliser la commande</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="p-4 space-y-4">
          <div className="space-y-1">
            <Label htmlFor="fullName">Prénom et nom</Label>
            <Input
              id="fullName"
              name="fullName"
              value={form.fullName}
              onChange={handleChange}
              placeholder="Jean Dupont"
            />
          </div>
          <div className="space-y-1">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              name="email"
              type="email"
              value={form.email}
              onChange={handleChange}
              placeholder="jean@example.com"
            />
          </div>
          <div className="space-y-1">
            <Label htmlFor="phone">Téléphone</Label>
            <Input
              id="phone"
              name="phone"
              type="tel"
              value={form.phone}
              onChange={handleChange}
              placeholder="0612345678"
            />
          </div>

          {error && (
            <p className="text-sm text-red-500 bg-red-50 rounded p-2">{error}</p>
          )}

          <p className="text-xs text-[#676767]">
            En passant commande, vous acceptez nos conditions générales de vente.
          </p>

          <Button type="submit" className="w-full h-11" disabled={loading}>
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin mr-2" />
                Traitement…
              </>
            ) : (
              `Payer ${total.toLocaleString("fr-FR", { style: "currency", currency: "EUR" })}`
            )}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
