"use client";

import React, { useEffect, useState, useCallback } from "react";
import {
  Plus,
  Pencil,
  Trash2,
  Loader2,
  Check,
  AlertCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import {
  getMenuAdmin,
  createCategory,
  updateCategory,
  deleteCategory,
} from "@/lib/api";
import type { Category } from "@/types/api";

type Notification = { type: "success" | "error"; message: string } | null;
type CategoryForm = { name: string; subHeading: string; displayOrder: string };
const EMPTY_FORM: CategoryForm = { name: "", subHeading: "", displayOrder: "0" };

export default function CategoriesTab() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [notification, setNotification] = useState<Notification>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingCat, setEditingCat] = useState<Category | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Category | null>(null);
  const [deleting, setDeleting] = useState(false);

  const notify = useCallback((type: "success" | "error", message: string) => {
    setNotification({ type, message });
    setTimeout(() => setNotification(null), 3500);
  }, []);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const menu = await getMenuAdmin();
      setCategories(menu);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const sorted = [...categories].sort((a, b) => a.displayOrder - b.displayOrder);

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    const result = await deleteCategory(deleteTarget.id);
    setDeleting(false);
    if (result.error) {
      notify("error", result.error);
    } else {
      notify("success", `Catégorie "${deleteTarget.name}" supprimée`);
      setDeleteTarget(null);
      loadData();
    }
  };

  return (
    <div className="pt-4 border-t">
      {notification && (
        <div
          className={cn(
            "mb-4 flex items-center gap-2 px-4 py-3 rounded-lg text-sm font-medium",
            notification.type === "success"
              ? "bg-green-50 text-green-800 border border-green-200"
              : "bg-red-50 text-red-800 border border-red-200",
          )}
        >
          {notification.type === "success" ? (
            <Check className="w-4 h-4 shrink-0" />
          ) : (
            <AlertCircle className="w-4 h-4 shrink-0" />
          )}
          {notification.message}
        </div>
      )}

      <div className="flex items-center justify-between mb-4">
        <p className="text-sm text-[#676767]">
          {sorted.length} catégorie{sorted.length !== 1 ? "s" : ""}
        </p>
        <Button
          onClick={() => {
            setEditingCat(null);
            setDialogOpen(true);
          }}
        >
          <Plus className="w-4 h-4 mr-1" />
          Ajouter
        </Button>
      </div>

      {loading ? (
        <div className="space-y-2">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-14 rounded-lg" />
          ))}
        </div>
      ) : sorted.length === 0 ? (
        <p className="text-center text-[#676767] py-12">Aucune catégorie</p>
      ) : (
        <div className="border border-black/8 rounded-lg overflow-hidden">
          {sorted.map((cat, i) => (
            <div
              key={cat.id}
              className={cn(
                "flex items-center gap-3 px-4 py-3.5 hover:bg-gray-50 transition-colors",
                i !== sorted.length - 1 && "border-b border-black/5",
              )}
            >
              <div className="flex-none w-6 h-6 rounded bg-primary/10 flex items-center justify-center">
                <span className="text-[10px] font-bold text-primary">
                  {cat.displayOrder}
                </span>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium">{cat.name}</p>
                {cat.subHeading && (
                  <p className="text-xs text-[#676767] truncate">
                    {cat.subHeading}
                  </p>
                )}
              </div>
              <Badge variant="secondary" className="shrink-0">
                {cat.productCategories.length} produit
                {cat.productCategories.length !== 1 ? "s" : ""}
              </Badge>
              <div className="flex items-center gap-1 shrink-0">
                <button
                  onClick={() => {
                    setEditingCat(cat);
                    setDialogOpen(true);
                  }}
                  className="p-1.5 hover:bg-black/5 rounded-md transition-colors"
                  aria-label="Modifier"
                >
                  <Pencil className="w-3.5 h-3.5 text-[#676767]" />
                </button>
                <button
                  onClick={() => setDeleteTarget(cat)}
                  className="p-1.5 hover:bg-red-50 rounded-md transition-colors"
                  aria-label="Supprimer"
                >
                  <Trash2 className="w-3.5 h-3.5 text-red-500" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      <CategoryDialog
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
        category={editingCat}
        nextOrder={sorted.length}
        onSaved={(msg) => {
          setDialogOpen(false);
          loadData();
          notify("success", msg);
        }}
        onError={(msg) => notify("error", msg)}
      />

      <Dialog
        open={!!deleteTarget}
        onOpenChange={(o) => !o && setDeleteTarget(null)}
      >
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Supprimer cette catégorie ?</DialogTitle>
          </DialogHeader>
          <div className="p-4 space-y-4">
            <p className="text-sm text-[#676767]">
              &ldquo;{deleteTarget?.name}&rdquo; et tous ses produits associés
              seront supprimés définitivement.
            </p>
            <div className="flex gap-2 justify-end">
              <Button
                variant="outline"
                onClick={() => setDeleteTarget(null)}
                disabled={deleting}
              >
                Annuler
              </Button>
              <Button
                variant="destructive"
                onClick={handleDelete}
                disabled={deleting}
              >
                {deleting && (
                  <Loader2 className="w-4 h-4 mr-1 animate-spin" />
                )}
                Supprimer
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function CategoryDialog({
  open,
  onClose,
  category,
  nextOrder,
  onSaved,
  onError,
}: {
  open: boolean;
  onClose: () => void;
  category: Category | null;
  nextOrder: number;
  onSaved: (msg: string) => void;
  onError: (msg: string) => void;
}) {
  const [form, setForm] = useState<CategoryForm>(EMPTY_FORM);
  const [errors, setErrors] = useState<
    Partial<Record<keyof CategoryForm, string>>
  >({});
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (open) {
      setForm(
        category
          ? {
              name: category.name,
              subHeading: category.subHeading ?? "",
              displayOrder: String(category.displayOrder),
            }
          : { ...EMPTY_FORM, displayOrder: String(nextOrder) },
      );
      setErrors({});
    }
  }, [open, category, nextOrder]);

  const setField = (key: keyof CategoryForm, value: string) => {
    setForm((f) => ({ ...f, [key]: value }));
    setErrors((e) => ({ ...e, [key]: undefined }));
  };

  const validate = () => {
    const e: Partial<Record<keyof CategoryForm, string>> = {};
    if (!form.name.trim()) e.name = "Requis";
    else if (form.name.length > 50) e.name = "Max 50 caractères";
    if (form.subHeading.length > 255) e.subHeading = "Max 255 caractères";
    const order = parseInt(form.displayOrder);
    if (isNaN(order) || order < 0) e.displayOrder = "Valeur invalide";
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = async () => {
    if (!validate()) return;
    setSubmitting(true);
    const payload = {
      name: form.name.trim(),
      subHeading: form.subHeading.trim() || undefined,
      displayOrder: parseInt(form.displayOrder) || 0,
    };
    const result = category
      ? await updateCategory(category.id, payload)
      : await createCategory(payload);
    setSubmitting(false);
    if (result.error) onError(result.error);
    else onSaved(category ? "Catégorie mise à jour" : "Catégorie créée");
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>
            {category ? "Modifier la catégorie" : "Ajouter une catégorie"}
          </DialogTitle>
        </DialogHeader>
        <div className="p-4 space-y-4">
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1.5">
              Nom <span className="text-red-500">*</span>
            </label>
            <Input
              value={form.name}
              onChange={(e) => setField("name", e.target.value)}
              placeholder="Entrées"
              maxLength={50}
              error={!!errors.name}
              helperText={errors.name}
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1.5">
              Sous-titre
            </label>
            <Input
              value={form.subHeading}
              onChange={(e) => setField("subHeading", e.target.value)}
              placeholder="Nos suggestions..."
              maxLength={255}
              error={!!errors.subHeading}
              helperText={errors.subHeading}
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1.5">
              Ordre d&apos;affichage
            </label>
            <Input
              type="number"
              min="0"
              value={form.displayOrder}
              onChange={(e) => setField("displayOrder", e.target.value)}
              error={!!errors.displayOrder}
              helperText={errors.displayOrder}
            />
          </div>
          <Separator />
          <div className="flex gap-2">
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
              {submitting && (
                <Loader2 className="w-4 h-4 mr-1 animate-spin" />
              )}
              {category ? "Enregistrer" : "Créer"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
