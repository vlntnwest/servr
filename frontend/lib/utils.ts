import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import type { CartItem } from "@/types/api";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatEuros(amount: number): string {
  return amount.toLocaleString("fr-FR", {
    style: "currency",
    currency: "EUR",
    minimumFractionDigits: 2,
  });
}

export function cartItemTotalPrice(item: CartItem): number {
  const optionsTotal = item.selectedOptions.reduce(
    (sum, group) =>
      sum + group.choices.reduce((s, c) => s + c.priceModifier, 0),
    0
  );
  return (item.basePrice + optionsTotal) * item.quantity;
}

export function cartTotal(items: CartItem[]): number {
  return items.reduce((sum, item) => sum + cartItemTotalPrice(item), 0);
}

export function getOrderStatusLabel(status: string): string {
  const labels: Record<string, string> = {
    PENDING: "En attente",
    PENDING_ON_SITE_PAYMENT: "Paiement sur place",
    IN_PROGRESS: "En cours",
    COMPLETED: "Prêt",
    DELIVERED: "Livré",
    CANCELLED: "Annulé",
  };
  return labels[status] ?? status;
}

export function getOrderStatusColor(status: string): string {
  const colors: Record<string, string> = {
    PENDING: "bg-yellow-100 text-yellow-800",
    PENDING_ON_SITE_PAYMENT: "bg-orange-100 text-orange-800",
    IN_PROGRESS: "bg-blue-100 text-blue-800",
    COMPLETED: "bg-green-100 text-green-800",
    DELIVERED: "bg-green-200 text-green-900",
    CANCELLED: "bg-red-100 text-red-800",
  };
  return colors[status] ?? "bg-gray-100 text-gray-800";
}
