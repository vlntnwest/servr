"use client";

import { useState } from "react";
import { useCart } from "@/contexts/cart-context";
import CartItem from "./cart-item";
import { Separator } from "@/components/ui/separator";
import { Button } from "@/components/ui/button";
import { formatEuros } from "@/lib/utils";
import { ShoppingBag } from "lucide-react";
import CheckoutModal from "./checkout-modal";

interface CartProps {
  onClose?: () => void;
}

export default function Cart({ onClose }: CartProps) {
  const { items, total } = useCart();
  const [checkoutOpen, setCheckoutOpen] = useState(false);

  if (items.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="text-center text-[#676767]">
          <ShoppingBag className="w-10 h-10 mx-auto mb-2 opacity-30" />
          <p className="text-lg font-bold">Votre panier est vide</p>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="flex-1 overflow-y-auto">
        {items.map((item, idx) => (
          <div key={item.id}>
            <CartItem item={item} />
            {idx < items.length - 1 && <Separator />}
          </div>
        ))}
      </div>

      <div className=" p-4 bg-white shadow-[0_1px_4px_rgba(0,0,0,0.2)]">
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
        onClose={() => {
          setCheckoutOpen(false);
          onClose?.();
        }}
      />
    </>
  );
}
