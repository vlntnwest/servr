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
        <div className="text-center">
          <ShoppingBag
            className="w-10 h-10 mx-auto mb-3 text-brand-stone opacity-40"
            strokeWidth={1.75}
          />
          <p className="font-display-italic italic font-black text-card-name text-brand-ink">
            Votre panier est vide
          </p>
          <p className="text-body-sm text-brand-stone mt-1">
            Ajoutez un article pour commencer
          </p>
        </div>
      </div>
    );
  }

  return (
    <>
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2 border-b border-brand-border shrink-0">
        {onClose ? (
          <button
            onClick={onClose}
            className="p-2 rounded-full hover:bg-brand-ink/5 transition-colors"
            aria-label="Fermer le panier"
          >
            <X className="w-5 h-5" />
          </button>
        ) : (
          <div />
        )}
        <button
          onClick={() => setConfirmClearOpen(true)}
          className="p-2 rounded-full hover:bg-brand-ink/5 transition-colors"
          aria-label="Vider le panier"
        >
          <Trash2 className="w-5 h-5" />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto">
        <p className="font-display-italic italic font-black text-[28px] leading-none text-brand-ink px-4 pt-5 pb-4">
          Panier
        </p>
        <div className="px-4 pb-2">
          <div className="border border-brand-border bg-white rounded-card overflow-hidden">
            {items.map((item, idx) => (
              <div key={item.id}>
                <CartItem item={item} />
                {idx < items.length - 1 && (
                  <Separator className="mx-4 bg-brand-border" />
                )}
              </div>
            ))}
          </div>
        </div>
        <div className="space-y-3 py-3">
          <OrderDate />
          <OrderMessage />
        </div>
      </div>

      <div className="p-4 border-t border-brand-border bg-card">
        <div className="flex justify-between items-center mb-3">
          <span className="text-caption uppercase tracking-label font-semibold text-brand-stone">
            Total
          </span>
          <span className="t-price text-brand-ink">{formatEuros(total)}</span>
        </div>
        <Button
          className="w-full h-12 rounded-full bg-brand-orange hover:bg-brand-orange/90 text-body font-semibold tracking-cta text-brand-cream"
          onClick={() => setCheckoutOpen(true)}
          disabled={total < 1}
          variant="default"
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

      <ResponsiveModal
        open={confirmClearOpen}
        onOpenChange={setConfirmClearOpen}
      >
        <ResponsiveModalContent
          hideCloseButton
          mobileClassName="rounded-t-2xl p-6"
          desktopClassName="max-w-sm p-6 rounded-2xl"
          className="p-6"
        >
          <ResponsiveModalTitle className="font-display-italic italic font-black text-[22px] leading-none text-brand-ink mb-2">
            Vider le panier
          </ResponsiveModalTitle>
          <p className="text-body-sm text-brand-stone mb-6">
            Es-tu sûr de vouloir supprimer tous les articles ? Cette action est
            irréversible.
          </p>
          <div className="flex flex-col gap-3">
            <button
              onClick={() => {
                clearCart();
                setConfirmClearOpen(false);
                onClose?.();
              }}
              className="w-full h-12 rounded-full bg-destructive text-brand-cream font-semibold text-body hover:opacity-90 transition-opacity"
            >
              Vider le panier
            </button>
            <button
              onClick={() => setConfirmClearOpen(false)}
              className="w-full h-12 rounded-full border border-brand-border text-brand-ink font-medium text-body hover:bg-brand-ink/5 transition-colors"
            >
              Annuler
            </button>
          </div>
        </ResponsiveModalContent>
      </ResponsiveModal>
    </>
  );
}
