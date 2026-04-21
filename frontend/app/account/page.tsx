"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import { useUserContext } from "@/contexts/user-context";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2 } from "lucide-react";

const API_URL = process.env.NEXT_PUBLIC_API_URL;

export default function AccountPage() {
  const router = useRouter();
  const supabase = createClient();

  const { refetch } = useUserContext();
  const [token, setToken] = useState<string | null>(null);
  const [email, setEmail] = useState<string | null>(null);
  const [form, setForm] = useState({
    fullName: "",
    phone: "",
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    const init = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        router.push("/login?redirect=/account");
        return;
      }
      setToken(session.access_token);
      setEmail(session.user.email ?? null);

      const res = await fetch(`${API_URL}/api/user/me`, {
        headers: { Authorization: `Bearer ${session.access_token}` },
      });
      if (res.ok) {
        const { data } = await res.json();
        setForm({
          fullName: data.fullName ?? "",
          phone: data.phone ?? "",
        });
      }
      setLoading(false);
    };
    init();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);
    setSuccess(false);

    const res = await fetch(`${API_URL}/api/user/me`, {
      method: "PUT",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(form),
    });

    if (res.ok) {
      setSuccess(true);
      refetch().catch(console.error); // met à jour le UserContext pour le prochain checkout
    } else {
      const { error } = await res.json();
      setError(error ?? "Une erreur est survenue");
    }
    setSaving(false);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-6 h-6 animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen p-4 max-w-md mx-auto">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Mon compte</h1>
        <Link href="/account/orders" className="text-sm underline text-[#676767]">
          Mes commandes
        </Link>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="space-y-1.5">
          <Label htmlFor="email">Email</Label>
          <Input
            id="email"
            value={email ?? ""}
            readOnly
            disabled
            autoComplete="email"
            className="text-[#676767]"
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="fullName">Nom complet</Label>
          <Input
            id="fullName"
            value={form.fullName}
            onChange={(e) => setForm({ ...form, fullName: e.target.value })}
            autoComplete="name"
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="phone">Téléphone</Label>
          <Input
            id="phone"
            value={form.phone}
            onChange={(e) => setForm({ ...form, phone: e.target.value })}
            autoComplete="tel"
          />
        </div>

        {error && <p className="text-sm text-red-500">{error}</p>}
        {success && <p className="text-sm text-green-600">Profil mis à jour.</p>}

        <Button type="submit" className="w-full" disabled={saving}>
          {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : "Enregistrer"}
        </Button>
      </form>
    </div>
  );
}
