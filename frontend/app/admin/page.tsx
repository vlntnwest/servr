"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";

export default function AdminRedirectPage() {
  const router = useRouter();
  const supabase = createClient();
  const [noRestaurant, setNoRestaurant] = useState(false);

  useEffect(() => {
    const init = async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session) {
        router.replace("/login");
        return;
      }

      const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/api/v1/user/me`,
        { headers: { Authorization: `Bearer ${session.access_token}` } },
      );

      if (res.ok) {
        const { data } = await res.json();
        const firstId = data.restaurants?.[0]?.id;
        if (firstId) {
          router.replace(`/admin/${firstId}`);
          return;
        }
      }

      setNoRestaurant(true);
    };

    init();
  }, [supabase, router]);

  if (noRestaurant) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-[#676767]">Aucun restaurant trouvé.</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center">
      <Loader2 className="w-8 h-8 animate-spin text-primary" />
    </div>
  );
}
