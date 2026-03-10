"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { User, LogOut } from "lucide-react";
import type { User as SupabaseUser } from "@supabase/supabase-js";

export default function AuthButton() {
  const [user, setUser] = useState<SupabaseUser | null>(null);
  const supabase = createClient();

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => setUser(user));

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });

    return () => subscription.unsubscribe();
  }, [supabase.auth]);

  if (user) {
    return (
      <button
        className="p-2 rounded-full hover:bg-black/5 transition-colors"
        onClick={() => supabase.auth.signOut()}
        aria-label="Se déconnecter"
      >
        <LogOut className="w-5 h-5 text-gray-600" />
      </button>
    );
  }

  return (
    <Button
      variant="ghost"
      size="icon"
      asChild
    >
      <a href="/login" aria-label="Se connecter">
        <User className="w-5 h-5" />
      </a>
    </Button>
  );
}
