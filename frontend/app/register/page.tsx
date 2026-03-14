"use client";

import { Suspense, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2 } from "lucide-react";
import { isSafeRedirect } from "@/lib/redirectUtils";

function RegisterForm() {
  const searchParams = useSearchParams();
  const supabase = createClient();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const redirectTo = searchParams.get("redirect");
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "";
  const callbackUrl = `${siteUrl}/auth/callback${isSafeRedirect(redirectTo) ? `?redirect=${encodeURIComponent(redirectTo)}` : ""}`;

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: { emailRedirectTo: callbackUrl },
    });

    if (error) {
      setError(error.message);
      setLoading(false);
    } else {
      setSuccess(true);
    }
  };

  const handleOAuth = async (provider: "google" | "apple") => {
    await supabase.auth.signInWithOAuth({
      provider,
      options: { redirectTo: callbackUrl },
    });
  };

  if (success) {
    return (
      <div className="text-center">
        <h1 className="text-xl font-bold mb-2">Vérifiez vos emails</h1>
        <p className="text-[#676767]">
          Un lien de confirmation vous a été envoyé à <strong>{email}</strong>.
        </p>
      </div>
    );
  }

  return (
    <div className="bg-white border border-black/5 rounded-lg p-6">
      <h1 className="text-xl font-bold mb-4">Créer un compte</h1>

      <div className="space-y-2 mb-4">
        <Button variant="outline" className="w-full" onClick={() => handleOAuth("google")} type="button">
          Continuer avec Google
        </Button>
        <Button variant="outline" className="w-full" onClick={() => handleOAuth("apple")} type="button">
          Continuer avec Apple
        </Button>
      </div>

      <div className="flex items-center gap-2 my-4">
        <div className="flex-1 border-t" />
        <span className="text-xs text-[#676767]">ou</span>
        <div className="flex-1 border-t" />
      </div>

      <form onSubmit={handleRegister} className="space-y-4">
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
            autoComplete="new-password"
            minLength={6}
          />
        </div>

        {error && <p className="text-sm text-red-500">{error}</p>}

        <Button type="submit" className="w-full" disabled={loading}>
          {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Créer un compte"}
        </Button>
      </form>

      <p className="text-center text-sm text-[#676767] mt-4">
        Déjà un compte ?{" "}
        <Link
          href={`/login${redirectTo ? `?redirect=${encodeURIComponent(redirectTo)}` : ""}`}
          className="underline"
        >
          Se connecter
        </Link>
      </p>
    </div>
  );
}

export default function RegisterPage() {
  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="w-full max-w-sm">
        <Suspense fallback={<div className="bg-white border border-black/5 rounded-lg p-6 h-48" />}>
          <RegisterForm />
        </Suspense>
      </div>
    </div>
  );
}
