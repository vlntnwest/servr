"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { getOrders, updateOrderStatus, refundOrder, getRestaurant, updatePreparationLevel } from "@/lib/api";
import type { PreparationLevel } from "@/types/api";
import { getSocket } from "@/lib/socket";
import type { Order, OrderProductOption } from "@/types/api";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  formatEuros,
  cn,
  getOrderStatusLabel,
  getOrderStatusColor,
  getStatusActions,
} from "@/lib/utils";
import dayjs from "dayjs";
import relativeTime from "dayjs/plugin/relativeTime";
import "dayjs/locale/fr";
import { Eye } from "lucide-react";


dayjs.extend(relativeTime);
dayjs.locale("fr");

const ORDER_STATUSES = [
  "PENDING",
  "PENDING_ON_SITE_PAYMENT",
  "IN_PROGRESS",
  "COMPLETED",
  "DELIVERED",
  "CANCELLED",
] as const;

const ACTIVE_STATUSES = "PENDING,PENDING_ON_SITE_PAYMENT,IN_PROGRESS,COMPLETED";
const FINISHED_STATUSES = "DELIVERED,CANCELLED";

type SubView = "En cours" | "Terminées";

export default function OrdersTab({ restaurantId }: { restaurantId?: string }) {
  const [activeOrders, setActiveOrders] = useState<Order[]>([]);
  const [finishedOrders, setFinishedOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [activePage, setActivePage] = useState(1);
  const [finishedPage, setFinishedPage] = useState(1);
  const [activeTotalPages, setActiveTotalPages] = useState(1);
  const [finishedTotalPages, setFinishedTotalPages] = useState(1);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [subView, setSubView] = useState<SubView>("En cours");
  const [refundConfirmOpen, setRefundConfirmOpen] = useState(false);
  const [refunding, setRefunding] = useState(false);
  const [statusChanging, setStatusChanging] = useState<string | null>(null); // orderId being changed
  const [prepLevel, setPrepLevel] = useState<PreparationLevel>("EASY");
  const [socketConnected, setSocketConnected] = useState(true);
  const fetchRef = useRef<(() => Promise<void>) | undefined>(undefined);

  const fetchActive = useCallback(async () => {
    const result = await getOrders(activePage, 20, ACTIVE_STATUSES);
    setActiveOrders(result.data);
    setActiveTotalPages(result?.pagination?.totalPages || 1);
  }, [activePage]);

  const fetchFinished = useCallback(async () => {
    const result = await getOrders(finishedPage, 20, FINISHED_STATUSES);
    setFinishedOrders(result.data);
    setFinishedTotalPages(result?.pagination?.totalPages || 1);
  }, [finishedPage]);

  const fetchAll = useCallback(async () => {
    setLoading(true);
    try {
      await Promise.all([fetchActive(), fetchFinished()]);
    } finally {
      setLoading(false);
    }
  }, [fetchActive, fetchFinished]);

  useEffect(() => {
    fetchAll();
    getRestaurant().then((r) => {
      if (r?.preparationLevel) setPrepLevel(r.preparationLevel);
    });
  }, [fetchAll]);

  // Keep a ref to the latest fetchAll for socket handlers
  useEffect(() => {
    fetchRef.current = async () => {
      await Promise.all([fetchActive(), fetchFinished()]);
    };
  }, [fetchActive, fetchFinished]);

  // WebSocket: listen for real-time order events
  useEffect(() => {
    if (!restaurantId) return;

    const socket = getSocket();
    if (!socket.connected) socket.connect();

    socket.emit("join:restaurant", restaurantId);

    const handleNewOrder = () => { fetchRef.current?.(); };
    const handleStatusUpdated = () => { fetchRef.current?.(); };
    const handleDisconnect = () => setSocketConnected(false);
    const handleReconnect = () => {
      setSocketConnected(true);
      socket.emit("join:restaurant", restaurantId);
      // Reload orders to catch up on missed events
      fetchRef.current?.();
    };

    socket.on("order:new", handleNewOrder);
    socket.on("order:statusUpdated", handleStatusUpdated);
    socket.on("disconnect", handleDisconnect);
    socket.on("connect", handleReconnect);

    return () => {
      socket.off("order:new", handleNewOrder);
      socket.off("order:statusUpdated", handleStatusUpdated);
      socket.off("disconnect", handleDisconnect);
      socket.off("connect", handleReconnect);
    };
  }, [restaurantId]);

  const handleStatusChange = async (orderId: string, status: string) => {
    if (statusChanging) return; // prevent double-click
    setStatusChanging(orderId);
    try {
      await updateOrderStatus(orderId, status);
      await Promise.all([fetchActive(), fetchFinished()]);
      setSelectedOrder((prev) =>
        prev?.id === orderId ? { ...prev, status: status as Order["status"] } : prev,
      );
    } finally {
      setStatusChanging(null);
    }
  };

  const handleRefund = async () => {
    if (!selectedOrder) return;
    setRefunding(true);
    const result = await refundOrder(selectedOrder.id);
    setRefunding(false);
    setRefundConfirmOpen(false);
    if (!("error" in result)) {
      await Promise.all([fetchActive(), fetchFinished()]);
      setSelectedOrder((prev) =>
        prev ? { ...prev, status: "CANCELLED" as Order["status"] } : prev,
      );
    }
  };

    const SUB_VIEWS: { key: SubView; label: string }[] = [
    { key: "En cours", label: "En cours" },
    { key: "Terminées", label: "Terminées" },
  ];

  if (loading) {
    return (
      <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 pt-4">
        {[1, 2, 3, 4].map((i) => (
          <Skeleton key={i} className="h-56 rounded-lg" />
        ))}
      </div>
    );
  }

  const PREP_LEVELS: { key: PreparationLevel; label: string; color: string }[] = [
    { key: "EASY", label: "Calme", color: "bg-brand-forest/15 text-brand-forest" },
    { key: "MEDIUM", label: "Modéré", color: "bg-brand-yellow/30 text-brand-ink" },
    { key: "BUSY", label: "Chargé", color: "bg-brand-orange/20 text-brand-orange" },
    { key: "CLOSED", label: "Fermé", color: "bg-destructive/15 text-destructive" },
  ];

  const handlePrepLevelChange = async (level: PreparationLevel) => {
    setPrepLevel(level);
    await updatePreparationLevel(level);
  };

  return (
    <>
    {/* WebSocket disconnection banner */}
    {!socketConnected && (
      <div className="mb-4 flex items-center gap-2 rounded-lg bg-brand-yellow/20 border border-brand-yellow/40 px-4 py-2 text-sm text-brand-ink">
        <span className="w-2 h-2 rounded-full bg-brand-yellow animate-pulse" />
        Connexion perdue, reconnexion en cours…
      </div>
    )}

    {/* Preparation level toggle */}
    <div className="flex items-center gap-3 mb-4">
      <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
        Affluence
      </span>
      <div className="flex gap-1 p-1 bg-muted rounded-lg">
        {PREP_LEVELS.map(({ key, label, color }) => (
          <button
            key={key}
            onClick={() => handlePrepLevelChange(key)}
            className={cn(
              "px-3 py-1 rounded-md text-xs font-medium transition-all",
              prepLevel === key
                ? `${color} shadow-sm`
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            {label}
          </button>
        ))}
      </div>
    </div>

    {/* Sub-view toggle */}
          <div className="flex gap-1 p-1 bg-muted rounded-lg w-fit mb-6">
            {SUB_VIEWS.map(({ key, label }) => (
              <button
                key={key}
                onClick={() => setSubView(key)}
                className={cn(
                  "px-3 py-1.5 rounded-md text-sm font-medium transition-all",
                  subView === key
                    ? "bg-white text-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground",
                )}
              >
                {label}
              </button>
            ))}
          </div>
    
          {subView === "En cours" && (
              activeOrders.length === 0 ? (
              <p className="text-muted-foreground text-center py-12">Aucune commande en cours</p>
            ) : (
              <div>
                <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
                  {activeOrders.map((order) => (
                    <OrderCard
                      key={order.id}
                      order={order}
                      onOpenDetail={setSelectedOrder}
                    />
                  ))}
                </div>
                <Pagination
                  page={activePage}
                  totalPages={activeTotalPages}
                  onPageChange={setActivePage}
                />
              </div>
            )
          )}

          {subView === "Terminées" && ( 
            finishedOrders.length === 0 ? (
            <p className="text-muted-foreground text-center py-12">Aucune commande terminée</p>
          ) : (
            <div>
              {/* Desktop table */}
              <div className="hidden md:block rounded-lg border border-border overflow-hidden">
                <table className="w-full text-sm">
                  <thead className="bg-black/3 border-b border-border">
                    <tr>
                      <th className="text-left px-4 py-3 font-semibold text-muted-foreground">#</th>
                      <th className="text-left px-4 py-3 font-semibold text-muted-foreground">Client</th>
                      <th className="text-left px-4 py-3 font-semibold text-muted-foreground">Total</th>
                      <th className="text-left px-4 py-3 font-semibold text-muted-foreground">Statut</th>
                      <th className="text-left px-4 py-3 font-semibold text-muted-foreground">Date</th>
                      <th className="px-4 py-3" />
                    </tr>
                  </thead>
                  <tbody>
                    {finishedOrders.map((order, i) => (
                      <tr
                        key={order.id}
                        className={`cursor-pointer hover:bg-black/[0.03] transition-colors ${
                          i % 2 === 0 ? "bg-white" : "bg-black/[0.015]"
                        }`}
                        onClick={() => setSelectedOrder(order)}
                      >
                        <td className="px-4 py-3 text-muted-foreground text-xs">
                          {order.orderNumber ? `#${order.orderNumber}` : "—"}
                        </td>
                        <td className="px-4 py-3">
                          <p className="font-medium">{order.fullName ?? "Client anonyme"}</p>
                          {order.phone && (
                            <p className="text-xs text-muted-foreground">{order.phone}</p>
                          )}
                        </td>
                        <td className="px-4 py-3 font-semibold">
                          {formatEuros(parseFloat(order.totalPrice))}
                        </td>
                        <td className="px-4 py-3">
                          <span
                            className={`text-xs px-2 py-0.5 rounded-full font-medium ${getOrderStatusColor(order.status)}`}
                          >
                            {getOrderStatusLabel(order.status)}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-muted-foreground">
                          {dayjs(order.createdAt).fromNow()}
                        </td>
                        <td className="px-4 py-3">
                          <Eye className="w-4 h-4 text-muted-foreground" />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Mobile cards */}
              <div className="md:hidden grid gap-3">
                {finishedOrders.map((order) => (
                  <FinishedOrderCard
                    key={order.id}
                    order={order}
                    onOpenDetail={setSelectedOrder}
                  />
                ))}
              </div>

              <Pagination
                page={finishedPage}
                totalPages={finishedTotalPages}
                onPageChange={setFinishedPage}
              />
            </div>
          ))}

      {/* ── Order detail sheet ─────────────────────────────────────────────── */}
      <Sheet open={!!selectedOrder} onOpenChange={(open) => !open && setSelectedOrder(null)}>
        <SheetContent side="right" hideCloseButton className="w-full sm:max-w-md overflow-y-auto p-0">
          {selectedOrder && (
            <>
              <SheetHeader className="px-5 py-4">
                <SheetTitle>Détail de la commande</SheetTitle>
              </SheetHeader>

              <div className="px-5 py-4 space-y-5">
                {/* Customer info */}
                <div className="space-y-1">
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                    Client
                  </p>
                  <p className="font-semibold">
                    {selectedOrder.fullName ?? "Client anonyme"}
                  </p>
                  {selectedOrder.phone && (
                    <p className="text-sm text-muted-foreground">{selectedOrder.phone}</p>
                  )}
                  {selectedOrder.email && (
                    <p className="text-sm text-muted-foreground">{selectedOrder.email}</p>
                  )}
                </div>

                <Separator />

                {/* Order items */}
                <div className="space-y-3">
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                    Articles
                  </p>
                  {selectedOrder.orderProducts.map((op) => (
                    <div key={op.id}>
                      <p className="font-medium text-sm">
                        {op.quantity}× {op.product.name}
                      </p>
                      <OrderOptions options={op.orderProductOptions} />
                    </div>
                  ))}
                </div>

                <Separator />

                {/* Total */}
                <div className="flex justify-between items-center font-semibold">
                  <span>Total</span>
                  <span>{formatEuros(parseFloat(selectedOrder.totalPrice))}</span>
                </div>

                <Separator />

                {/* Meta */}
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Statut</span>
                    <span
                      className={`text-xs px-2 py-0.5 rounded-full font-medium ${getOrderStatusColor(selectedOrder.status)}`}
                    >
                      {getOrderStatusLabel(selectedOrder.status)}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Date</span>
                    <span>
                      {dayjs(selectedOrder.createdAt).format("DD/MM/YYYY à HH:mm")}
                    </span>
                  </div>
                  {selectedOrder.scheduledFor && (
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Prévu pour</span>
                      <span className="text-brand-yellow font-medium">
                        {new Date(selectedOrder.scheduledFor).toLocaleTimeString("fr-FR", {
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </span>
                    </div>
                  )}
                </div>

                {/* Status actions */}
                {getStatusActions(selectedOrder.status).length > 0 && (
                  <>
                    <Separator />
                    <div>
                      <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">
                        Actions
                      </p>
                      <div className="flex gap-2">
                        {getStatusActions(selectedOrder.status).map((action) => (
                          <Button
                            key={action.targetStatus}
                            variant={action.variant}
                            size="sm"
                            className="flex-1"
                            disabled={statusChanging === selectedOrder.id}
                            onClick={() =>
                              handleStatusChange(selectedOrder.id, action.targetStatus)
                            }
                          >
                            {statusChanging === selectedOrder.id ? "En cours…" : action.label}
                          </Button>
                        ))}
                      </div>
                    </div>
                  </>
                )}

                {/* Refund button */}
                {selectedOrder.stripePaymentIntentId &&
                  selectedOrder.status !== "CANCELLED" && (
                  <>
                    <Separator />
                    <Button
                      variant="outline"
                      size="sm"
                      className="w-full text-destructive border-destructive/30 hover:bg-destructive/10"
                      onClick={() => setRefundConfirmOpen(true)}
                    >
                      Rembourser
                    </Button>
                  </>
                )}
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>

      {/* Refund confirmation dialog */}
      <Dialog open={refundConfirmOpen} onOpenChange={setRefundConfirmOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Confirmer le remboursement</DialogTitle>
          </DialogHeader>
          <div className="p-4 space-y-4">
            <p className="text-sm text-muted-foreground">
              Cette action va rembourser le paiement Stripe et annuler la commande.
              Cette action est irréversible.
            </p>
            <div className="flex gap-2">
              <Button
                variant="outline"
                className="flex-1"
                onClick={() => setRefundConfirmOpen(false)}
                disabled={refunding}
              >
                Annuler
              </Button>
              <Button
                variant="destructive"
                className="flex-1"
                onClick={handleRefund}
                disabled={refunding}
              >
                {refunding ? "Remboursement..." : "Rembourser"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}

// ── Active order card ───────────────────────────────────────────────────────────

function OrderCard({
  order,
  onOpenDetail,
}: {
  order: Order;
  onOpenDetail: (order: Order) => void;
}) {
  return (
    <button
      className="w-full text-left bg-white border border-brand-border rounded-lg p-4 flex flex-col gap-2 hover:border-brand-border transition-colors"
      onClick={() => onOpenDetail(order)}
    >
      <div className="flex items-start justify-between gap-2">
        <p className="font-bold text-sm">{order.fullName ?? "Client anonyme"}</p>
        <span
          className={`text-xs px-2 py-0.5 rounded-full font-medium whitespace-nowrap ${getOrderStatusColor(order.status)}`}
        >
          {getOrderStatusLabel(order.status)}
        </span>
      </div>

      <div className="flex items-center justify-between text-sm">
        {order.orderNumber ? (
          <span className="text-xs text-muted-foreground">#{order.orderNumber}</span>
        ) : (
          <span />
        )}
        <span className="font-semibold">{formatEuros(parseFloat(order.totalPrice))}</span>
      </div>

      {order.scheduledFor && (
        <span className="inline-flex items-center gap-1 text-xs font-medium text-brand-yellow bg-brand-yellow/20 border border-brand-yellow/40 rounded-full px-2 py-0.5 w-fit">
          Prévu pour{" "}
          {new Date(order.scheduledFor).toLocaleTimeString("fr-FR", {
            hour: "2-digit",
            minute: "2-digit",
          })}
        </span>
      )}
    </button>
  );
}

// ── Finished order card (mobile) ────────────────────────────────────────────────

function FinishedOrderCard({
  order,
  onOpenDetail,
}: {
  order: Order;
  onOpenDetail: (order: Order) => void;
}) {
  return (
    <button
      className="w-full text-left bg-white border border-brand-border rounded-lg p-4 flex flex-col gap-2 hover:border-brand-border transition-colors"
      onClick={() => onOpenDetail(order)}
    >
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="font-bold text-sm">{order.fullName ?? "Client anonyme"}</p>
          {order.phone && <p className="text-xs text-muted-foreground">{order.phone}</p>}
        </div>
        <span
          className={`text-xs px-2 py-0.5 rounded-full font-medium whitespace-nowrap ${getOrderStatusColor(order.status)}`}
        >
          {getOrderStatusLabel(order.status)}
        </span>
      </div>

      <div className="flex justify-between items-center text-sm">
        <span className="text-muted-foreground">{dayjs(order.createdAt).fromNow()}</span>
        <span className="font-semibold">{formatEuros(parseFloat(order.totalPrice))}</span>
      </div>
    </button>
  );
}

// ── Option groups ───────────────────────────────────────────────────────────────

function OrderOptions({ options }: { options: OrderProductOption[] }) {
  if (options.length === 0) return null;

  const groups = options.reduce<Record<string, string[]>>((acc, o) => {
    const group = o.optionChoice.optionGroup?.name ?? "Options";
    (acc[group] ??= []).push(o.optionChoice.name);
    return acc;
  }, {});

  return (
    <div className="pl-3 mt-0.5 space-y-0.5">
      {Object.entries(groups).map(([group, choices]) => (
        <div key={group}>
          <p className="text-xs text-muted-foreground font-medium">{group}</p>
          {choices.map((c, i) => (
            <p key={i} className="text-xs text-muted-foreground pl-2">{c}</p>
          ))}
        </div>
      ))}
    </div>
  );
}

// ── Pagination ──────────────────────────────────────────────────────────────────

function Pagination({
  page,
  totalPages,
  onPageChange,
}: {
  page: number;
  totalPages: number;
  onPageChange: (page: number) => void;
}) {
  if (totalPages <= 1) return null;
  return (
    <div className="flex justify-center gap-2 mt-6">
      <Button
        variant="outline"
        size="sm"
        disabled={page <= 1}
        onClick={() => onPageChange(page - 1)}
      >
        Précédent
      </Button>
      <span className="flex items-center text-sm text-muted-foreground">
        Page {page} / {totalPages}
      </span>
      <Button
        variant="outline"
        size="sm"
        disabled={page >= totalPages}
        onClick={() => onPageChange(page + 1)}
      >
        Suivant
      </Button>
    </div>
  );
}
