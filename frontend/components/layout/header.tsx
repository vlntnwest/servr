"use client";

import { ShoppingBag, X, Trash2 } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useCart } from "@/contexts/cart-context";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { useState } from "react";
import Cart from "@/components/cart/cart";
import AuthButton from "@/components/auth/auth-button";

interface HeaderProps {
  showCart?: boolean;
  showAuth?: boolean;
}

export default function Header({
  showCart = true,
  showAuth = true,
}: HeaderProps) {
  const { itemCount, clearCart } = useCart();
  const [cartOpen, setCartOpen] = useState(false);
  const [confirmClearOpen, setConfirmClearOpen] = useState(false);

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
        <SheetContent
          side="bottom"
          className="border-none h-dvh flex flex-col p-0"
          hideCloseButton
        >
          <SheetHeader className="flex flex-row items-center justify-between px-4 py-3 shadow-xs border-none">
            <SheetTitle className="sr-only">Panier</SheetTitle>
            <button
              onClick={() => setCartOpen(false)}
              className="p-2 rounded-full hover:bg-black/5 transition-colors m-0"
              aria-label="Fermer le panier"
            >
              <X className="w-5 h-5" />
            </button>
            <button
              onClick={() => setConfirmClearOpen(true)}
              className="p-2 rounded-full hover:bg-black/5 transition-colors"
              aria-label="Vider le panier"
            >
              <Trash2 className="w-5 h-5" />
            </button>
          </SheetHeader>
          <div className="flex-1 overflow-hidden flex flex-col">
            <p className="text-2xl font-bold px-4 py-3">Panier</p>
            <Cart onClose={() => setCartOpen(false)} />
          </div>
        </SheetContent>
      </Sheet>

      {/* Confirmation suppression panier */}
      <Sheet open={confirmClearOpen} onOpenChange={setConfirmClearOpen}>
        <SheetContent side="bottom" className="p-6" hideCloseButton>
          <SheetTitle className="text-lg font-bold mb-1">
            Vider le panier
          </SheetTitle>
          <p className="text-sm text-muted-foreground mb-6">
            Es-tu sûr de vouloir supprimer tous les articles ?
          </p>
          <div className="flex flex-col gap-3">
            <button
              onClick={() => {
                clearCart();
                setConfirmClearOpen(false);
                setCartOpen(false);
              }}
              className="w-full h-11 rounded-md bg-red-600 text-white font-semibold text-sm hover:opacity-90 transition-opacity"
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
        </SheetContent>
      </Sheet>
    </header>
  );
}
