"use client";

import { useEffect, useMemo } from "react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";

export default function AdminRedirectPage() {
  const router = useRouter();
  const supabase = useMemo(() => createClient(), []);

  useEffect(() => {
    const init = async () => {
      try {
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

        router.replace("/admin/create");
      } catch {
        router.replace("/admin/create");
      }
    };

    init();
  }, [supabase, router]);

  return (
    <div className="min-h-screen flex items-center justify-center">
      <Loader2 className="w-8 h-8 animate-spin text-primary" />
    </div>
  );
}
