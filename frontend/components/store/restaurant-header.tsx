"use client";

import Image from "next/image";
import type { OpeningHour, ExceptionalHour, PreparationLevel } from "@/types/api";
import { MapPin, Clock } from "lucide-react";
import { cn } from "@/lib/utils";
import OpenStatusBadge from "./open-status-badge";
import { useRestaurant } from "@/contexts/restaurant-context";

function getTodayHours(openingHours: OpeningHour[], timezone: string): string | null {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: timezone,
    weekday: "short",
  }).formatToParts(new Date());
  const WEEKDAY: Record<string, number> = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 };
  const dayOfWeek = WEEKDAY[parts.find((p) => p.type === "weekday")!.value];
  const ranges = openingHours
    .filter((h) => h.dayOfWeek === dayOfWeek)
    .sort((a, b) => a.openTime.localeCompare(b.openTime));
  if (ranges.length === 0) return null;
  return ranges.map((h) => `${h.openTime} - ${h.closeTime}`).join(" / ");
}

const PREP_BADGES: Record<PreparationLevel, { label: string; color: string }> = {
  EASY: {
    label: "~15 min",
    color: "bg-brand-forest/10 text-brand-forest",
  },
  MEDIUM: {
    label: "~25 min",
    color: "bg-brand-yellow/20 text-[#7a5e08]",
  },
  BUSY: {
    label: "~40 min",
    color: "bg-brand-orange/15 text-brand-orange",
  },
  CLOSED: { label: "Fermé", color: "bg-destructive/10 text-destructive" },
};

interface RestaurantHeaderProps {
  openingHours: OpeningHour[];
  exceptionalHours: ExceptionalHour[];
}

export default function RestaurantHeader({
  openingHours,
  exceptionalHours,
}: RestaurantHeaderProps) {
  const { restaurant } = useRestaurant();
  const todayHours = getTodayHours(openingHours, restaurant.timezone);
  const prepBadge = restaurant.preparationLevel
    ? PREP_BADGES[restaurant.preparationLevel]
    : null;

  return (
    <div className="bg-background">
      <div className="max-w-screen-3xl mx-auto flex flex-col md:flex-row md:items-start md:gap-8 md:p-8 xl:p-16">
        {/* Image — full bleed on mobile, rounded card on desktop */}
        {restaurant.imageUrl && (
          <div className="relative w-full aspect-[16/9] md:w-[30%] min-h-[300px] md:shrink-0 md:rounded-card overflow-hidden bg-muted">
            <Image
              src={restaurant.imageUrl}
              alt={restaurant.name}
              fill
              className="object-cover"
              priority
            />
          </div>
        )}

        {/* Info */}
        <div className="flex-1 px-4 py-6 md:px-0 md:py-0">
          <h1 className="font-display-italic italic font-black text-[40px] leading-none tracking-tight mb-3 text-brand-ink">
            {restaurant.name}
          </h1>

          <div className="flex flex-wrap items-center gap-x-1.5 gap-y-0.5 text-body-sm text-brand-stone">
            <MapPin className="w-3.5 h-3.5 shrink-0" />
            <span>
              {restaurant.address}, {restaurant.zipCode} {restaurant.city}
            </span>
          </div>

          {todayHours && (
            <div className="flex items-center gap-1.5 text-body-sm text-brand-stone mt-1">
              <Clock className="w-3.5 h-3.5 shrink-0" />
              <span>Aujourd&apos;hui : {todayHours}</span>
            </div>
          )}

          <div className="flex flex-wrap items-center gap-2 mt-4">
            {restaurant.preparationLevel !== "CLOSED" && (
              <OpenStatusBadge
                openingHours={openingHours}
                exceptionalHours={exceptionalHours}
                timezone={restaurant.timezone}
              />
            )}
            {prepBadge && restaurant.preparationLevel !== "EASY" && (
              <span
                className={cn(
                  "text-caption px-3 py-1 rounded-full font-semibold tracking-pill",
                  prepBadge.color,
                )}
              >
                {prepBadge.label}
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
