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
        <h1 className="font-display text-card-label leading-none tracking-tighter mb-3 text-foreground">
          Vérifiez vos emails<span className="text-primary">.</span>
        </h1>
        <p className="text-body-sm text-muted-foreground">
          Un lien de confirmation vous a été envoyé à <strong>{email}</strong>.
        </p>
      </div>
    );
  }

  return (
    <div>
      <h1 className="font-display text-card-label leading-none tracking-tighter mb-6 text-foreground">
        Créer un compte<span className="text-primary">.</span>
      </h1>

      <div className="space-y-2 mb-5">
        <Button
          variant="outline"
          className="w-full"
          onClick={() => handleOAuth("google")}
          type="button"
        >
          Continuer avec Google
        </Button>
        <Button
          variant="outline"
          className="w-full"
          onClick={() => handleOAuth("apple")}
          type="button"
        >
          Continuer avec Apple
        </Button>
      </div>

      <div className="flex items-center gap-3 my-5">
        <div className="flex-1 border-t border-border" />
        <span className="font-sans font-medium text-caption uppercase tracking-eyebrow text-muted-foreground">
          ou
        </span>
        <div className="flex-1 border-t border-border" />
      </div>

      <form onSubmit={handleRegister} className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="email">E-mail</Label>
          <Input
            id="email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            autoComplete="email"
            placeholder="vous@exemple.com"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="password">Mot de passe</Label>
          <Input
            id="password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            autoComplete="new-password"
            minLength={6}
            placeholder="••••••••"
          />
        </div>

        {error && (
          <p className="text-body-sm text-destructive-foreground bg-destructive/90 rounded-md px-3 py-2">
            {error}
          </p>
        )}

        <Button type="submit" className="w-full" disabled={loading}>
          {loading ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            "Créer un compte"
          )}
        </Button>
      </form>

      <p className="text-center text-body-sm text-muted-foreground mt-5">
        Déjà un compte ?{" "}
        <Link
          href={`/login${redirectTo ? `?redirect=${encodeURIComponent(redirectTo)}` : ""}`}
          className="font-sans-medium text-foreground underline underline-offset-4"
        >
          Se connecter
        </Link>
      </p>
    </div>
  );
}

export default function RegisterPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="w-full max-w-sm px-7 pt-13 pb-10">
        <Link
          href="/"
          className="inline-block mb-8 font-display text-display-sm leading-none tracking-tighter text-foreground"
        >
          Servr<span className="text-primary">.</span>
        </Link>
        <Suspense
          fallback={
            <div className="rounded-card border border-brand-border bg-card h-48" />
          }
        >
          <RegisterForm />
        </Suspense>
      </div>
    </div>
  );
}
