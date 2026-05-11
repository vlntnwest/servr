"use client";

import { useEffect, useMemo, useState } from "react";
import { getOpeningHours } from "@/lib/api";
import { useCart } from "@/contexts/cart-context";
import { useOptionalRestaurant } from "@/contexts/restaurant-context";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import type { OpeningHour, PreparationLevel } from "@/types/api";

const PREP_DURATION_MINUTES: Record<PreparationLevel, number> = {
  EASY: 15,
  MEDIUM: 25,
  BUSY: 40,
  CLOSED: 0,
};

const DAYS_AHEAD = 7;

function generateSlotsForDate(
  date: Date,
  openTime: string,
  closeTime: string,
  prepMinutes: number,
): string[] {
  const [openH, openM] = openTime.split(":").map(Number);
  const [closeH, closeM] = closeTime.split(":").map(Number);
  const start = new Date(date);
  start.setHours(openH, openM, 0, 0);
  const end = new Date(date);
  end.setHours(closeH, closeM, 0, 0);
  const isToday = date.toDateString() === new Date().toDateString();
  const minFrom = isToday ? new Date(Date.now() + prepMinutes * 60 * 1000) : start;
  const cursor = new Date(Math.max(start.getTime(), minFrom.getTime()));
  const rem = cursor.getMinutes() % 15;
  if (rem !== 0) cursor.setMinutes(cursor.getMinutes() + (15 - rem), 0, 0);
  const slots: string[] = [];
  while (cursor < end) {
    slots.push(cursor.toISOString());
    cursor.setMinutes(cursor.getMinutes() + 15);
  }
  return slots;
}

function formatDayLabel(date: Date): string {
  const today = new Date();
  const tomorrow = new Date(today);
  tomorrow.setDate(today.getDate() + 1);
  if (date.toDateString() === today.toDateString()) return "Aujourd'hui";
  if (date.toDateString() === tomorrow.toDateString()) return "Demain";
  return date.toLocaleDateString("fr-FR", {
    weekday: "long",
    day: "numeric",
    month: "long",
  });
}

function formatSlotLabel(iso: string): string {
  const d = new Date(iso);
  return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
}

function isCurrentlyOpen(openingHours: OpeningHour[]): boolean {
  if (!openingHours || openingHours.length === 0) return true;
  const now = new Date();
  const dayOfWeek = now.getDay();
  const currentTime = `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`;
  const dayRanges = openingHours.filter((h) => h.dayOfWeek === dayOfWeek);
  if (dayRanges.length === 0) return false;
  return dayRanges.some(
    (h) => currentTime >= h.openTime && currentTime < h.closeTime,
  );
}

