"use client";

import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Loader2, Check, X } from "lucide-react";
import { createCheckoutSession, validatePromoCode } from "@/lib/api";
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
  const [promoInput, setPromoInput] = useState("");
  const [promoLoading, setPromoLoading] = useState(false);
  const [promoError, setPromoError] = useState<string | null>(null);
  const [appliedPromo, setAppliedPromo] = useState<{
    code: string;
    discountAmount: number;
    finalTotal: number;
  } | null>(null);
  const [form, setForm] = useState({
    fullName: "",
    phone: "",
    email: "",
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleApplyPromo = async () => {
    if (!promoInput.trim()) return;
    setPromoLoading(true);
    setPromoError(null);
    const result = await validatePromoCode(promoInput.trim(), total);
    setPromoLoading(false);
    if ("error" in result && result.error) {
      setPromoError(result.error);
    } else if (result.data) {
      setAppliedPromo(result.data);
    }
  };

  const handleRemovePromo = () => {
    setAppliedPromo(null);
    setPromoInput("");
    setPromoError(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
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
          promoCode: appliedPromo?.code || undefined,
        },
        restaurantCtx?.restaurant.id,
      );

      if ("error" in result) {
        setError(result.error);
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

          {/* Promo code */}
          <div className="space-y-1">
            <Label htmlFor="promoCode">Code promo</Label>
            {appliedPromo ? (
              <div className="flex items-center justify-between bg-green-50 border border-green-200 rounded-md px-3 py-2">
                <div className="flex items-center gap-2">
                  <Check className="w-4 h-4 text-green-600" />
                  <span className="text-sm font-medium text-green-800">
                    {appliedPromo.code}
                  </span>
                  <span className="text-sm text-green-600">
                    −{appliedPromo.discountAmount.toLocaleString("fr-FR", { style: "currency", currency: "EUR" })}
                  </span>
                </div>
                <button type="button" onClick={handleRemovePromo} className="text-green-600 hover:text-green-800">
                  <X className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <div className="flex gap-2">
                <Input
                  id="promoCode"
                  value={promoInput}
                  onChange={(e) => { setPromoInput(e.target.value); setPromoError(null); }}
                  placeholder="CODE"
                  className="uppercase"
                />
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="shrink-0"
                  onClick={handleApplyPromo}
                  disabled={promoLoading || !promoInput.trim()}
                >
                  {promoLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Appliquer"}
                </Button>
              </div>
            )}
            {promoError && (
              <p className="text-xs text-red-500">{promoError}</p>
            )}
          </div>

          {error && (
            <p className="text-sm text-red-500 bg-red-50 rounded p-2">{error}</p>
          )}

          <p className="text-xs text-[#676767]">
            En passant commande, vous acceptez nos conditions générales de vente.
          </p>

          {appliedPromo && (
            <div className="flex justify-between text-sm">
              <span className="text-[#676767]">Total après réduction</span>
              <span className="font-semibold">
                {appliedPromo.finalTotal.toLocaleString("fr-FR", { style: "currency", currency: "EUR" })}
              </span>
            </div>
          )}

          <Button type="submit" className="w-full h-11" disabled={loading}>
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin mr-2" />
                Traitement…
              </>
            ) : (
              `Payer ${(appliedPromo?.finalTotal ?? total).toLocaleString("fr-FR", { style: "currency", currency: "EUR" })}`
            )}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
