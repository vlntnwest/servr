"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import OrdersTab from "@/components/admin/orders-tab";
import StatsTab from "@/components/admin/stats-tab";
import MembersTab from "@/components/admin/members-tab";
import OpeningHoursTab from "@/components/admin/opening-hours-tab";
import ProductsTab from "@/components/admin/products-tab";
import Image from "next/image";
import { LogOut, Loader2 } from "lucide-react";
import type { User } from "@supabase/supabase-js";

export default function AdminPage() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const supabase = createClient();

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) {
        router.push("/login");
      } else {
        setUser(user);
        setLoading(false);
      }
    });
  }, [supabase, router]);

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
          <span className="text-sm text-[#676767] mr-3 hidden sm:block">
            {user?.email}
          </span>
          <button
            className="p-2 hover:bg-black/5 rounded-full transition-colors"
            onClick={() => supabase.auth.signOut().then(() => router.push("/login"))}
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
        </Tabs>
      </main>
    </div>
  );
}
