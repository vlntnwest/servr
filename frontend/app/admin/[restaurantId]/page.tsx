"use client";

import { useEffect, useState, use } from "react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { setRestaurantId } from "@/lib/api";
import OrdersTab from "@/components/admin/orders-tab";
import StatsTab from "@/components/admin/stats-tab";
import OpeningHoursTab from "@/components/admin/opening-hours-tab";
import ProductsTab from "@/components/admin/products-tab";
import SettingsTab from "@/components/admin/settings-tab";
import PromoCodesTab from "@/components/admin/promo-codes-tab";
import Link from "next/link";
import { LogOut, Loader2, ChevronDown } from "lucide-react";
import type { User } from "@supabase/supabase-js";

interface RestaurantInfo {
  id: string;
  name: string;
}

// ── Restaurant selector ───────────────────────────────────────────────────────

function RestaurantSelector({
  restaurants,
  currentId,
  onSelect,
}: {
  restaurants: RestaurantInfo[];
  currentId: string;
  onSelect: (id: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const current = restaurants.find((r) => r.id === currentId);

  return (
    <div className="relative">
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-1 font-sans-medium text-body-sm text-muted-foreground hover:text-foreground transition-colors px-3 py-1.5 rounded-pill hover:bg-secondary"
        aria-haspopup="listbox"
        aria-expanded={open}
      >
        {current?.name ?? currentId}
        <ChevronDown className="w-4 h-4" />
      </button>

      {open && (
        <ul
          role="listbox"
          className="absolute right-0 mt-1 min-w-[180px] bg-background border border-brand-border rounded-card shadow-lg shadow-black/10 z-50 py-1"
        >
          {restaurants.map((r) => (
            <li key={r.id}>
              <button
                role="option"
                aria-selected={r.id === currentId}
                onClick={() => {
                  setOpen(false);
                  if (r.id !== currentId) onSelect(r.id);
                }}
                className={`w-full text-left px-4 py-2 text-body-sm hover:bg-secondary transition-colors ${
                  r.id === currentId ? "font-semibold text-foreground" : "text-muted-foreground"
                }`}
              >
                {r.name}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function AdminRestaurantPage({
  params,
}: {
  params: Promise<{ restaurantId: string }>;
}) {
  const { restaurantId } = use(params);
  const router = useRouter();
  const supabase = createClient();

  const [user, setUser] = useState<User | null>(null);
  const [restaurants, setRestaurants] = useState<RestaurantInfo[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const init = async () => {
      // 1. Auth guard
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session) {
        router.replace("/login");
        return;
      }

      setUser(session.user);
      const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "";

      // 2. Fetch user membership list
      const meRes = await fetch(`${API_URL}/api/v1/user/me`, {
        headers: { Authorization: `Bearer ${session.access_token}` },
      });

      if (!meRes.ok) {
        router.replace("/admin");
        return;
      }

      const { data: meData } = await meRes.json();
      const memberIds: string[] =
        meData.restaurants?.map((r: { id: string }) => r.id) ?? [];

      // 3. Validate that the user is a member of the requested restaurantId
      if (!memberIds.includes(restaurantId)) {
        router.replace("/admin");
        return;
      }

      // 4. Wire up the global RESTAURANT_ID used by lib/api.ts
      setRestaurantId(restaurantId);

      // 5. Fetch restaurant names concurrently (for selector)
      const restaurantDetails = await Promise.all(
        memberIds.map(async (id) => {
          const res = await fetch(`${API_URL}/api/v1/restaurants/${id}`, {
            headers: { Authorization: `Bearer ${session.access_token}` },
          });
          const json = await res.json();
          return (json.data as RestaurantInfo) ?? { id, name: id };
        }),
      );

      setRestaurants(restaurantDetails);
      setLoading(false);
    };

    init();
  }, [restaurantId, supabase, router]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      {/* Admin header */}
      <header className="sticky top-0 z-40 bg-background/85 backdrop-blur-md border-b border-border">
        <div className="flex items-center h-16 px-5 max-w-screen-xl mx-auto">
          <Link
            href="/admin"
            className="flex-1 font-display text-logo-sm leading-none tracking-tighter text-foreground"
          >
            Servr<span className="text-primary">.</span>
          </Link>

          {/* Restaurant selector — only shown when user has >1 restaurant */}
          {restaurants.length > 1 && (
            <div className="mr-4">
              <RestaurantSelector
                restaurants={restaurants}
                currentId={restaurantId}
                onSelect={(id) => router.push(`/admin/${id}`)}
              />
            </div>
          )}

          <span className="text-action text-muted-foreground mr-3 hidden sm:block">
            {user?.email}
          </span>
          <button
            className="p-2 hover:bg-secondary rounded-full transition-colors"
            onClick={() =>
              supabase.auth.signOut().then(() => router.push("/login"))
            }
            aria-label="Se déconnecter"
          >
            <LogOut className="w-5 h-5 text-muted-foreground" />
          </button>
        </div>
      </header>

      <main className="max-w-screen-xl mx-auto px-5 py-8">
        <h1 className="font-display text-display-sm tracking-tighter leading-none mb-8 text-foreground">
          Tableau de bord<span className="text-primary">.</span>
        </h1>

        <Tabs defaultValue="orders">
          <TabsList className="mb-0">
            <TabsTrigger value="orders">Commandes</TabsTrigger>
            <TabsTrigger value="stats">Statistiques</TabsTrigger>
            <TabsTrigger value="products">Produits</TabsTrigger>
            <TabsTrigger value="hours">Horaires</TabsTrigger>
            <TabsTrigger value="promos">Codes promo</TabsTrigger>
            <TabsTrigger value="settings">Paramètres</TabsTrigger>
          </TabsList>

          <TabsContent value="orders">
            <OrdersTab restaurantId={restaurantId} />
          </TabsContent>
          <TabsContent value="stats">
            <StatsTab />
          </TabsContent>
          <TabsContent value="products">
            <ProductsTab />
          </TabsContent>
          <TabsContent value="hours">
            <OpeningHoursTab />
          </TabsContent>
          <TabsContent value="promos">
            <PromoCodesTab />
          </TabsContent>
          <TabsContent value="settings">
            <SettingsTab />
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}
