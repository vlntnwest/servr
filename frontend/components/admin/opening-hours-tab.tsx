"use client";

import { useEffect, useState } from "react";
import { getOpeningHours, updateOpeningHours } from "@/lib/api";
import ExceptionalHoursSection from "./exceptional-hours-section";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Loader2, Plus, Trash2 } from "lucide-react";

const DAYS = [
  "Dimanche",
  "Lundi",
  "Mardi",
  "Mercredi",
  "Jeudi",
  "Vendredi",
  "Samedi",
];

type HourEntry = {
  dayOfWeek: number;
  openTime: string;
  closeTime: string;
  order: number;
};

export default function OpeningHoursTab() {
  const [hours, setHours] = useState<HourEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    getOpeningHours().then((data) => {
      setHours(
        data.map((h) => ({
          dayOfWeek: h.dayOfWeek,
          openTime: h.openTime,
          closeTime: h.closeTime,
          order: h.order,
        }))
      );
      setLoading(false);
    });
  }, []);

  const addHour = () => {
    setHours((prev) => [
      ...prev,
      { dayOfWeek: 1, openTime: "11:30", closeTime: "22:00", order: prev.length },
    ]);
  };

  const removeHour = (idx: number) => {
    setHours((prev) => prev.filter((_, i) => i !== idx));
  };

  const updateHour = (idx: number, key: keyof HourEntry, value: string | number) => {
    setHours((prev) =>
      prev.map((h, i) => (i === idx ? { ...h, [key]: value } : h))
    );
  };

  const handleSave = async () => {
    setSaving(true);
    await updateOpeningHours(hours);
    setSaving(false);
  };

  if (loading) {
    return <Skeleton className="h-48 rounded-lg" />;
  }

  return (
    <div>
      <div className="space-y-2 mb-4">
        {hours.map((h, idx) => (
          <div
            key={idx}
            className="bg-white border border-brand-border rounded-lg p-3 flex items-center gap-3"
          >
            <select
              className="text-sm border border-border rounded px-2 py-1.5 focus:outline-none focus:ring-2 focus:ring-primary"
              value={h.dayOfWeek}
              onChange={(e) => updateHour(idx, "dayOfWeek", Number(e.target.value))}
            >
              {DAYS.map((day, i) => (
                <option key={i} value={i}>
                  {day}
                </option>
              ))}
            </select>
            <Input
              type="text"
              value={h.openTime}
              onChange={(e) => updateHour(idx, "openTime", e.target.value)}
              placeholder="11:30"
              className="w-20 text-sm"
            />
            <span className="text-muted-foreground text-sm">—</span>
            <Input
              type="text"
              value={h.closeTime}
              onChange={(e) => updateHour(idx, "closeTime", e.target.value)}
              placeholder="22:00"
              className="w-20 text-sm"
            />
            <button
              className="ml-auto text-destructive hover:text-destructive/80 p-1"
              onClick={() => removeHour(idx)}
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        ))}
      </div>

      <div className="flex gap-2">
        <Button variant="outline" size="sm" onClick={addHour}>
          <Plus className="w-4 h-4 mr-1" />
          Ajouter un créneau
        </Button>
        <Button size="sm" onClick={handleSave} disabled={saving}>
          {saving ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : null}
          Enregistrer
        </Button>
      </div>

      <ExceptionalHoursSection />
    </div>
  );
}
