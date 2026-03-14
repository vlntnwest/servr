"use client";

import { useState, useEffect, useMemo } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";
import { createCheckoutSession, getOpeningHours } from "@/lib/api";
import { useCart } from "@/contexts/cart-context";
import { useOptionalRestaurant } from "@/contexts/restaurant-context";
import { useRouter } from "next/navigation";
import type { OpeningHour } from "@/types/api";

interface CheckoutModalProps {
  open: boolean;
  onClose: () => void;
}

/**
 * Generate 15-minute time slots for today between `openTime` and `closeTime`,
 * starting no earlier than `minFrom` (Date, default = now + 30 min).
 * Returns ISO strings.
 */
function generateTimeSlots(
  openTime: string,
  closeTime: string,
  minFrom: Date = new Date(Date.now() + 30 * 60 * 1000),
): string[] {
  const slots: string[] = [];
  const today = new Date();
  today.setSeconds(0, 0);

  const [openH, openM] = openTime.split(":").map(Number);
  const [closeH, closeM] = closeTime.split(":").map(Number);

  const start = new Date(today);
  start.setHours(openH, openM, 0, 0);

  const end = new Date(today);
  end.setHours(closeH, closeM, 0, 0);

  // Advance start to the next 15-minute boundary after minFrom
  const cursor = new Date(Math.max(start.getTime(), minFrom.getTime()));
  const rem = cursor.getMinutes() % 15;
  if (rem !== 0) cursor.setMinutes(cursor.getMinutes() + (15 - rem), 0, 0);

  while (cursor < end) {
    slots.push(cursor.toISOString());
    cursor.setMinutes(cursor.getMinutes() + 15);
  }
  return slots;
}

function formatSlotLabel(iso: string): string {
  const d = new Date(iso);
  return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
}

export default function CheckoutModal({ open, onClose }: CheckoutModalProps) {
  const { toCheckoutItems, clearCart, total } = useCart();
  const restaurantCtx = useOptionalRestaurant();
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState({
    fullName: "",
    phone: "",
    email: "",
    promoCode: "",
    orderType: "asap" as "asap" | "scheduled",
    scheduledFor: "",
  });
  const [openingHours, setOpeningHours] = useState<OpeningHour[]>([]);

  useEffect(() => {
    if (open) {
      getOpeningHours().then(setOpeningHours).catch(() => {});
    }
  }, [open]);

  const todaySlots = useMemo(() => {
    const dayOfWeek = new Date().getDay();
    const todayHours = openingHours.find((h) => h.dayOfWeek === dayOfWeek);
    if (!todayHours) return [];
    return generateTimeSlots(todayHours.openTime, todayHours.closeTime);
  }, [openingHours]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
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
          scheduledFor: form.orderType === "scheduled" && form.scheduledFor
            ? form.scheduledFor
            : undefined,
        },
        restaurantCtx?.restaurant.id,
      );

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
          {/* Order type toggle */}
          <div className="space-y-2">
            <Label>Heure de commande</Label>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setForm((prev) => ({ ...prev, orderType: "asap", scheduledFor: "" }))}
                className={`flex-1 py-2 px-3 rounded-md border text-sm font-medium transition-colors ${
                  form.orderType === "asap"
                    ? "bg-primary text-primary-foreground border-primary"
                    : "border-black/15 hover:bg-gray-50"
                }`}
              >
                Au plus vite
              </button>
              <button
                type="button"
                onClick={() =>
                  setForm((prev) => ({
                    ...prev,
                    orderType: "scheduled",
                    scheduledFor: todaySlots[0] ?? "",
                  }))
                }
                disabled={todaySlots.length === 0}
                className={`flex-1 py-2 px-3 rounded-md border text-sm font-medium transition-colors disabled:opacity-40 disabled:cursor-not-allowed ${
                  form.orderType === "scheduled"
                    ? "bg-primary text-primary-foreground border-primary"
                    : "border-black/15 hover:bg-gray-50"
                }`}
              >
                Prévu pour…
              </button>
            </div>
            {form.orderType === "scheduled" && todaySlots.length > 0 && (
              <select
                value={form.scheduledFor}
                onChange={(e) => setForm((prev) => ({ ...prev, scheduledFor: e.target.value }))}
                className="w-full text-sm border border-black/15 rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary"
              >
                {todaySlots.map((iso) => (
                  <option key={iso} value={iso}>
                    {formatSlotLabel(iso)}
                  </option>
                ))}
              </select>
            )}
          </div>

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
