"use client";

import { useEffect, useState } from "react";
import type { OpeningHour, ExceptionalHour } from "@/types/api";
import { cn } from "@/lib/utils";

function getTimeParts(timezone: string) {
  const now = new Date();
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: timezone,
    weekday: "short",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).formatToParts(now);

  const map: Record<string, string> = {};
  for (const { type, value } of parts) map[type] = value;

  const WEEKDAY: Record<string, number> = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 };
  return {
    todayStr: `${map.year}-${map.month}-${map.day}`,
    dayOfWeek: WEEKDAY[map.weekday],
    currentTime: `${map.hour}:${map.minute}`,
  };
}

function isOpen(
  openingHours: OpeningHour[],
  exceptionalHours: ExceptionalHour[],
  timezone: string,
): boolean {
  if (!openingHours || openingHours.length === 0) return true;

  const { todayStr, dayOfWeek, currentTime } = getTimeParts(timezone);

  const exceptional = exceptionalHours.find(
    (eh) => eh.date.slice(0, 10) === todayStr,
  );

  if (exceptional) {
    if (exceptional.isClosed) return false;
    if (exceptional.openTime && exceptional.closeTime) {
      return currentTime >= exceptional.openTime && currentTime < exceptional.closeTime;
    }
  }

  const dayRanges = openingHours.filter((h) => h.dayOfWeek === dayOfWeek);
  if (dayRanges.length === 0) return false;
  return dayRanges.some((h) => currentTime >= h.openTime && currentTime < h.closeTime);
}

interface OpenStatusBadgeProps {
  openingHours: OpeningHour[];
  exceptionalHours: ExceptionalHour[];
  timezone: string;
}

export default function OpenStatusBadge({
  openingHours,
  exceptionalHours,
  timezone,
}: OpenStatusBadgeProps) {
  const [open, setOpen] = useState(() => isOpen(openingHours, exceptionalHours, timezone));

  useEffect(() => {
    setOpen(isOpen(openingHours, exceptionalHours, timezone));
    const interval = setInterval(() => {
      setOpen(isOpen(openingHours, exceptionalHours, timezone));
    }, 60_000);
    return () => clearInterval(interval);
  }, [openingHours, exceptionalHours, timezone]);

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 text-caption px-3 py-1 rounded-full font-semibold tracking-pill",
        open
          ? "bg-brand-lime/25 text-brand-forest"
          : "bg-destructive/10 text-destructive",
      )}
    >
      <span
        className={cn(
          "w-1.5 h-1.5 rounded-full",
          open ? "bg-brand-forest" : "bg-destructive",
        )}
      />
      {open ? "Ouvert" : "Fermé"}
    </span>
  );
}
