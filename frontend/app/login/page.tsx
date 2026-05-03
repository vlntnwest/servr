"use client";

import { Suspense, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { Label } from "@/components/ui/label";
import { Loader2 } from "lucide-react";
import { isSafeRedirect } from "@/lib/redirectUtils";
import { cn } from "@/lib/utils";

type Field = "email" | "password" | null;

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const supabase = createClient();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [focused, setFocused] = useState<Field>(null);
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const redirectTo = searchParams.get("redirect");
  const reason = searchParams.get("reason");
  const destination = isSafeRedirect(redirectTo) ? redirectTo : "/";

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      setError(error.message);
      setLoading(false);
    } else {
      router.push(destination);
      router.refresh();
    }
  };

  const fieldClass = (name: Exclude<Field, null>) =>
    cn(
      "w-full rounded-xl px-4 py-3.5 text-body font-sans text-foreground border-hairline outline-none transition-all placeholder:text-brand-stone/50",
      focused === name
        ? "bg-background border-foreground"
        : "bg-background/50 border-border"
    );

  return (
    <form onSubmit={handleLogin} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="email">E-mail</Label>
        <input
          id="email"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          onFocus={() => setFocused("email")}
          onBlur={() => setFocused(null)}
          required
          autoComplete="email"
          placeholder="vous@exemple.com"
          className={fieldClass("email")}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="password">Mot de passe</Label>
        <div className="relative">
          <input
            id="password"
            type={showPass ? "text" : "password"}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            onFocus={() => setFocused("password")}
            onBlur={() => setFocused(null)}
            required
            autoComplete="current-password"
            placeholder="••••••••"
            className={cn(fieldClass("password"), "pr-16")}
          />
          <button
            type="button"
            onClick={() => setShowPass((s) => !s)}
            className="absolute inset-y-0 right-3 flex items-center font-sans font-medium text-action text-muted-foreground hover:text-foreground transition-colors"
          >
            {showPass ? "Masquer" : "Voir"}
          </button>
        </div>
      </div>

      <div className="flex justify-end">
        <button
          type="button"
          className="font-sans font-medium text-action text-muted-foreground hover:text-foreground transition-colors"
        >
          Mot de passe oublié ?
        </button>
      </div>

      {reason === "session_expired" && !error && (
        <p className="text-body-sm text-foreground bg-brand-yellow/40 rounded-md px-3 py-2">
          Session expirée, veuillez vous reconnecter.
        </p>
      )}
      {error && (
        <p className="text-body-sm text-destructive-foreground bg-destructive/90 rounded-md px-3 py-2">
          {error}
        </p>
      )}

      <button
        type="submit"
        disabled={loading}
        className="mt-2 w-full inline-flex items-center justify-center rounded-pill bg-foreground text-background h-12 font-sans font-medium text-body tracking-cta hover:opacity-90 disabled:opacity-60 transition-opacity shadow-sm shadow-black/5"
      >
        {loading ? (
          <Loader2 className="w-4 h-4 animate-spin" />
        ) : (
          "Se connecter"
        )}
      </button>

      <p className="text-center text-body-sm text-muted-foreground pt-2">
        Pas encore de compte ?{" "}
        <Link
          href={`/register${redirectTo ? `?redirect=${encodeURIComponent(redirectTo)}` : ""}`}
          className="font-sans-medium text-foreground underline underline-offset-4"
        >
          S&apos;inscrire
        </Link>
      </p>
    </form>
  );
}

export default function LoginPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="w-full max-w-sm px-7 pt-13 pb-10">
        <div className="mb-2">
          <h1 className="font-display text-display-sm leading-none tracking-tighter text-foreground">
            Servr<span className="text-primary">.</span>
          </h1>
        </div>
        <p className="mb-10 font-sans text-body-sm text-muted-foreground">
          Vos commandes, toujours à portée.
        </p>

        <Suspense
          fallback={
            <div className="rounded-card border border-brand-border bg-card h-48" />
          }
        >
          <LoginForm />
        </Suspense>
      </div>
    </div>
  );
}
