import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

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

export function getOrderItemCount(
  orderProducts: { quantity: number }[],
): number {
  return orderProducts.reduce((sum, p) => sum + p.quantity, 0);
}

export function getOrderTime(
  scheduledFor: string | null,
  createdAt: string,
): string {
  return new Date(scheduledFor ?? createdAt).toLocaleTimeString("fr-FR", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

export type StatusAction = {
  targetStatus: string;
  label: string;
  variant: "default" | "destructive";
};

export function getStatusActions(status: string): StatusAction[] {
  const actions: Record<string, StatusAction[]> = {
    PENDING: [
      { targetStatus: "IN_PROGRESS", label: "Accepter", variant: "default" },
      { targetStatus: "CANCELLED", label: "Annuler", variant: "destructive" },
    ],
    PENDING_ON_SITE_PAYMENT: [
      { targetStatus: "IN_PROGRESS", label: "Accepter", variant: "default" },
      { targetStatus: "CANCELLED", label: "Annuler", variant: "destructive" },
    ],
    IN_PROGRESS: [
      { targetStatus: "COMPLETED", label: "Prêt", variant: "default" },
      { targetStatus: "CANCELLED", label: "Annuler", variant: "destructive" },
    ],
    COMPLETED: [
      { targetStatus: "DELIVERED", label: "Livré", variant: "default" },
      { targetStatus: "CANCELLED", label: "Annuler", variant: "destructive" },
    ],
  };
  return actions[status] ?? [];
}

export function getOrderStatusBadge(status: string): {
  bg: string;
  text: string;
} {
  const badges: Record<string, { bg: string; text: string }> = {
    PENDING: { bg: "bg-brand-yellow", text: "text-brand-forest" },
    PENDING_ON_SITE_PAYMENT: {
      bg: "bg-brand-yellow",
      text: "text-brand-forest",
    },
    IN_PROGRESS: { bg: "bg-brand-orange", text: "text-brand-cream" },
    COMPLETED: { bg: "bg-brand-lime", text: "text-brand-forest" },
    DELIVERED: { bg: "bg-brand-lime", text: "text-brand-forest" },
    CANCELLED: { bg: "bg-brand-maroon", text: "text-brand-pink" },
  };
  return badges[status] ?? { bg: "bg-muted", text: "text-muted-foreground" };
}
