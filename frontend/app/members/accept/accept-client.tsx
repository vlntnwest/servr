"use client";

import { useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Loader2, CheckCircle, XCircle } from "lucide-react";

export default function AcceptInvitationClient() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const token = searchParams.get("token");

  const [status, setStatus] = useState<"loading" | "success" | "error" | "idle">("idle");
  const [message, setMessage] = useState("");

  const handleAccept = async () => {
    if (!token) {
      setStatus("error");
      setMessage("Token d'invitation manquant.");
      return;
    }

    setStatus("loading");

    const supabase = createClient();
    const {
      data: { session },
    } = await supabase.auth.getSession();

    if (!session) {
      router.push(`/login?redirect=/members/accept?token=${token}`);
      return;
    }

    const res = await fetch(
      `${process.env.NEXT_PUBLIC_API_URL}/api/v1/members/accept`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ token }),
      }
    );

    const json = await res.json();
    if (res.ok) {
      setStatus("success");
      setMessage("Invitation acceptée ! Vous êtes maintenant membre.");
    } else {
      setStatus("error");
      setMessage(json.error ?? "Erreur lors de l'acceptation.");
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="text-center max-w-sm">
        {status === "idle" && (
          <>
            <h1 className="text-2xl font-bold mb-4">Invitation</h1>
            <p className="text-[#676767] mb-6">
              Vous avez été invité à rejoindre un restaurant.
            </p>
            <Button onClick={handleAccept} className="w-full">
              Accepter l&apos;invitation
            </Button>
          </>
        )}
        {status === "loading" && (
          <Loader2 className="w-8 h-8 animate-spin mx-auto text-primary" />
        )}
        {status === "success" && (
          <>
            <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
            <p className="font-semibold">{message}</p>
            <Button asChild className="mt-4">
              <a href="/admin">Accéder au tableau de bord</a>
            </Button>
          </>
        )}
        {status === "error" && (
          <>
            <XCircle className="w-16 h-16 text-red-400 mx-auto mb-4" />
            <p className="text-red-600">{message}</p>
          </>
        )}
      </div>
    </div>
  );
}
