import Image from "next/image";
import type {
  Restaurant,
  OpeningHour,
  ExceptionalHour,
  PreparationLevel,
} from "@/types/api";
import { MapPin, Clock } from "lucide-react";
import { cn } from "@/lib/utils";
import OpenStatusBadge from "./open-status-badge";

function getTodayHours(openingHours: OpeningHour[]): string | null {
  const dayOfWeek = new Date().getDay();
  const todayHours = openingHours.find((h) => h.dayOfWeek === dayOfWeek);
  if (!todayHours) return null;
  return `${todayHours.openTime} - ${todayHours.closeTime}`;
}

const PREP_BADGES: Record<PreparationLevel, { label: string; color: string }> =
  {
    EASY: { label: "Peu d'attente", color: "bg-green-100 text-green-800" },
    MEDIUM: {
      label: "Attente modérée",
      color: "bg-yellow-100 text-yellow-800",
    },
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
      <div className="max-w-screen-3xl mx-auto flex flex-col md:flex-row md:items-start md:gap-6 md:p-8 xl:p-16">
        {/* Image — full bleed on mobile, rounded card on desktop */}
        {restaurant.imageUrl && (
          <div className="relative w-full aspect-[16/9] md:w-[30%] min-h-[250px] md:shrink-0 md:rounded-xl overflow-hidden bg-gray-100">
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
        <div className="flex-1 px-4 py-5 md:px-0 md:py-0">
          <h1 className="text-2xl font-bold mb-1">{restaurant.name}</h1>

          <div className="flex flex-wrap items-center gap-x-1.5 gap-y-0.5 text-sm text-[#585c5c]">
            <MapPin className="w-3.5 h-3.5 shrink-0" />
            <span>
              {restaurant.address}, {restaurant.zipCode} {restaurant.city}
            </span>
          </div>

          {todayHours && (
            <div className="flex items-center gap-1.5 text-sm text-[#585c5c] mt-1">
              <Clock className="w-3.5 h-3.5 shrink-0" />
              <span>Aujourd&apos;hui : {todayHours}</span>
            </div>
          )}

          <div className="flex flex-wrap items-center gap-2 mt-3">
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
      </div>
    </div>
  );
}
