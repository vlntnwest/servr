"use client";

import { ShoppingBag } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useCart } from "@/contexts/cart-context";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { useState } from "react";
import Cart from "@/components/cart/cart";
import AuthButton from "@/components/auth/auth-button";

interface HeaderProps {
  showCart?: boolean;
  showAuth?: boolean;
}

export default function Header({ showCart = true, showAuth = true }: HeaderProps) {
  const { itemCount } = useCart();
  const [cartOpen, setCartOpen] = useState(false);

  return (
    <header className="sticky top-0 z-40 bg-white border-b border-black/8">
      <div className="flex items-center h-[65px] px-4 max-w-screen-xl mx-auto">
        <div className="flex-1">
          <Link href="/">
            <Image
              src="https://g10afdaataaj4tkl.public.blob.vercel-storage.com/img/1Fichier-21.svg"
              alt="Pokey Bar"
              width={100}
              height={40}
              className="object-contain"
              priority
            />
          </Link>
        </div>

        <div className="flex items-center gap-2">
          {showAuth && <AuthButton />}
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
        <SheetContent side="bottom" className="h-[90dvh] flex flex-col p-0">
          <SheetHeader className="px-4 py-3">
            <SheetTitle>Votre panier</SheetTitle>
          </SheetHeader>
          <div className="flex-1 overflow-hidden flex flex-col">
            <Cart onClose={() => setCartOpen(false)} />
          </div>
        </SheetContent>
      </Sheet>
    </header>
  );
}
