"use client";

import { useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import { initiateStripeOnboarding, setRestaurantId } from "@/lib/api";
import { createClient } from "@/lib/supabase/client";
import { Loader2 } from "lucide-react";

export default function StripeRefreshPage() {
  const router = useRouter();
  const supabase = useMemo(() => createClient(), []);

  useEffect(() => {
    const refresh = async () => {
      // Restore RESTAURANT_ID from session
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!session) {
        router.push("/login");
        return;
      }
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/api/v1/user/me`,
        { headers: { Authorization: `Bearer ${session.access_token}` } },
      );
      if (res.ok) {
        const { data } = await res.json();
        const restaurantId = data.restaurants?.[0]?.id;
        if (restaurantId) setRestaurantId(restaurantId);
      }

      const result = await initiateStripeOnboarding();
      if ("data" in result && result.data?.url) {
        window.location.href = result.data.url;
      } else {
        // Fallback: go to admin settings
        router.push("/admin");
      }
    };
    refresh();
  }, [supabase, router]);

  return (
    <div className="min-h-screen flex items-center justify-center">
      <Loader2 className="w-8 h-8 animate-spin text-primary" />
    </div>
  );
}
