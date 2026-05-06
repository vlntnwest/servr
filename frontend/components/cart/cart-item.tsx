"use client";

import { useState } from "react";
import {
  ChevronRight,
  CircleMinus,
  CirclePlus,
  Plus,
  Trash2,
} from "lucide-react";
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
        className="flex items-start gap-3 p-3 w-full text-left hover:bg-brand-ink/[0.02] transition-colors"
        onClick={handleOpen}
      >
        {item.imageUrl && (
          <div className="flex-shrink-0">
            <Image
              src={item.imageUrl}
              alt={item.name}
              width={56}
              height={56}
              className="rounded-note object-cover aspect-square"
            />
          </div>
        )}
        <div className="flex-1 min-w-0">
          <p className="text-body font-semibold text-brand-ink line-clamp-1 leading-tight">
            <span className="text-brand-stone font-normal mr-1.5">
              {item.quantity}×
            </span>
            {item.name}
          </p>
          {optionsSummary && (
            <p className="text-caption text-brand-stone mt-1 line-clamp-1">
              {optionsSummary}
            </p>
          )}
        </div>
        <div className="flex items-center gap-1 flex-shrink-0">
          <span className="text-body font-semibold text-brand-ink tracking-tight">
            {formatEuros(linePrice)}
          </span>
          <ChevronRight className="w-4 h-4 text-brand-stone" />
        </div>
      </button>

      <ResponsiveModal open={open} onOpenChange={setOpen}>
        <ResponsiveModalContent
          hideCloseButton
          mobileClassName="rounded-t-2xl"
          desktopClassName="max-w-sm rounded-2xl"
        >
          {/* Header */}
          <div className="flex items-center justify-between px-3 py-2 border-b border-brand-border">
            <button
              onClick={handleDelete}
              className="p-2 rounded-full hover:bg-brand-ink/5 transition-colors cursor-pointer"
              aria-label="Supprimer"
            >
              <Trash2 className="w-5 h-5" />
            </button>
            <ResponsiveModalTitle className="font-display-italic italic font-black text-principle text-brand-ink truncate px-2 flex-1 text-center leading-none">
              {item.name}
            </ResponsiveModalTitle>
            <ResponsiveModalClose className="p-2 rounded-full hover:bg-brand-ink/5 transition-colors cursor-pointer">
              <Plus className="w-5 h-5 rotate-45" />
            </ResponsiveModalClose>
          </div>

          {/* Quantity controls */}
          <div className="flex items-center justify-center gap-8 py-10">
            <button
              disabled={localQty <= 1}
              className="flex items-center justify-center cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed transition-opacity"
              onClick={() => setLocalQty((q) => q - 1)}
              aria-label="Diminuer"
            >
              <CircleMinus
                className="w-9 h-9 text-brand-orange"
                strokeWidth={1.75}
              />
            </button>
            <span className="font-display text-display-sm tracking-tight w-10 text-center text-brand-ink">
              {localQty}
            </span>
            <button
              className="flex items-center justify-center cursor-pointer transition-opacity"
              onClick={() => setLocalQty((q) => q + 1)}
              aria-label="Augmenter"
            >
              <CirclePlus
                className="w-9 h-9 text-brand-orange"
                strokeWidth={1.75}
              />
            </button>
          </div>

          {/* Footer */}
          <div className="px-4 pb-6">
            <button
              onClick={handleUpdate}
              className="w-full h-12 rounded-full bg-brand-orange text-brand-cream font-semibold text-body hover:bg-brand-orange/90 transition-colors cursor-pointer tracking-cta"
            >
              Mettre à jour
            </button>
          </div>
        </ResponsiveModalContent>
      </ResponsiveModal>
    </>
  );
}
