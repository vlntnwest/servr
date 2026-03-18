import Image from "next/image";
import type { Restaurant, OpeningHour, ExceptionalHour, PreparationLevel } from "@/types/api";
import { MapPin, Clock } from "lucide-react";
import { cn } from "@/lib/utils";
import OpenStatusBadge from "./open-status-badge";

function getTodayHours(openingHours: OpeningHour[]): string | null {
  const dayOfWeek = new Date().getDay();
  const todayHours = openingHours.find((h) => h.dayOfWeek === dayOfWeek);
  if (!todayHours) return null;
  return `${todayHours.openTime} - ${todayHours.closeTime}`;
}

const PREP_BADGES: Record<
  PreparationLevel,
  { label: string; color: string }
> = {
  EASY: { label: "Peu d'attente", color: "bg-green-100 text-green-800" },
  MEDIUM: { label: "Attente modérée", color: "bg-yellow-100 text-yellow-800" },
  BUSY: { label: "Forte affluence", color: "bg-orange-100 text-orange-800" },
  CLOSED: { label: "Fermé", color: "bg-red-100 text-red-800" },
};

interface RestaurantHeaderProps {
  restaurant: Restaurant;
  openingHours: OpeningHour[];
  exceptionalHours: ExceptionalHour[];
}

export default function RestaurantHeader({
  restaurant,
  openingHours,
  exceptionalHours,
}: RestaurantHeaderProps) {
  const todayHours = getTodayHours(openingHours);
  const prepBadge = restaurant.preparationLevel
    ? PREP_BADGES[restaurant.preparationLevel]
    : null;

  return (
    <div className="border-b border-black/5">
      {/* Hero image */}
      {restaurant.imageUrl && (
        <div className="relative w-full h-40 sm:h-56 bg-gray-100">
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
      <div className="max-w-screen-xl mx-auto px-4 py-5">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold">{restaurant.name}</h1>
            <div className="flex items-center gap-1.5 text-sm text-[#676767] mt-1">
              <MapPin className="w-3.5 h-3.5 shrink-0" />
              <span>
                {restaurant.address}, {restaurant.zipCode} {restaurant.city}
              </span>
            </div>
          </div>

          <div className="flex flex-col items-end gap-1.5 shrink-0">
            <OpenStatusBadge
              openingHours={openingHours}
              exceptionalHours={exceptionalHours}
            />
            {prepBadge && restaurant.preparationLevel !== "EASY" && (
              <span
                className={cn(
                  "text-xs px-2.5 py-1 rounded-full font-medium",
                  prepBadge.color,
                )}
              >
                {prepBadge.label}
              </span>
            )}
          </div>
        </div>

        {todayHours && (
          <div className="flex items-center gap-1.5 text-sm text-[#676767] mt-2">
            <Clock className="w-3.5 h-3.5 shrink-0" />
            <span>Aujourd&apos;hui : {todayHours}</span>
          </div>
        )}
      </div>
    </div>
  );
}
