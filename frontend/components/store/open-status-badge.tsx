"use client";

import { useEffect, useState } from "react";
import type { OpeningHour, ExceptionalHour } from "@/types/api";
import { cn } from "@/lib/utils";

function isOpen(
  openingHours: OpeningHour[],
  exceptionalHours: ExceptionalHour[],
): boolean {
  if (!openingHours || openingHours.length === 0) return true;

  const now = new Date();
  const todayStr = now.toISOString().slice(0, 10); // YYYY-MM-DD

  // Check exceptional hours first
  const exceptional = exceptionalHours.find(
    (eh) => eh.date.slice(0, 10) === todayStr,
  );

  if (exceptional) {
    if (exceptional.isClosed) return false;
    if (exceptional.openTime && exceptional.closeTime) {
      const currentTime = `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`;
      return currentTime >= exceptional.openTime && currentTime < exceptional.closeTime;
    }
  }

  // Fall back to regular opening hours (multiple ranges per day)
  const dayOfWeek = now.getDay();
  const currentTime = `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`;
  const dayRanges = openingHours.filter((h) => h.dayOfWeek === dayOfWeek);
  if (dayRanges.length === 0) return false;
  return dayRanges.some((h) => currentTime >= h.openTime && currentTime < h.closeTime);
}

interface OpenStatusBadgeProps {
  openingHours: OpeningHour[];
  exceptionalHours: ExceptionalHour[];
}

export default function OpenStatusBadge({
  openingHours,
  exceptionalHours,
}: OpenStatusBadgeProps) {
  const [open, setOpen] = useState(() => isOpen(openingHours, exceptionalHours));

  useEffect(() => {
    // Recalculate every minute
    const interval = setInterval(() => {
      setOpen(isOpen(openingHours, exceptionalHours));
    }, 60_000);
    return () => clearInterval(interval);
  }, [openingHours, exceptionalHours]);

  return (
    <span
      className={cn(
        "text-xs px-2.5 py-1 rounded-full font-medium",
        open ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800",
      )}
    >
      {open ? "Ouvert" : "Fermé"}
    </span>
  );
}
