"use client";

import { useEffect, useState, useCallback } from "react";
import { getOrders, updateOrderStatus } from "@/lib/api";
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
  formatEuros,
  cn,
  getOrderStatusLabel,
  getOrderStatusColor,
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

export default function OrdersTab() {
  const [activeOrders, setActiveOrders] = useState<Order[]>([]);
  const [finishedOrders, setFinishedOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [activePage, setActivePage] = useState(1);
  const [finishedPage, setFinishedPage] = useState(1);
  const [activeTotalPages, setActiveTotalPages] = useState(1);
  const [finishedTotalPages, setFinishedTotalPages] = useState(1);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [subView, setSubView] = useState<SubView>("En cours");
  

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
  }, [fetchAll]);

  const handleStatusChange = async (orderId: string, status: string) => {
    await updateOrderStatus(orderId, status);
    await Promise.all([fetchActive(), fetchFinished()]);
    // Keep sheet open but update selected order's status
    setSelectedOrder((prev) =>
      prev?.id === orderId ? { ...prev, status: status as Order["status"] } : prev,
    );
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

  return (
    <>

    {/* Sub-view toggle */}
          <div className="flex gap-1 p-1 bg-gray-100 rounded-lg w-fit mb-6">
            {SUB_VIEWS.map(({ key, label }) => (
              <button
                key={key}
                onClick={() => setSubView(key)}
                className={cn(
                  "px-3 py-1.5 rounded-md text-sm font-medium transition-all",
                  subView === key
                    ? "bg-white text-gray-900 shadow-sm"
                    : "text-gray-600 hover:text-gray-900",
                )}
              >
                {label}
              </button>
            ))}
          </div>
    
          {subView === "En cours" && (
              activeOrders.length === 0 ? (
              <p className="text-[#676767] text-center py-12">Aucune commande en cours</p>
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
            <p className="text-[#676767] text-center py-12">Aucune commande terminée</p>
          ) : (
            <div>
              {/* Desktop table */}
              <div className="hidden md:block rounded-lg border border-black/8 overflow-hidden">
                <table className="w-full text-sm">
                  <thead className="bg-black/3 border-b border-black/8">
                    <tr>
                      <th className="text-left px-4 py-3 font-semibold text-[#676767]">#</th>
                      <th className="text-left px-4 py-3 font-semibold text-[#676767]">Client</th>
                      <th className="text-left px-4 py-3 font-semibold text-[#676767]">Total</th>
                      <th className="text-left px-4 py-3 font-semibold text-[#676767]">Statut</th>
                      <th className="text-left px-4 py-3 font-semibold text-[#676767]">Date</th>
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
                        <td className="px-4 py-3 text-[#676767] text-xs">
                          {order.orderNumber ? `#${order.orderNumber}` : "—"}
                        </td>
                        <td className="px-4 py-3">
                          <p className="font-medium">{order.fullName ?? "Client anonyme"}</p>
                          {order.phone && (
                            <p className="text-xs text-[#676767]">{order.phone}</p>
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
                        <td className="px-4 py-3 text-[#676767]">
                          {dayjs(order.createdAt).fromNow()}
                        </td>
                        <td className="px-4 py-3">
                          <Eye className="w-4 h-4 text-[#676767]" />
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
                  <p className="text-xs font-semibold text-[#676767] uppercase tracking-wide">
                    Client
                  </p>
                  <p className="font-semibold">
                    {selectedOrder.fullName ?? "Client anonyme"}
                  </p>
                  {selectedOrder.phone && (
                    <p className="text-sm text-[#676767]">{selectedOrder.phone}</p>
                  )}
                  {selectedOrder.email && (
                    <p className="text-sm text-[#676767]">{selectedOrder.email}</p>
                  )}
                </div>

                <Separator />

                {/* Order items */}
                <div className="space-y-3">
                  <p className="text-xs font-semibold text-[#676767] uppercase tracking-wide">
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
                    <span className="text-[#676767]">Statut</span>
                    <span
                      className={`text-xs px-2 py-0.5 rounded-full font-medium ${getOrderStatusColor(selectedOrder.status)}`}
                    >
                      {getOrderStatusLabel(selectedOrder.status)}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-[#676767]">Date</span>
                    <span>
                      {dayjs(selectedOrder.createdAt).format("DD/MM/YYYY à HH:mm")}
                    </span>
                  </div>
                  {selectedOrder.scheduledFor && (
                    <div className="flex justify-between">
                      <span className="text-[#676767]">Prévu pour</span>
                      <span className="text-amber-700 font-medium">
                        {new Date(selectedOrder.scheduledFor).toLocaleTimeString("fr-FR", {
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </span>
                    </div>
                  )}
                </div>

                {/* Status change (only for active orders) */}
                {["PENDING", "PENDING_ON_SITE_PAYMENT", "IN_PROGRESS", "COMPLETED"].includes(
                  selectedOrder.status,
                ) && (
                  <>
                    <Separator />
                    <div>
                      <p className="text-xs font-semibold text-[#676767] uppercase tracking-wide mb-2">
                        Changer le statut
                      </p>
                      <select
                        className="w-full text-sm border border-black/15 rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary"
                        value={selectedOrder.status}
                        onChange={(e) =>
                          handleStatusChange(selectedOrder.id, e.target.value)
                        }
                      >
                        {ORDER_STATUSES.map((s) => (
                          <option key={s} value={s}>
                            {getOrderStatusLabel(s)}
                          </option>
                        ))}
                      </select>
                    </div>
                  </>
                )}
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>
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
      className="w-full text-left bg-white border border-black/5 rounded-lg p-4 flex flex-col gap-2 hover:border-black/15 transition-colors"
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
          <span className="text-xs text-[#676767]">#{order.orderNumber}</span>
        ) : (
          <span />
        )}
        <span className="font-semibold">{formatEuros(parseFloat(order.totalPrice))}</span>
      </div>

      {order.scheduledFor && (
        <span className="inline-flex items-center gap-1 text-xs font-medium text-amber-700 bg-amber-50 border border-amber-200 rounded-full px-2 py-0.5 w-fit">
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
      className="w-full text-left bg-white border border-black/5 rounded-lg p-4 flex flex-col gap-2 hover:border-black/15 transition-colors"
      onClick={() => onOpenDetail(order)}
    >
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="font-bold text-sm">{order.fullName ?? "Client anonyme"}</p>
          {order.phone && <p className="text-xs text-[#676767]">{order.phone}</p>}
        </div>
        <span
          className={`text-xs px-2 py-0.5 rounded-full font-medium whitespace-nowrap ${getOrderStatusColor(order.status)}`}
        >
          {getOrderStatusLabel(order.status)}
        </span>
      </div>

      <div className="flex justify-between items-center text-sm">
        <span className="text-[#676767]">{dayjs(order.createdAt).fromNow()}</span>
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
          <p className="text-xs text-[#676767] font-medium">{group}</p>
          {choices.map((c, i) => (
            <p key={i} className="text-xs text-[#676767] pl-2">{c}</p>
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
      <span className="flex items-center text-sm text-[#676767]">
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
