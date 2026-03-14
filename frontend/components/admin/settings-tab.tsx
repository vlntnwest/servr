"use client";

import { useEffect, useState } from "react";
import { getStripeStatus, initiateStripeOnboarding } from "@/lib/api";
import { CheckCircle, Clock, AlertCircle, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";

type StripeStatus = {
  connected: boolean;
  chargesEnabled?: boolean;
  detailsSubmitted?: boolean;
};

export default function SettingsTab() {
  const [status, setStatus] = useState<StripeStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [connecting, setConnecting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchStatus = async () => {
      setLoading(true);
      const result = await getStripeStatus();
      if ("data" in result && result.data) {
        setStatus(result.data);
      } else if ("error" in result) {
        setError(result.error ?? "Erreur lors de la récupération du statut");
      }
      setLoading(false);
    };
    fetchStatus();
  }, []);

  const handleConnect = async () => {
    setConnecting(true);
    setError(null);
    const result = await initiateStripeOnboarding();
    if ("data" in result && result.data?.url) {
      window.location.href = result.data.url;
    } else {
      setError(
        "error" in result
          ? result.error ?? "Erreur lors de la connexion Stripe"
          : "Erreur lors de la connexion Stripe",
      );
      setConnecting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="py-6 max-w-xl">
      <h2 className="text-lg font-semibold mb-1">Paiements par carte</h2>
      <p className="text-sm text-muted-foreground mb-6">
        Connectez un compte Stripe pour accepter les paiements par carte bancaire.
      </p>

      {error && (
        <div className="flex items-center gap-2 text-destructive text-sm mb-4">
          <AlertCircle className="w-4 h-4 shrink-0" />
          {error}
        </div>
      )}

      {!status?.connected && (
        <Button onClick={handleConnect} disabled={connecting}>
          {connecting && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
          Connecter Stripe
        </Button>
      )}

      {status?.connected && status.chargesEnabled && (
        <div className="flex items-center gap-2 text-green-700 bg-green-50 border border-green-200 rounded-lg px-4 py-3">
          <CheckCircle className="w-5 h-5 shrink-0" />
          <span className="text-sm font-medium">Paiements par carte activés</span>
        </div>
      )}

      {status?.connected && !status.chargesEnabled && (
        <div className="space-y-4">
          <div className="flex items-center gap-2 text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-4 py-3">
            <Clock className="w-5 h-5 shrink-0" />
            <span className="text-sm font-medium">
              En attente de validation Stripe
            </span>
          </div>
          <Button variant="outline" onClick={handleConnect} disabled={connecting}>
            {connecting && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
            Continuer la configuration
          </Button>
        </div>
      )}
    </div>
  );
}