export default function OrderDate() {
  const { scheduledFor, setScheduledFor } = useCart();
  const restaurantCtx = useOptionalRestaurant();
  const [openingHours, setOpeningHours] = useState<OpeningHour[]>([]);
  const [orderType, setOrderType] = useState<"asap" | "scheduled">("asap");
  const [selectedDay, setSelectedDay] = useState("");

  useEffect(() => {
    getOpeningHours(restaurantCtx?.restaurant.id)
      .then(setOpeningHours)
      .catch(() => {});
  }, [restaurantCtx?.restaurant.id]);

  const asapAvailable = useMemo(() => {
    if (restaurantCtx?.restaurant.preparationLevel === "CLOSED") return false;
    return isCurrentlyOpen(openingHours);
  }, [restaurantCtx?.restaurant.preparationLevel, openingHours]);

  const availableDays = useMemo(() => {
    if (restaurantCtx?.restaurant.preparationLevel === "CLOSED") return [];
    const lvl = restaurantCtx?.restaurant.preparationLevel ?? "EASY";
    const prepMinutes = PREP_DURATION_MINUTES[lvl];
    const days: { dateKey: string; label: string; slots: string[] }[] = [];
    for (let i = 0; i < DAYS_AHEAD; i++) {
      const date = new Date();
      date.setDate(date.getDate() + i);
      const dayOfWeek = date.getDay();
      const ranges = openingHours.filter((h) => h.dayOfWeek === dayOfWeek);
      if (ranges.length === 0) continue;
      const slots = ranges
        .sort((a, b) => a.openTime.localeCompare(b.openTime))
        .flatMap((h) => generateSlotsForDate(date, h.openTime, h.closeTime, prepMinutes));
      if (slots.length === 0) continue;
      days.push({
        dateKey: date.toDateString(),
        label: formatDayLabel(date),
        slots,
      });
    }
    return days;
  }, [openingHours, restaurantCtx?.restaurant.preparationLevel]);

  // Auto-switch to scheduled if asap not available
  useEffect(() => {
    if (!asapAvailable && orderType === "asap" && availableDays.length > 0) {
      setOrderType("scheduled");
      const first = availableDays[0];
      if (first) {
        setSelectedDay(first.dateKey);
        setScheduledFor(first.slots[0] ?? "");
      }
    }
  }, [asapAvailable, availableDays, orderType, setScheduledFor]);

  const estimatedReadyTime = useMemo(() => {
    const lvl = restaurantCtx?.restaurant.preparationLevel;
    if (!lvl || lvl === "CLOSED" || !asapAvailable) return null;
    const minutes = PREP_DURATION_MINUTES[lvl];
    const ready = new Date(Date.now() + minutes * 60 * 1000);
    return `${String(ready.getHours()).padStart(2, "0")}:${String(ready.getMinutes()).padStart(2, "0")}`;
  }, [restaurantCtx?.restaurant.preparationLevel, asapAvailable]);

  const currentDayEntry =
    availableDays.find((d) => d.dateKey === selectedDay) ?? availableDays[0];

  const handleTypeChange = (value: string) => {
    if (value === "asap" && asapAvailable) {
      setOrderType("asap");
      setScheduledFor("");
    } else {
      const first = availableDays[0];
      setSelectedDay(first?.dateKey ?? "");
      setScheduledFor(first?.slots[0] ?? "");
      setOrderType("scheduled");
    }
  };

  return (
    <div className="mx-4 border bg-white border-brand-border rounded-card overflow-hidden px-4 py-4">
      <p className="text-caption uppercase tracking-label font-semibold text-brand-stone mb-3">
        Heure de commande
      </p>
      <RadioGroup
        value={orderType}
        onValueChange={handleTypeChange}
        className="gap-0"
      >
        <div
          onClick={() => asapAvailable && handleTypeChange("asap")}
          className={`flex items-center py-2 -mx-4 px-4 transition-colors ${asapAvailable ? "cursor-pointer hover:bg-brand-ink/[0.02]" : "opacity-40 cursor-not-allowed"}`}
        >
          <div className="flex-1">
            <span className="text-body">Au plus vite</span>
            {estimatedReadyTime && orderType === "asap" && (
              <p className="text-body-sm text-brand-stone">
                Prévu pour {estimatedReadyTime}
              </p>
            )}
          </div>
          <RadioGroupItem
            value="asap"
            id="asap"
            className="border-2 pointer-events-none"
            disabled={!asapAvailable}
          />
        </div>
        <div
          onClick={() =>
            availableDays.length > 0 && handleTypeChange("scheduled")
          }
          className={`flex items-center py-2 -mx-4 px-4 transition-colors ${availableDays.length === 0 ? "opacity-40 cursor-not-allowed" : "cursor-pointer hover:bg-brand-ink/[0.02]"}`}
        >
          <span className="flex-1 text-body">Prévu pour…</span>
          <RadioGroupItem
            value="scheduled"
            id="scheduled"
            className="border-2 pointer-events-none"
            disabled={availableDays.length === 0}
          />
        </div>
      </RadioGroup>

      {orderType === "scheduled" && availableDays.length > 0 && (
        <div className="flex gap-2 mt-3">
          <select
            value={currentDayEntry?.dateKey ?? ""}
            onChange={(e) => {
              const day = availableDays.find(
                (d) => d.dateKey === e.target.value,
              );
              setSelectedDay(e.target.value);
              setScheduledFor(day?.slots[0] ?? "");
            }}
            className="flex-1 text-body-sm border border-brand-border rounded-note px-3 py-2.5 focus:outline-none focus:border-brand-ink bg-transparent transition-colors"
          >
            {availableDays.map((d) => (
              <option key={d.dateKey} value={d.dateKey}>
                {d.label}
              </option>
            ))}
          </select>
          <select
            value={scheduledFor}
            onChange={(e) => setScheduledFor(e.target.value)}
            className="flex-1 text-body-sm border border-brand-border rounded-note px-3 py-2.5 focus:outline-none focus:border-brand-ink bg-transparent transition-colors"
          >
            {(currentDayEntry?.slots ?? []).map((iso) => (
              <option key={iso} value={iso}>
                {formatSlotLabel(iso)}
              </option>
            ))}
          </select>
        </div>
      )}
    </div>
  );
}
