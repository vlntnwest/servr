"use client";

import { useEffect, useRef, useState } from "react";
import {
  getRestaurant,
  getStripeStatus,
  initiateStripeOnboarding,
  uploadImage,
  deleteImage,
  updateRestaurant,
  cleanupDraftOrders,
} from "@/lib/api";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  CheckCircle,
  Clock,
  AlertCircle,
  Loader2,
  Upload,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type StripeStatus = {
  connected: boolean;
  chargesEnabled?: boolean;
  detailsSubmitted?: boolean;
};

// ── Restaurant image section ──────────────────────────────────────────────────

function RestaurantImageSection() {
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    getRestaurant().then((r) => {
      if (r) setImageUrl(r.imageUrl);
      setLoading(false);
    });
  }, []);

  const handleFile = async (file: File) => {
    if (!file.type.match(/^image\//)) {
      setError("Format non supporté. Utilisez JPEG, PNG ou WebP.");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setError("Fichier trop volumineux (max 5 MB)");
      return;
    }
    setError(null);
    setSuccess(false);
    setUploading(true);
    const url = await uploadImage(file);
    if (!url) {
      setError("Erreur lors de l'upload de l'image");
      setUploading(false);
      return;
    }
    const result = await updateRestaurant({ imageUrl: url });
    setUploading(false);
    if ("error" in result) {
      setError(result.error);
    } else {
      setImageUrl(url);
      setSuccess(true);
    }
  };

  const handleRemove = async () => {
    if (!imageUrl) return;
    setError(null);
    setSuccess(false);
    await deleteImage(imageUrl).catch(console.error);
    const result = await updateRestaurant({ imageUrl: null });
    if ("error" in result) {
      setError(result.error);
    } else {
      setImageUrl(null);
      setSuccess(true);
    }
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-6">
        <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="py-6 max-w-xl border-b border-black/10 mb-6">
      <h2 className="text-lg font-semibold mb-1">Image de présentation</h2>
      <p className="text-sm text-muted-foreground mb-4">
        Ajoutez une photo qui sera affichée en en-tête de votre restaurant.
      </p>

      {error && (
        <div className="flex items-center gap-2 text-destructive text-sm mb-3">
          <AlertCircle className="w-4 h-4 shrink-0" />
          {error}
        </div>
      )}
      {success && (
        <div className="flex items-center gap-2 text-brand-forest text-sm mb-3">
          <CheckCircle className="w-4 h-4 shrink-0" />
          Image mise à jour.
        </div>
      )}

      {imageUrl ? (
        <div className="relative w-full aspect-[16/9] rounded-lg overflow-hidden border border-black/10">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={imageUrl}
            alt="Image du restaurant"
            className="w-full h-full object-cover"
          />
          <button
            type="button"
            onClick={handleRemove}
            className="absolute top-2 right-2 p-1 bg-black/60 rounded-full hover:bg-black/80 transition-colors"
            aria-label="Supprimer l'image"
          >
            <X className="w-3.5 h-3.5 text-white" />
          </button>
        </div>
      ) : (
        <div
          onDragOver={(e) => {
            e.preventDefault();
            setDragOver(true);
          }}
          onDragLeave={() => setDragOver(false)}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
          className={cn(
            "flex flex-col items-center justify-center w-full aspect-[16/9] rounded-lg border-2 border-dashed cursor-pointer transition-colors",
            dragOver
              ? "border-primary bg-primary/5"
              : "border-border hover:border-primary/50 hover:bg-muted",
          )}
        >
          {uploading ? (
            <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
          ) : (
            <>
              <Upload className="w-6 h-6 text-muted-foreground mb-1" />
              <p className="text-xs text-muted-foreground">
                Glissez une image ou{" "}
                <span className="text-primary font-medium">cliquez</span>
              </p>
              <p className="text-[10px] text-muted-foreground mt-0.5">
                JPEG, PNG, WebP · max 5 MB · ratio 16:9 recommandé
              </p>
            </>
          )}
          <input
            ref={fileInputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) handleFile(file);
              e.target.value = "";
            }}
          />
        </div>
      )}
    </div>
  );
}

// ── Maintenance section ───────────────────────────────────────────────────────

