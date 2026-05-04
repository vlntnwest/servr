"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { getStripeStatus, setRestaurantId } from "@/lib/api";
import { createClient } from "@/lib/supabase/client";
import { CheckCircle, Clock, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function StripeReturnPage() {
  const router = useRouter();
  const [chargesEnabled, setChargesEnabled] = useState<boolean | null>(null);
  const [loading, setLoading] = useState(true);
  const supabase = useMemo(() => createClient(), []);

  useEffect(() => {
    const init = async () => {
      // Restore RESTAURANT_ID from session (same pattern as admin page)
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

      const result = await getStripeStatus();
      if ("data" in result && result.data) {
        setChargesEnabled(result.data.chargesEnabled ?? false);
      }
      setLoading(false);
    };
    init();
  }, [supabase, router]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <div className="max-w-sm w-full text-center space-y-6">
        {chargesEnabled ? (
          <>
            <CheckCircle className="w-12 h-12 text-green-600 mx-auto" />
            <h1 className="text-xl font-bold">Stripe configuré avec succès</h1>
            <p className="text-sm text-muted-foreground">
              Votre restaurant peut maintenant accepter les paiements par carte.
            </p>
          </>
        ) : (
          <>
            <Clock className="w-12 h-12 text-amber-500 mx-auto" />
            <h1 className="text-xl font-bold">Configuration en cours...</h1>
            <p className="text-sm text-muted-foreground">
              Stripe est en train de vérifier vos informations. Cela peut prendre
              quelques minutes.
            </p>
          </>
        )}
        <Button onClick={() => router.push("/admin")}>
          Retour au tableau de bord
        </Button>
      </div>
    </div>
  );
}
