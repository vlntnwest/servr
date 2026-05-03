"use client";

import { useState } from "react";
import { ChevronRight, CircleMinus, CirclePlus, Plus, Trash2 } from "lucide-react";
import Image from "next/image";
import type { CartItem as CartItemType } from "@/types/api";
import { formatEuros, cartItemTotalPrice } from "@/lib/utils";
import { useCart } from "@/contexts/cart-context";
import {
  ResponsiveModal,
  ResponsiveModalContent,
  ResponsiveModalClose,
  ResponsiveModalTitle,
} from "@/components/ui/responsive-modal";

interface CartItemProps {
  item: CartItemType;
}

export default function CartItem({ item }: CartItemProps) {
  const { updateQuantity, removeItem } = useCart();
  const [open, setOpen] = useState(false);
  const [localQty, setLocalQty] = useState(item.quantity);

  const linePrice = cartItemTotalPrice(item);

  const optionsSummary = item.selectedOptions
    .flatMap((g) => g.choices.map((c) => c.name))
    .join(", ");

  function handleOpen() {
    setLocalQty(item.quantity);
    setOpen(true);
  }

  function handleUpdate() {
    if (localQty <= 0) {
      removeItem(item.id);
    } else {
      updateQuantity(item.id, localQty);
    }
    setOpen(false);
  }

  function handleDelete() {
    removeItem(item.id);
    setOpen(false);
  }

  return (
    <>
      <button
        className="flex items-start gap-3 p-3 w-full text-left hover:bg-card transition-colors"
        onClick={handleOpen}
      >
        {item.imageUrl && (
          <div className="flex-shrink-0">
            <Image
              src={item.imageUrl}
              alt={item.name}
              width={56}
              height={56}
              className="rounded-swatch object-cover aspect-square"
            />
          </div>
        )}
        <div className="flex-1 min-w-0">
          <p className="font-sans font-semibold text-body-sm line-clamp-1 text-foreground">
            <span className="text-muted-foreground font-normal mr-1">
              {item.quantity}×
            </span>
            {item.name}
          </p>
          {optionsSummary && (
            <p className="text-action text-muted-foreground mt-0.5 line-clamp-1">
              {optionsSummary}
            </p>
          )}
        </div>
        <div className="flex items-center gap-1 flex-shrink-0">
          <span className="text-body-sm font-sans font-semibold text-foreground">
            {formatEuros(linePrice)}
          </span>
          <ChevronRight className="w-4 h-4 text-muted-foreground" />
        </div>
      </button>

      <ResponsiveModal open={open} onOpenChange={setOpen}>
        <ResponsiveModalContent
          hideCloseButton
          mobileClassName="rounded-t-2xl"
          desktopClassName="max-w-sm"
        >
          {/* Header */}
          <div className="flex items-center justify-between px-3 py-2 border-b border-border">
            <button
              onClick={handleDelete}
              className="p-2 rounded-full hover:bg-secondary transition-colors cursor-pointer"
              aria-label="Supprimer"
            >
              <Trash2 className="w-5 h-5" />
            </button>
            <ResponsiveModalTitle className="font-display text-card-name leading-none tracking-tight truncate px-2 flex-1 text-center">
              {item.name}
            </ResponsiveModalTitle>
            <ResponsiveModalClose className="p-2 rounded-full hover:bg-secondary transition-colors cursor-pointer">
              <Plus className="w-5 h-5 rotate-45" />
            </ResponsiveModalClose>
          </div>

          {/* Quantity controls */}
          <div className="flex items-center justify-center gap-8 py-10">
            <button
              disabled={localQty <= 1}
              className="flex items-center justify-center cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed"
              onClick={() => setLocalQty((q) => q - 1)}
            >
              <CircleMinus className="w-9 h-9 text-primary" strokeWidth={2} />
            </button>
            <span className="font-display text-display-sm tracking-tighter w-10 text-center text-foreground">
              {localQty}
            </span>
            <button
              className="flex items-center justify-center disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer"
              onClick={() => setLocalQty((q) => q + 1)}
            >
              <CirclePlus className="w-9 h-9 text-primary" strokeWidth={2} />
            </button>
          </div>

          {/* Footer */}
          <div className="px-4 pb-6">
            <button
              onClick={handleUpdate}
              className="w-full h-12 rounded-pill bg-primary text-primary-foreground font-sans font-medium text-body tracking-cta hover:bg-primary/90 transition-colors cursor-pointer shadow-sm shadow-black/5"
            >
              Mettre à jour
            </button>
          </div>
        </ResponsiveModalContent>
      </ResponsiveModal>
    </>
  );
}
