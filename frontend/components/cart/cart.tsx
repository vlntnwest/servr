"use client";

import { useState } from "react";
import { useCart } from "@/contexts/cart-context";
import CartItem from "./cart-item";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { formatEuros } from "@/lib/utils";
import { ShoppingBag, Trash2, X } from "lucide-react";
import CheckoutModal from "./checkout-modal";
import OrderMessage from "./order-message";
import OrderDate from "./order-date";
import {
  ResponsiveModal,
  ResponsiveModalContent,
  ResponsiveModalTitle,
} from "@/components/ui/responsive-modal";

interface CartProps {
  onClose?: () => void;
}

export default function Cart({ onClose }: CartProps) {
  const { items, total, scheduledFor, clearCart } = useCart();
  const [checkoutOpen, setCheckoutOpen] = useState(false);
  const [confirmClearOpen, setConfirmClearOpen] = useState(false);

  if (items.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="text-center text-muted-foreground">
          <ShoppingBag className="w-10 h-10 mx-auto mb-3 opacity-40" />
          <p className="font-display text-card-name leading-none tracking-tight text-foreground">
            Votre panier est vide
          </p>
        </div>
      </div>
    );
  }

  return (
    <>
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2 border-b border-border shrink-0">
        {onClose ? (
          <button
            onClick={onClose}
            className="p-2 rounded-full hover:bg-secondary transition-colors"
            aria-label="Fermer le panier"
          >
            <X className="w-5 h-5" />
          </button>
        ) : (
          <div />
        )}
        <button
          onClick={() => setConfirmClearOpen(true)}
          className="p-2 rounded-full hover:bg-secondary transition-colors"
          aria-label="Vider le panier"
        >
          <Trash2 className="w-5 h-5" />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto">
        <p className="font-display text-display-sm tracking-tighter leading-none px-5 pt-5 pb-4 text-foreground">
          Panier
        </p>
        <div className="px-4 pb-2">
          <div className="border border-brand-border rounded-card overflow-hidden bg-background">
            {items.map((item, idx) => (
              <div key={item.id}>
                <CartItem item={item} />
                {idx < items.length - 1 && <Separator className="mx-4" />}
              </div>
            ))}
          </div>
        </div>
        <div className="space-y-3 py-4">
          <OrderDate />
          <OrderMessage />
        </div>
      </div>

      <div className="p-4 bg-background border-t border-border">
        <div className="flex justify-between items-center mb-3">
          <span className="font-sans font-semibold text-body text-foreground">
            Total de la commande
          </span>
          <span className="font-sans font-semibold text-heading text-foreground">
            {formatEuros(total)}
          </span>
        </div>
        <Button
          className="w-full"
          onClick={() => setCheckoutOpen(true)}
          disabled={total < 1}
        >
          Finaliser la commande
        </Button>
      </div>

      <CheckoutModal
        open={checkoutOpen}
        initialScheduledFor={scheduledFor}
        onClose={() => {
          setCheckoutOpen(false);
          onClose?.();
        }}
      />

      <ResponsiveModal open={confirmClearOpen} onOpenChange={setConfirmClearOpen}>
        <ResponsiveModalContent
          hideCloseButton
          mobileClassName="rounded-t-2xl p-6"
          desktopClassName="max-w-sm p-6"
          className="p-6"
        >
          <ResponsiveModalTitle className="font-display text-card-name leading-none tracking-tight mb-2 text-foreground">
            Vider le panier
          </ResponsiveModalTitle>
          <p className="text-body-sm text-muted-foreground mb-6">
            Es-tu sûr de vouloir supprimer tous les articles ?
          </p>
          <div className="flex flex-col gap-3">
            <Button
              variant="destructive"
              className="w-full"
              onClick={() => {
                clearCart();
                setConfirmClearOpen(false);
                onClose?.();
              }}
            >
              Vider le panier
            </Button>
            <Button
              variant="secondary"
              className="w-full"
              onClick={() => setConfirmClearOpen(false)}
            >
              Annuler
            </Button>
          </div>
        </ResponsiveModalContent>
      </ResponsiveModal>
    </>
  );
}
