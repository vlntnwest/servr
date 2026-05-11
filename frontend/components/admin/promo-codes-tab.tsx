"use client";

import { useEffect, useState, useCallback } from "react";
import { getPromoCodes, createPromoCode, deletePromoCode } from "@/lib/api";
import type { PromoCode } from "@/types/api";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { cn, formatEuros } from "@/lib/utils";
import { Plus, Trash2, Tag, Loader2 } from "lucide-react";
import dayjs from "dayjs";
import "dayjs/locale/fr";

dayjs.locale("fr");

export default function PromoCodesTab() {
  const [codes, setCodes] = useState<PromoCode[]>([]);
  const [loading, setLoading] = useState(true);
  const [createOpen, setCreateOpen] = useState(false);

  const loadCodes = useCallback(async () => {
    setLoading(true);
    const data = await getPromoCodes();
    setCodes(data);
    setLoading(false);
  }, []);

  useEffect(() => {
    loadCodes();
  }, [loadCodes]);

  const handleDelete = async (id: string) => {
    await deletePromoCode(id);
    await loadCodes();
  };

  if (loading) {
    return (
      <div className="space-y-2 pt-4">
        {[1, 2, 3].map((i) => (
          <Skeleton key={i} className="h-16 rounded-lg" />
        ))}
      </div>
    );
  }

  return (
    <div className="pt-4">
      <div className="flex items-center justify-between mb-4">
        <p className="text-sm text-muted-foreground">
          {codes.length} code{codes.length !== 1 ? "s" : ""} promo
        </p>
        <Button onClick={() => setCreateOpen(true)}>
          <Plus className="w-4 h-4 mr-1" />
          Créer un code
        </Button>
      </div>

      {codes.length === 0 ? (
        <div className="text-center py-16 border-2 border-dashed border-black/10 rounded-xl">
          <Tag className="w-10 h-10 text-muted-foreground/40 mx-auto mb-3" />
          <p className="text-sm font-medium text-muted-foreground">Aucun code promo</p>
          <p className="text-xs text-muted-foreground mt-1">
            Créez des codes promo pour fidéliser vos clients
          </p>
          <Button
            variant="outline"
            className="mt-4"
            onClick={() => setCreateOpen(true)}
          >
            <Plus className="w-4 h-4 mr-1" />
            Créer un code
          </Button>
        </div>
      ) : (
        <div className="border border-border rounded-lg overflow-hidden">
          {codes.map((code, i) => (
            <div
              key={code.id}
              className={cn(
                "flex items-center gap-4 px-4 py-3.5 hover:bg-muted transition-colors",
                i !== codes.length - 1 && "border-b border-border",
              )}
            >
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <p className="text-sm font-bold font-mono">{code.code}</p>
                  <span
                    className={cn(
                      "text-xs px-2 py-0.5 rounded-full font-medium",
                      code.isActive
                        ? "bg-brand-forest/15 text-brand-forest"
                        : "bg-muted text-muted-foreground",
                    )}
                  >
                    {code.isActive ? "Actif" : "Inactif"}
                  </span>
                </div>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {code.discountType === "PERCENTAGE"
                    ? `${parseFloat(code.discountValue)}%`
                    : formatEuros(parseFloat(code.discountValue))}{" "}
                  de réduction
                  {code.minOrderAmount &&
                    ` · Min. ${formatEuros(parseFloat(code.minOrderAmount))}`}
                  {code.maxUses !== null &&
                    ` · ${code.usedCount}/${code.maxUses} utilisations`}
                  {code.expiresAt &&
                    ` · Expire le ${dayjs(code.expiresAt).format("DD/MM/YYYY")}`}
                </p>
              </div>
              <button
                className="p-2 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-lg transition-colors"
                onClick={() => handleDelete(code.id)}
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          ))}
        </div>
      )}

      <CreatePromoDialog
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        onCreated={() => {
          setCreateOpen(false);
          loadCodes();
        }}
      />
    </div>
  );
}

