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
          <ShoppingBag className="w-10 h-10 mx-auto mb-2 opacity-30" />
          <p className="text-lg font-bold">Votre panier est vide</p>
        </div>
      </div>
    );
  }

  return (
    <>
      {/* Header */}
      <div className="flex items-center justify-between px-2 py-1.5 border-b border-border shrink-0">
        {onClose ? (
          <button
            onClick={onClose}
            className="p-2 rounded-full hover:bg-foreground/5 transition-colors"
            aria-label="Fermer le panier"
          >
            <X className="w-5 h-5" />
          </button>
        ) : (
          <div />
        )}
        <button
          onClick={() => setConfirmClearOpen(true)}
          className="p-2 rounded-full hover:bg-foreground/5 transition-colors"
          aria-label="Vider le panier"
        >
          <Trash2 className="w-5 h-5" />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto">
        <p className="text-2xl font-bold px-4 py-3">Panier</p>
        <div className="px-4 pb-2">
          <div className="border border-border rounded-sm overflow-hidden">
            {items.map((item, idx) => (
              <div key={item.id}>
                <CartItem item={item} />
                {idx < items.length - 1 && <Separator className="mx-4"/>}
              </div>
            ))}
          </div>
        </div>
        <div className="space-y-2.5 py-3">
          <OrderDate />
          <OrderMessage />
        </div>
      </div>

      <div className="p-4 bg-card border-t border-border shadow-[0_1px_4px_rgba(0,0,0,0.2)]">
        <div className="flex justify-between items-center mb-3">
          <span className="text-sm font-bold">Total de la commande</span>
          <span className="text-sm font-bold">{formatEuros(total)}</span>
        </div>
        <Button
          className="w-full h-11"
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
          <ResponsiveModalTitle className="text-lg font-bold mb-1">
            Vider le panier
          </ResponsiveModalTitle>
          <p className="text-sm text-muted-foreground mb-6">
            Es-tu sûr de vouloir supprimer tous les articles ?
          </p>
          <div className="flex flex-col gap-3">
            <button
              onClick={() => {
                clearCart();
                setConfirmClearOpen(false);
                onClose?.();
              }}
              className="w-full h-11 rounded-md bg-destructive text-white font-semibold text-sm hover:opacity-90 transition-opacity"
            >
              Vider le panier
            </button>
            <button
              onClick={() => setConfirmClearOpen(false)}
              className="w-full h-11 rounded-md bg-black/5 font-semibold text-sm hover:bg-black/10 transition-colors"
            >
              Annuler
            </button>
          </div>
        </ResponsiveModalContent>
      </ResponsiveModal>
    </>
  );
}
