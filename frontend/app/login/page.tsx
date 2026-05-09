"use client";

import { Suspense, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useRouter, useSearchParams } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2 } from "lucide-react";
import { isSafeRedirect } from "@/lib/redirectUtils";

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const supabase = createClient();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const redirectTo = searchParams.get("redirect");
  const reason = searchParams.get("reason");
  const destination = isSafeRedirect(redirectTo) ? redirectTo : "/";

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const { error } = await supabase.auth.signInWithPassword({ email, password });

    if (error) {
      setError(error.message);
      setLoading(false);
    } else {
      router.push(destination);
      router.refresh();
    }
  };

  return (
    <div className="bg-white border border-brand-border rounded-lg p-6">
      <h1 className="text-xl font-bold mb-4">Connexion</h1>

      <form onSubmit={handleLogin} className="space-y-4">
        <div className="space-y-1.5">
          <Label htmlFor="email">Email</Label>
          <Input
            id="email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            autoComplete="email"
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="password">Mot de passe</Label>
          <Input
            id="password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            autoComplete="current-password"
          />
        </div>

        {reason === "session_expired" && !error && (
        <p className="text-sm text-brand-yellow bg-brand-yellow/20 rounded p-2">
          Session expirée, veuillez vous reconnecter.
        </p>
      )}
      {error && <p className="text-sm text-destructive">{error}</p>}

        <Button type="submit" className="w-full" disabled={loading}>
          {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Se connecter"}
        </Button>
      </form>

      <p className="text-center text-sm text-muted-foreground mt-4">
        Pas encore de compte ?{" "}
        <Link
          href={`/register${redirectTo ? `?redirect=${encodeURIComponent(redirectTo)}` : ""}`}
          className="underline"
        >
          S&apos;inscrire
        </Link>
      </p>
    </div>
  );
}

export default function LoginPage() {
  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <Image
            src="https://g10afdaataaj4tkl.public.blob.vercel-storage.com/img/1Fichier-21.svg"
            alt="Pokey Bar"
            width={160}
            height={60}
            className="mx-auto"
          />
        </div>
        <Suspense fallback={<div className="bg-white border border-brand-border rounded-lg p-6 h-48" />}>
          <LoginForm />
        </Suspense>
      </div>
    </div>
  );
}