function CreatePromoDialog({
  open,
  onClose,
  onCreated,
}: {
  open: boolean;
  onClose: () => void;
  onCreated: () => void;
}) {
  const [code, setCode] = useState("");
  const [discountType, setDiscountType] = useState<"PERCENTAGE" | "FIXED">(
    "PERCENTAGE",
  );
  const [discountValue, setDiscountValue] = useState("");
  const [maxUses, setMaxUses] = useState("");
  const [expiresAt, setExpiresAt] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (open) {
      setCode("");
      setDiscountType("PERCENTAGE");
      setDiscountValue("");
      setMaxUses("");
      setExpiresAt("");
      setError("");
    }
  }, [open]);

  const handleSubmit = async () => {
    if (!code.trim() || !discountValue) {
      setError("Code et valeur de réduction requis");
      return;
    }
    setSubmitting(true);
    const result = await createPromoCode({
      code: code.trim().toUpperCase(),
      discountType,
      discountValue: parseFloat(discountValue),
      ...(maxUses ? { maxUses: parseInt(maxUses) } : {}),
      ...(expiresAt ? { expiresAt: new Date(expiresAt).toISOString() } : {}),
    });
    setSubmitting(false);
    if (result.error) {
      setError(result.error);
    } else {
      onCreated();
    }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>Créer un code promo</DialogTitle>
        </DialogHeader>
        <div className="p-4 space-y-4">
          {error && (
            <p className="text-sm text-destructive bg-destructive/10 border border-destructive/20 px-3 py-2 rounded-lg">
              {error}
            </p>
          )}

          <div>
            <label className="block text-xs font-medium text-foreground/70 mb-1.5">
              Code <span className="text-destructive">*</span>
            </label>
            <Input
              placeholder="EX: BIENVENUE10"
              value={code}
              onChange={(e) => setCode(e.target.value.toUpperCase())}
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-foreground/70 mb-1.5">
              Type de réduction
            </label>
            <div className="flex gap-1 p-1 bg-muted rounded-lg">
              {(["PERCENTAGE", "FIXED"] as const).map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => setDiscountType(t)}
                  className={cn(
                    "flex-1 px-3 py-1.5 rounded-md text-xs font-medium transition-all",
                    discountType === t
                      ? "bg-white text-foreground shadow-sm"
                      : "text-muted-foreground hover:text-foreground",
                  )}
                >
                  {t === "PERCENTAGE" ? "Pourcentage" : "Montant fixe"}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-foreground/70 mb-1.5">
              Valeur {discountType === "PERCENTAGE" ? "(%)" : "(€)"}{" "}
              <span className="text-destructive">*</span>
            </label>
            <Input
              type="number"
              min="0"
              step={discountType === "PERCENTAGE" ? "1" : "0.01"}
              placeholder={discountType === "PERCENTAGE" ? "10" : "5.00"}
              value={discountValue}
              onChange={(e) => setDiscountValue(e.target.value)}
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-foreground/70 mb-1.5">
              Nombre max d&apos;utilisations
            </label>
            <Input
              type="number"
              min="1"
              placeholder="Illimité"
              value={maxUses}
              onChange={(e) => setMaxUses(e.target.value)}
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-foreground/70 mb-1.5">
              Date d&apos;expiration
            </label>
            <Input
              type="date"
              value={expiresAt}
              onChange={(e) => setExpiresAt(e.target.value)}
            />
          </div>

          <div className="flex gap-2 pt-1">
            <Button
              variant="outline"
              className="flex-1"
              onClick={onClose}
              disabled={submitting}
            >
              Annuler
            </Button>
            <Button
              className="flex-1"
              onClick={handleSubmit}
              disabled={submitting}
            >
              {submitting && <Loader2 className="w-4 h-4 mr-1 animate-spin" />}
              Créer
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