function MaintenanceSection() {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{ deletedCount: number } | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleCleanup = async () => {
    setLoading(true);
    setError(null);
    const res = await cleanupDraftOrders();
    setLoading(false);
    if ("data" in res && res.data) {
      setResult(res.data);
    } else {
      setError(res.error ?? "Erreur lors du nettoyage");
    }
  };

  const handleClose = () => {
    setOpen(false);
    setResult(null);
    setError(null);
  };

  return (
    <div className="py-6 max-w-xl border-t border-black/10 mt-6">
      <h2 className="text-lg font-semibold mb-1">Maintenance</h2>
      <p className="text-sm text-muted-foreground mb-4">
        Outils de nettoyage et d&apos;administration de la plateforme.
      </p>

      <div className="flex items-center justify-between rounded-lg border border-black/10 px-4 py-3">
        <div>
          <p className="text-sm font-medium">Commandes abandonnées</p>
          <p className="text-xs text-muted-foreground mt-0.5">
            Supprime les commandes non finalisées de plus de 24h.
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={() => setOpen(true)}>
          Nettoyer
        </Button>
      </div>

      <Dialog open={open} onOpenChange={handleClose}>
        <DialogContent>
          <DialogHeader className="items-start">
            <DialogTitle>Nettoyer les commandes abandonnées</DialogTitle>
            <DialogDescription className="pt-2 space-y-2">
              <span className="block">
                Cette action supprime définitivement toutes les commandes en
                statut <strong>DRAFT</strong> créées il y a plus de 24 heures.
              </span>
              <span className="block">
                Ces commandes correspondent à des paniers initiés mais jamais
                finalisés (paiement abandonné, onglet fermé…). Elles ne sont
                jamais visibles par les clients et n&apos;ont aucun impact sur
                votre activité.
              </span>
            </DialogDescription>
          </DialogHeader>

          {result && (
            <div className="flex items-center gap-2 text-brand-forest bg-brand-forest/10 border border-brand-forest/20 rounded-lg px-4 py-3 text-sm">
              <CheckCircle className="w-4 h-4 shrink-0" />
              {result.deletedCount === 0
                ? "Aucune commande abandonnée à supprimer."
                : `${result.deletedCount} commande${result.deletedCount > 1 ? "s" : ""} supprimée${result.deletedCount > 1 ? "s" : ""}.`}
            </div>
          )}

          {error && (
            <div className="flex items-center gap-2 text-destructive text-sm">
              <AlertCircle className="w-4 h-4 shrink-0" />
              {error}
            </div>
          )}

          <div className="flex justify-end px-4 pb-4 gap-2 mt-2">
            <Button variant="outline" onClick={handleClose} disabled={loading}>
              {result ? "Fermer" : "Annuler"}
            </Button>
            {!result && (
              <Button
                variant="destructive"
                onClick={handleCleanup}
                disabled={loading}
              >
                {loading && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
                Confirmer le nettoyage
              </Button>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ── Stripe section ────────────────────────────────────────────────────────────

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
          ? (result.error ?? "Erreur lors de la connexion Stripe")
          : "Erreur lors de la connexion Stripe",
      );
      setConnecting(false);
    }
  };

  return (
    <div>
      <RestaurantImageSection />

      <div className="py-6 max-w-xl">
        <h2 className="text-lg font-semibold mb-1">Paiements par carte</h2>
        <p className="text-sm text-muted-foreground mb-6">
          Connectez un compte Stripe pour accepter les paiements par carte
          bancaire.
        </p>

        {error && (
          <div className="flex items-center gap-2 text-destructive text-sm mb-4">
            <AlertCircle className="w-4 h-4 shrink-0" />
            {error}
          </div>
        )}

        {loading && (
          <div className="flex items-center justify-center py-6">
            <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
          </div>
        )}

        {!loading && !status?.connected && (
          <Button onClick={handleConnect} disabled={connecting}>
            {connecting && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
            Connecter Stripe
          </Button>
        )}

        {!loading && status?.connected && status.chargesEnabled && (
          <div className="flex items-center gap-2 text-brand-forest bg-brand-forest/10 border border-brand-forest/20 rounded-lg px-4 py-3">
            <CheckCircle className="w-5 h-5 shrink-0" />
            <span className="text-sm font-medium">
              Paiements par carte activés
            </span>
          </div>
        )}

        {!loading && status?.connected && !status.chargesEnabled && (
          <div className="space-y-4">
            <div className="flex items-center gap-2 text-brand-yellow bg-brand-yellow/20 border border-brand-yellow/40 rounded-lg px-4 py-3">
              <Clock className="w-5 h-5 shrink-0" />
              <span className="text-sm font-medium">
                En attente de validation Stripe
              </span>
            </div>
            <Button
              variant="outline"
              onClick={handleConnect}
              disabled={connecting}
            >
              {connecting && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
              Continuer la configuration
            </Button>
          </div>
        )}
      </div>

      <MaintenanceSection />
    </div>
  );
}
