"use client";

import { useEffect, useState } from "react";
import { getStats } from "@/lib/api";
import type { Stats } from "@/types/api";
import { Skeleton } from "@/components/ui/skeleton";
import { formatEuros } from "@/lib/utils";

type Period = "day" | "week" | "month";

export default function StatsTab() {
  const [period, setPeriod] = useState<Period>("month");
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    getStats(period).then((data) => {
      setStats(data);
      setLoading(false);
    });
  }, [period]);

  const periods: { value: Period; label: string }[] = [
    { value: "day", label: "Aujourd'hui" },
    { value: "week", label: "Cette semaine" },
    { value: "month", label: "Ce mois" },
  ];

  return (
    <div>
      <div className="flex gap-2 mb-6">
        {periods.map((p) => (
          <button
            key={p.value}
            className={`px-3 py-1.5 text-sm rounded-full border transition-colors ${
              period === p.value
                ? "bg-primary text-white border-primary"
                : "border-black/15 hover:border-primary hover:text-primary"
            }`}
            onClick={() => setPeriod(p.value)}
          >
            {p.label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="grid sm:grid-cols-2 gap-4">
          <Skeleton className="h-24 rounded-lg" />
          <Skeleton className="h-24 rounded-lg" />
          <Skeleton className="h-48 rounded-lg sm:col-span-2" />
        </div>
      ) : stats ? (
        <div className="grid sm:grid-cols-2 gap-4">
          <div className="bg-white border border-black/5 rounded-lg p-4">
            <p className="text-[#676767] text-sm">Commandes</p>
            <p className="text-3xl font-bold mt-1">{stats.totalOrders}</p>
          </div>
          <div className="bg-white border border-black/5 rounded-lg p-4">
            <p className="text-[#676767] text-sm">Chiffre d&apos;affaires</p>
            <p className="text-3xl font-bold mt-1">{formatEuros(stats.revenue)}</p>
          </div>

          {stats.popularProducts.length > 0 && (
            <div className="bg-white border border-black/5 rounded-lg p-4 sm:col-span-2">
              <h3 className="font-bold mb-3">Produits populaires</h3>
              <div className="space-y-2">
                {stats.popularProducts.map((p, i) => (
                  <div key={i} className="flex justify-between items-center">
                    <div className="flex items-center gap-2">
                      <span className="text-[#676767] text-sm w-5">{i + 1}.</span>
                      <span className="text-sm">{p.name}</span>
                    </div>
                    <span className="text-sm font-semibold text-[#676767]">
                      {p.count} vendus
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      ) : (
        <p className="text-[#676767]">Aucune donnée disponible</p>
      )}
    </div>
  );
}
