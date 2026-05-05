"use client";

import { ShoppingBag } from "lucide-react";
import { useCart } from "@/contexts/cart-context";
import { Sheet, SheetContent, SheetTitle } from "@/components/ui/sheet";
import { useState } from "react";
import Cart from "@/components/cart/cart";
import CustomerSheet from "@/components/store/customer-sheet";

interface HeaderProps {
  showCart?: boolean;
  showAuth?: boolean;
}

export default function Header({
  showCart = true,
  showAuth = true,
}: HeaderProps) {
  const { itemCount } = useCart();
  const [cartOpen, setCartOpen] = useState(false);

  return (
    <header className="sticky top-0 z-40 bg-background border-b border-border">
      <div className="flex items-center justify-end h-[65px] px-4 md:px-8 xl:px-16 max-w-screen-3xl mx-auto">
        <div className="flex items-center gap-2">
          {showAuth && <CustomerSheet />}
          {showCart && itemCount > 0 && (
            <button
              className="relative p-2 rounded-full hover:bg-black/5 transition-colors md:hidden"
              onClick={() => setCartOpen(true)}
              aria-label="Ouvrir le panier"
            >
              <ShoppingBag className="w-5 h-5" />
              <span className="absolute -top-0.5 -right-0.5 bg-primary text-white text-xs rounded-full h-5 w-5 flex items-center justify-center font-semibold">
                {itemCount}
              </span>
            </button>
          )}
        </div>
      </div>

      {/* Mobile cart drawer */}
      <Sheet open={cartOpen} onOpenChange={setCartOpen}>
        <SheetContent
          side="bottom"
          className="border-none h-dvh flex flex-col p-0"
          hideCloseButton
        >
          <SheetTitle className="sr-only">Panier</SheetTitle>
          <div className="flex-1 overflow-hidden flex flex-col">
            <Cart onClose={() => setCartOpen(false)} />
          </div>
        </SheetContent>
      </Sheet>
    </header>
  );
}
