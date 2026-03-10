"use client";

import {
  createContext,
  useContext,
  useState,
  useEffect,
  type ReactNode,
} from "react";
import type { CartItem, CheckoutItem } from "@/types/api";
import { cartTotal, cartItemTotalPrice } from "@/lib/utils";

type CartContextType = {
  items: CartItem[];
  addItem: (item: CartItem) => void;
  removeItem: (id: string) => void;
  updateQuantity: (id: string, quantity: number) => void;
  clearCart: () => void;
  total: number;
  itemCount: number;
  toCheckoutItems: () => CheckoutItem[];
};

const CartContext = createContext<CartContextType | null>(null);

export function CartProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<CartItem[]>(() => {
    if (typeof window === "undefined") return [];
    try {
      const stored = sessionStorage.getItem("cart-v2");
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  });

  useEffect(() => {
    sessionStorage.setItem("cart-v2", JSON.stringify(items));
  }, [items]);

  const addItem = (item: CartItem) => setItems((prev) => [...prev, item]);

  const removeItem = (id: string) =>
    setItems((prev) => prev.filter((i) => i.id !== id));

  const updateQuantity = (id: string, quantity: number) => {
    if (quantity <= 0) {
      removeItem(id);
    } else {
      setItems((prev) =>
        prev.map((i) => (i.id === id ? { ...i, quantity } : i))
      );
    }
  };

  const clearCart = () => setItems([]);

  const total = cartTotal(items);
  const itemCount = items.reduce((sum, i) => sum + i.quantity, 0);

  const toCheckoutItems = (): CheckoutItem[] =>
    items.map((item) => ({
      productId: item.productId,
      quantity: item.quantity,
      optionChoiceIds: item.selectedOptions.flatMap((g) =>
        g.choices.map((c) => c.id)
      ),
    }));

  return (
    <CartContext.Provider
      value={{
        items,
        addItem,
        removeItem,
        updateQuantity,
        clearCart,
        total,
        itemCount,
        toCheckoutItems,
      }}
    >
      {children}
    </CartContext.Provider>
  );
}

export function useCart() {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error("useCart must be used within CartProvider");
  return ctx;
}

export { cartItemTotalPrice };
