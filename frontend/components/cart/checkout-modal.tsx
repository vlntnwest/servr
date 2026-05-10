"use client";

import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";
import { createCheckoutSession } from "@/lib/api";
import { useCart } from "@/contexts/cart-context";
import { useOptionalRestaurant } from "@/contexts/restaurant-context";
import { useUserContext } from "@/contexts/user-context";
import { useRouter } from "next/navigation";

interface CheckoutModalProps {
  open: boolean;
  onClose: () => void;
  initialScheduledFor?: string;
}

export default function CheckoutModal({
  open,
  onClose,
  initialScheduledFor = "",
}: CheckoutModalProps) {
  const { toCheckoutItems, clearCart, total } = useCart();
  const restaurantCtx = useOptionalRestaurant();
  const { user } = useUserContext();
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState({
    fullName: "",
    phone: "",
    email: "",
  });

  useEffect(() => {
    if (open) {
      setForm({
        fullName: user?.fullName ?? "",
        phone: user?.phone ?? "",
        email: user?.email ?? "",
      });
    }
  }, [open, user]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  };

  function translateApiError(raw: string): string {
    if (raw.includes("currently closed") || raw.includes("fermé"))
      return "Le restaurant est actuellement fermé.";
    if (raw.includes("Scheduled time"))
      return "Le créneau sélectionné est en dehors des horaires d'ouverture.";
    if (raw.includes("Unavailable products")) {
      const match = raw.match(/Unavailable products: (.+)/);
      return match
        ? `Ce produit n'est plus disponible : ${match[1]}.`
        : "Un article de votre panier n'est plus disponible.";
    }
    if (raw.includes("not found"))
      return "Un article de votre panier est introuvable. Veuillez le retirer et réessayer.";
    if (raw.includes("paiement") || raw.includes("indisponible")) return raw;
    if (raw.includes("configuré")) return raw;
    return "Une erreur est survenue. Veuillez réessayer.";
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (loading) return; // prevent double-submit

    const fullName = form.fullName.trim();
    const phone = form.phone.trim();
    const email = form.email.trim();

    if (!fullName) {
      setError("Veuillez renseigner votre nom.");
      return;
    }
    if (!phone) {
      setError(
        "Le téléphone est requis pour vous joindre en cas de souci avec votre commande.",
      );
      return;
    }
    if (!/^(?:(?:\+|00)33|0)\s*[1-9](?:[\s.-]*\d{2}){4}$/.test(phone)) {
      setError("Numéro de téléphone invalide (format français attendu).");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const items = toCheckoutItems();
      const result = await createCheckoutSession(
        {
          fullName,
          phone,
          email: email || undefined,
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

  const inputClass =
    "h-12 rounded-note border-brand-border bg-brand-cream text-body focus-visible:ring-0 focus-visible:border-brand-ink";

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-md rounded-2xl">
        <DialogHeader>
          <DialogTitle className="font-display-italic italic font-black text-[24px] leading-none text-brand-ink">
            Finaliser la commande
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="p-4 space-y-4">
          <div className="space-y-1.5">
            <Label
              htmlFor="fullName"
              className="text-caption uppercase tracking-label font-semibold text-brand-stone"
            >
              Prénom et nom
            </Label>
            <Input
              id="fullName"
              name="fullName"
              value={form.fullName}
              onChange={handleChange}
              placeholder="Jean Dupont"
              className={inputClass}
            />
          </div>
          <div className="space-y-1.5">
            <Label
              htmlFor="email"
              className="text-caption uppercase tracking-label font-semibold text-brand-stone"
            >
              Email
            </Label>
            <Input
              id="email"
              name="email"
              type="email"
              value={form.email}
              onChange={handleChange}
              placeholder="jean@example.com"
              className={inputClass}
            />
          </div>
          <div className="space-y-1.5">
            <Label
              htmlFor="phone"
              className="text-caption uppercase tracking-label font-semibold text-brand-stone"
            >
              Téléphone
            </Label>
            <Input
              id="phone"
              name="phone"
              type="tel"
              value={form.phone}
              onChange={handleChange}
              placeholder="0612345678"
              className={inputClass}
            />
          </div>

          {error && (
            <p className="text-body-sm text-destructive bg-destructive/10 rounded-note px-3 py-2">
              {error}
            </p>
          )}

          <p className="text-caption text-brand-stone leading-relaxed">
            En passant commande, vous acceptez nos conditions générales de
            vente.
          </p>

          <Button
            type="submit"
            className="w-full rounded-full h-12 bg-brand-orange hover:bg-brand-orange/90 text-body font-semibold tracking-cta text-brand-cream"
            disabled={loading}
          >
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
