"use client";

import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";
import { createCheckoutSession } from "@/lib/api";
import { useCart } from "@/contexts/cart-context";
import { useRouter } from "next/navigation";

interface CheckoutModalProps {
  open: boolean;
  onClose: () => void;
}

export default function CheckoutModal({ open, onClose }: CheckoutModalProps) {
  const { toCheckoutItems, clearCart, total } = useCart();
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState({
    fullName: "",
    phone: "",
    email: "",
    promoCode: "",
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const items = toCheckoutItems();
      const result = await createCheckoutSession({
        fullName: form.fullName || undefined,
        phone: form.phone || undefined,
        email: form.email || undefined,
        items,
      });

      if ("error" in result) {
        setError(result.error);
        return;
      }

      const data = result.data;

      if ("url" in data) {
        // Stripe checkout redirect
        clearCart();
        window.location.href = data.url;
      } else if (data.paymentMethod === "on_site") {
        // On-site payment
        clearCart();
        router.push(`/order/confirmation/${data.order.id}`);
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
