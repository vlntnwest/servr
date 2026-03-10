"use client";

import { Minus, Plus, Trash2 } from "lucide-react";
import Image from "next/image";
import type { CartItem as CartItemType } from "@/types/api";
import { formatEuros, cartItemTotalPrice } from "@/lib/utils";
import { useCart } from "@/contexts/cart-context";

interface CartItemProps {
  item: CartItemType;
}

export default function CartItem({ item }: CartItemProps) {
  const { updateQuantity } = useCart();
  const linePrice = cartItemTotalPrice(item);

  const optionsSummary = item.selectedOptions
    .flatMap((g) => g.choices.map((c) => c.name))
    .join(", ");

  return (
    <div className="flex gap-3 py-3 px-4">
      {item.imageUrl && (
        <div className="flex-shrink-0">
          <Image
            src={item.imageUrl}
            alt={item.name}
            width={56}
            height={56}
            className="rounded object-cover aspect-square"
          />
        </div>
      )}
      <div className="flex-1 min-w-0">
        <p className="font-semibold text-sm leading-tight">{item.name}</p>
        {optionsSummary && (
          <p className="text-xs text-[#676767] mt-0.5 line-clamp-2">{optionsSummary}</p>
        )}
        <div className="flex items-center justify-between mt-2">
          <div className="flex items-center gap-2">
            <button
              className="w-6 h-6 rounded-sm border border-black/15 flex items-center justify-center hover:bg-black/5"
              onClick={() => updateQuantity(item.id, item.quantity - 1)}
            >
              {item.quantity === 1 ? (
                <Trash2 className="w-3.5 h-3.5 text-red-500" />
              ) : (
                <Minus className="w-3.5 h-3.5" />
              )}
            </button>
            <span className="text-sm font-semibold w-5 text-center">{item.quantity}</span>
            <button
              className="w-6 h-6 rounded-sm border border-black/15 flex items-center justify-center hover:bg-black/5"
              onClick={() => updateQuantity(item.id, item.quantity + 1)}
            >
              <Plus className="w-3.5 h-3.5" />
            </button>
          </div>
          <span className="text-sm font-semibold">{formatEuros(linePrice)}</span>
        </div>
      </div>
    </div>
  );
}
