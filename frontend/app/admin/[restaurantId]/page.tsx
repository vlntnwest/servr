"use client";

import { useEffect, useState, use } from "react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { setRestaurantId } from "@/lib/api";
import OrdersTab from "@/components/admin/orders-tab";
import StatsTab from "@/components/admin/stats-tab";
import MembersTab from "@/components/admin/members-tab";
import OpeningHoursTab from "@/components/admin/opening-hours-tab";
import ProductsTab from "@/components/admin/products-tab";
import SettingsTab from "@/components/admin/settings-tab";
import Image from "next/image";
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
        className="flex items-center gap-1 text-sm font-medium text-[#676767] hover:text-black transition-colors px-2 py-1 rounded hover:bg-black/5"
        aria-haspopup="listbox"
        aria-expanded={open}
      >
        {current?.name ?? currentId}
        <ChevronDown className="w-4 h-4" />
      </button>

      {open && (
        <ul
          role="listbox"
          className="absolute right-0 mt-1 min-w-[180px] bg-white border border-black/10 rounded-lg shadow-lg z-50 py-1"
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
                className={`w-full text-left px-4 py-2 text-sm hover:bg-black/5 transition-colors ${
                  r.id === currentId ? "font-semibold text-black" : "text-[#676767]"
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
        meData.restaurantMembers?.map(
          (m: { restaurantId: string }) => m.restaurantId,
        ) ?? [];

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
      <header className="sticky top-0 z-40 bg-white border-b border-black/8">
        <div className="flex items-center h-[65px] px-4 max-w-screen-xl mx-auto">
          <div className="flex-1">
            <Image
              src="https://g10afdaataaj4tkl.public.blob.vercel-storage.com/img/1Fichier-21.svg"
              alt="Pokey Bar"
              width={80}
              height={32}
              className="object-contain"
            />
          </div>

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

          <span className="text-sm text-[#676767] mr-3 hidden sm:block">
            {user?.email}
          </span>
          <button
            className="p-2 hover:bg-black/5 rounded-full transition-colors"
            onClick={() =>
              supabase.auth.signOut().then(() => router.push("/login"))
            }
            aria-label="Se déconnecter"
          >
            <LogOut className="w-5 h-5 text-[#676767]" />
          </button>
        </div>
      </header>

      <main className="max-w-screen-xl mx-auto px-4 py-6">
        <h1 className="text-2xl font-bold mb-6">Tableau de bord</h1>

        <Tabs defaultValue="orders">
          <TabsList className="mb-0">
            <TabsTrigger value="orders">Commandes</TabsTrigger>
            <TabsTrigger value="stats">Statistiques</TabsTrigger>
            <TabsTrigger value="products">Produits</TabsTrigger>
            <TabsTrigger value="members">Membres</TabsTrigger>
            <TabsTrigger value="hours">Horaires</TabsTrigger>
            <TabsTrigger value="settings">Paramètres</TabsTrigger>
          </TabsList>

          <TabsContent value="orders">
            <OrdersTab />
          </TabsContent>
          <TabsContent value="stats">
            <StatsTab />
          </TabsContent>
          <TabsContent value="products">
            <ProductsTab />
          </TabsContent>
          <TabsContent value="members">
            <MembersTab />
          </TabsContent>
          <TabsContent value="hours">
            <OpeningHoursTab />
          </TabsContent>
          <TabsContent value="settings">
            <SettingsTab />
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}
