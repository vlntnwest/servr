"use client";

import React, { useEffect, useState, useRef, useCallback } from "react";
import {
  Plus,
  Pencil,
  Trash2,
  Search,
  X,
  Upload,
  Loader2,
  Package,
  Check,
  AlertCircle,
  Eye,
  EyeOff,
  ChevronDown,
  ChevronRight,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetClose,
} from "@/components/ui/sheet";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { cn, formatEuros } from "@/lib/utils";
import {
  getMenuAdmin,
  getOptionGroups,
  createProduct,
  updateProduct,
  deleteProduct,
  linkOptionGroups,
  unlinkOptionGroup,
  uploadImage,
  addOptionChoice,
} from "@/lib/api";
import type { Category, Product, OptionGroup } from "@/types/api";
import CategoriesTab from "@/components/admin/categories-tab";
import OptionsTab, { GroupDialog } from "@/components/admin/options-tab";

// ─── Types ───────────────────────────────────────────────────────────────────

type FlatProduct = Product & { categorieId: string; categorieName: string };

type ProductForm = {
  name: string;
  description: string;
  imageUrl: string;
  price: string;
  tags: string[];
  discount: string;
  isAvailable: boolean;
  displayOrder: string;
  categorieId: string;
  optionGroupIds: string[];
};

type Notification = { type: "success" | "error"; message: string } | null;

const EMPTY_PRODUCT_FORM: ProductForm = {
  name: "",
  description: "",
  imageUrl: "",
  price: "",
  tags: [],
  discount: "0",
  isAvailable: true,
  displayOrder: "999",
  categorieId: "",
  optionGroupIds: [],
};

type SubView = "products" | "categories" | "options";

// ─── Main Component ──────────────────────────────────────────────────────────

export default function ProductsTab() {
  const [subView, setSubView] = useState<SubView>("products");
  const [categories, setCategories] = useState<Category[]>([]);
  const [products, setProducts] = useState<FlatProduct[]>([]);
  const [optionGroups, setOptionGroups] = useState<OptionGroup[]>([]);
  const [loading, setLoading] = useState(true);
  const [notification, setNotification] = useState<Notification>(null);

  const notify = useCallback(
    (type: "success" | "error", message: string) => {
      setNotification({ type, message });
      setTimeout(() => setNotification(null), 3500);
    },
    [],
  );

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [menu, groups] = await Promise.all([
        getMenuAdmin(),
        getOptionGroups(),
      ]);
      setCategories(menu);
      setOptionGroups(groups);
      const flat: FlatProduct[] = menu.flatMap((cat) =>
        cat.productCategories.map((pc) => ({
          ...pc.product,
          categorieId: cat.id,
          categorieName: cat.name,
        })),
      );
      flat.sort((a, b) => a.displayOrder - b.displayOrder);
      setProducts(flat);
    } catch {
      notify("error", "Erreur lors du chargement des données");
    } finally {
      setLoading(false);
    }
  }, [notify]);

  const loadGroups = useCallback(async () => {
    const groups = await getOptionGroups();
    setOptionGroups(groups);
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const SUB_VIEWS: { key: SubView; label: string }[] = [
    { key: "products", label: "Produits" },
    { key: "categories", label: "Catégories" },
    { key: "options", label: "Options" },
  ];

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

      {/* Sub-view toggle */}
      <div className="flex gap-1 p-1 bg-gray-100 rounded-lg w-fit mb-6">
        {SUB_VIEWS.map(({ key, label }) => (
          <button
            key={key}
            onClick={() => setSubView(key)}
            className={cn(
              "px-3 py-1.5 rounded-md text-sm font-medium transition-all",
              subView === key
                ? "bg-white text-gray-900 shadow-sm"
                : "text-gray-600 hover:text-gray-900",
            )}
          >
            {label}
          </button>
        ))}
      </div>

      {subView === "products" && (
        <ProductsView
          products={products}
          categories={categories}
          optionGroups={optionGroups}
          loading={loading}
          onRefresh={loadData}
          onRefreshGroups={loadGroups}
          onNotify={notify}
        />
      )}
      {subView === "categories" && <CategoriesTab />}
      {subView === "options" && <OptionsTab />}
    </div>
  );
}

// ─── Products View ────────────────────────────────────────────────────────────

function ProductsView({
  products,
  categories,
  optionGroups,
  loading,
  onRefresh,
  onRefreshGroups,
  onNotify,
}: {
  products: FlatProduct[];
  categories: Category[];
  optionGroups: OptionGroup[];
  loading: boolean;
  onRefresh: () => void;
  onRefreshGroups: () => Promise<void>;
  onNotify: (type: "success" | "error", message: string) => void;
}) {
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<"all" | "available" | "unavailable">(
    "all",
  );
  const [sheetOpen, setSheetOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<FlatProduct | null>(
    null,
  );
  const [deleteTarget, setDeleteTarget] = useState<FlatProduct | null>(null);
  const [deleting, setDeleting] = useState(false);

  const filtered = products.filter((p) => {
    const matchSearch =
      !search || p.name.toLowerCase().includes(search.toLowerCase());
    const matchFilter =
      filter === "all" ||
      (filter === "available" && p.isAvailable) ||
      (filter === "unavailable" && !p.isAvailable);
    return matchSearch && matchFilter;
  });

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    const result = await deleteProduct(deleteTarget.id);
    setDeleting(false);
    if (result.error) {
      onNotify("error", result.error);
    } else {
      onNotify("success", `"${deleteTarget.name}" supprimé`);
      setDeleteTarget(null);
      onRefresh();
    }
  };

  const handleSaved = () => {
    setSheetOpen(false);
    onRefresh();
    onNotify(
      "success",
      editingProduct ? "Produit mis à jour" : "Produit créé",
    );
  };

  if (loading) {
    return (
      <div className="space-y-2">
        {[1, 2, 3, 4, 5].map((i) => (
          <Skeleton key={i} className="h-16 rounded-lg" />
        ))}
      </div>
    );
  }

  return (
    <>
      {/* Toolbar */}
      <div className="flex flex-col sm:flex-row gap-3 mb-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder="Rechercher un produit..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-3 h-10 rounded-sm border border-black/20 bg-white text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
          />
        </div>
        <div className="flex gap-1 p-1 bg-gray-100 rounded-lg shrink-0">
          {(["all", "available", "unavailable"] as const).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={cn(
                "px-3 py-1.5 rounded-md text-xs font-medium transition-all",
                filter === f
                  ? "bg-white text-gray-900 shadow-sm"
                  : "text-gray-600 hover:text-gray-900",
              )}
            >
              {f === "all"
                ? "Tous"
                : f === "available"
                  ? "Disponibles"
                  : "Indisponibles"}
            </button>
          ))}
        </div>
        <Button
          onClick={() => {
            setEditingProduct(null);
            setSheetOpen(true);
          }}
          className="shrink-0"
        >
          <Plus className="w-4 h-4 mr-1" />
          Ajouter
        </Button>
      </div>

      <p className="text-xs text-[#676767] mb-3">
        {filtered.length} produit{filtered.length !== 1 ? "s" : ""}
      </p>

      {filtered.length === 0 ? (
        <p className="text-center text-[#676767] py-12">
          Aucun produit trouvé
        </p>
      ) : (
        <div className="border border-black/8 rounded-lg overflow-hidden">
          {filtered.map((product, i) => (
            <div
              key={product.id}
              className={cn(
                "flex items-center gap-3 px-4 py-3 hover:bg-gray-50 transition-colors",
                i !== filtered.length - 1 && "border-b border-black/5",
              )}
            >
              {/* Thumbnail */}
              <div className="w-10 h-10 rounded-md overflow-hidden bg-gray-100 shrink-0">
                {product.imageUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={product.imageUrl}
                    alt={product.name}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <Package className="w-4 h-4 text-gray-400" />
                  </div>
                )}
              </div>

              {/* Info */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <p className="text-sm font-medium truncate">{product.name}</p>
                  {!product.isAvailable && (
                    <Badge variant="secondary" className="text-[10px] shrink-0">
                      Indisponible
                    </Badge>
                  )}
                  {product.optionGroups.length > 0 && (
                    <Badge variant="outline" className="text-[10px] shrink-0">
                      {product.optionGroups.length} option
                      {product.optionGroups.length !== 1 ? "s" : ""}
                    </Badge>
                  )}
                </div>
                <p className="text-xs text-[#676767] truncate">
                  {product.categorieName}
                </p>
              </div>

              {/* Price */}
              <p className="text-sm font-semibold text-[#1f4493] shrink-0">
                {formatEuros(parseFloat(product.price))}
              </p>

              {/* Actions */}
              <div className="flex items-center gap-1 shrink-0">
                <button
                  onClick={() => {
                    setEditingProduct(product);
                    setSheetOpen(true);
                  }}
                  className="p-1.5 hover:bg-black/5 rounded-md transition-colors"
                  aria-label="Modifier"
                >
                  <Pencil className="w-3.5 h-3.5 text-[#676767]" />
                </button>
                <button
                  onClick={() => setDeleteTarget(product)}
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

      <ProductSheet
        open={sheetOpen}
        onClose={() => setSheetOpen(false)}
        product={editingProduct}
        categories={categories}
        optionGroups={optionGroups}
        onSaved={handleSaved}
        onError={(msg) => onNotify("error", msg)}
        onRefreshGroups={onRefreshGroups}
      />

      {/* Delete confirmation */}
      <Dialog
        open={!!deleteTarget}
        onOpenChange={(o) => !o && setDeleteTarget(null)}
      >
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Supprimer ce produit ?</DialogTitle>
          </DialogHeader>
          <div className="p-4 space-y-4">
            <p className="text-sm text-[#676767]">
              Cette action est irréversible. &ldquo;{deleteTarget?.name}&rdquo;
              sera définitivement supprimé.
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
    </>
  );
}

// ─── Product Sheet ────────────────────────────────────────────────────────────

function ProductSheet({
  open,
  onClose,
  product,
  categories,
  optionGroups,
  onSaved,
  onError,
  onRefreshGroups,
}: {
  open: boolean;
  onClose: () => void;
  product: FlatProduct | null;
  categories: Category[];
  optionGroups: OptionGroup[];
  onSaved: () => void;
  onError: (msg: string) => void;
  onRefreshGroups: () => Promise<void>;
}) {
  const [form, setForm] = useState<ProductForm>(EMPTY_PRODUCT_FORM);
  const [errors, setErrors] = useState<
    Partial<Record<keyof ProductForm, string>>
  >({});
  const [submitting, setSubmitting] = useState(false);
  const [tagInput, setTagInput] = useState("");
  const [uploading, setUploading] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set());
  const [addingChoiceFor, setAddingChoiceFor] = useState<string | null>(null);
  const [newGroupDialogOpen, setNewGroupDialogOpen] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (open) {
      if (product) {
        setForm({
          name: product.name,
          description: product.description,
          imageUrl: product.imageUrl,
          price: product.price,
          tags: product.tags ?? [],
          discount: product.discount,
          isAvailable: product.isAvailable,
          displayOrder: String(product.displayOrder),
          categorieId: product.categorieId,
          optionGroupIds: product.optionGroups.map((og) => og.id),
        });
      } else {
        setForm(EMPTY_PRODUCT_FORM);
      }
      setErrors({});
      setTagInput("");
      setExpandedGroups(new Set());
      setAddingChoiceFor(null);
    }
  }, [open, product]);

  const setField = <K extends keyof ProductForm>(
    key: K,
    value: ProductForm[K],
  ) => {
    setForm((f) => ({ ...f, [key]: value }));
    setErrors((e) => ({ ...e, [key]: undefined }));
  };

  const validate = (): boolean => {
    const e: Partial<Record<keyof ProductForm, string>> = {};
    if (!form.name.trim()) e.name = "Requis";
    else if (form.name.length > 50) e.name = "Max 50 caractères";
    if (!form.description.trim()) e.description = "Requis";
    else if (form.description.length > 255)
      e.description = "Max 255 caractères";
    if (!form.imageUrl.trim()) e.imageUrl = "Requis";
    const price = parseFloat(form.price);
    if (!form.price || isNaN(price) || price <= 0) e.price = "Prix invalide";
    if (!form.categorieId) e.categorieId = "Choisissez une catégorie";
    const discount = parseFloat(form.discount);
    if (isNaN(discount) || discount < 0) e.discount = "Valeur invalide";
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const syncOptionGroups = async (productId: string) => {
    const currentIds = product?.optionGroups.map((og) => og.id) ?? [];
    const toAdd = form.optionGroupIds.filter((id) => !currentIds.includes(id));
    const toRemove = currentIds.filter(
      (id) => !form.optionGroupIds.includes(id),
    );

    const ops: Promise<{ error?: string }>[] = [];
    if (toAdd.length > 0) ops.push(linkOptionGroups(productId, toAdd));
    for (const id of toRemove) ops.push(unlinkOptionGroup(productId, id));
    await Promise.all(ops);
  };

  const handleSubmit = async () => {
    if (!validate()) return;
    setSubmitting(true);
    const payload = {
      name: form.name.trim(),
      description: form.description.trim(),
      imageUrl: form.imageUrl.trim(),
      price: parseFloat(form.price),
      tags: form.tags,
      discount: parseFloat(form.discount) || 0,
      isAvailable: form.isAvailable,
      displayOrder: parseInt(form.displayOrder) || 999,
      categorieId: form.categorieId,
    };

    const result = product
      ? await updateProduct(product.id, payload)
      : await createProduct(payload);

    if (result.error) {
      setSubmitting(false);
      onError(result.error);
      return;
    }

    // Sync option groups after create/update
    if (result.data) {
      await syncOptionGroups(result.data.id);
    }

    setSubmitting(false);
    onSaved();
  };

  const handleFile = async (file: File) => {
    if (!file.type.match(/^image\//)) {
      onError("Format non supporté. Utilisez JPEG, PNG ou WebP.");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      onError("Fichier trop volumineux (max 5 MB)");
      return;
    }
    setUploading(true);
    const url = await uploadImage(file);
    setUploading(false);
    if (url) setField("imageUrl", url);
    else onError("Erreur lors de l'upload de l'image");
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  };

  const addTag = () => {
    const tag = tagInput.trim();
    if (tag && !form.tags.includes(tag)) setField("tags", [...form.tags, tag]);
    setTagInput("");
  };

  const toggleOptionGroup = (id: string) => {
    const wasChecked = form.optionGroupIds.includes(id);
    setField(
      "optionGroupIds",
      wasChecked
        ? form.optionGroupIds.filter((x) => x !== id)
        : [...form.optionGroupIds, id],
    );
    if (!wasChecked) {
      setExpandedGroups((prev) => new Set([...prev, id]));
    }
  };

  const toggleExpandGroup = (id: string) => {
    setExpandedGroups((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  return (
    <Sheet open={open} onOpenChange={(o) => !o && onClose()}>
      <SheetContent
        side="right"
        className="sm:max-w-xl w-full flex flex-col p-0"
      >
        <SheetHeader className="px-6 py-4">
          <SheetTitle>
            {product ? "Modifier le produit" : "Ajouter un produit"}
          </SheetTitle>
        </SheetHeader>

        <div className="flex-1 overflow-y-auto px-6 py-4 space-y-5">
          {/* Image upload */}
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1.5">
              Image
            </label>
            {form.imageUrl ? (
              <div className="relative w-full h-40 rounded-lg overflow-hidden border border-black/10">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={form.imageUrl}
                  alt="Aperçu"
                  className="w-full h-full object-cover"
                />
                <button
                  type="button"
                  onClick={() => setField("imageUrl", "")}
                  className="absolute top-2 right-2 p-1 bg-black/60 rounded-full hover:bg-black/80 transition-colors"
                  aria-label="Supprimer l'image"
                >
                  <X className="w-3.5 h-3.5 text-white" />
                </button>
              </div>
            ) : (
              <>
                <div
                  onDragOver={(e) => {
                    e.preventDefault();
                    setDragOver(true);
                  }}
                  onDragLeave={() => setDragOver(false)}
                  onDrop={handleDrop}
                  onClick={() => fileInputRef.current?.click()}
                  className={cn(
                    "flex flex-col items-center justify-center w-full h-32 rounded-lg border-2 border-dashed cursor-pointer transition-colors",
                    dragOver
                      ? "border-primary bg-primary/5"
                      : "border-black/20 hover:border-primary/50 hover:bg-gray-50",
                    errors.imageUrl && "border-red-400",
                  )}
                >
                  {uploading ? (
                    <Loader2 className="w-6 h-6 animate-spin text-[#676767]" />
                  ) : (
                    <>
                      <Upload className="w-6 h-6 text-[#676767] mb-1" />
                      <p className="text-xs text-[#676767]">
                        Glissez une image ou{" "}
                        <span className="text-primary font-medium">
                          cliquez
                        </span>
                      </p>
                      <p className="text-[10px] text-gray-400 mt-0.5">
                        JPEG, PNG, WebP · max 5 MB
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
                <Input
                  className="mt-2"
                  placeholder="Ou coller une URL d'image..."
                  value={form.imageUrl}
                  onChange={(e) => setField("imageUrl", e.target.value)}
                  error={!!errors.imageUrl}
                  helperText={errors.imageUrl}
                />
              </>
            )}
          </div>

          {/* Name */}
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1.5">
              Nom <span className="text-red-500">*</span>
            </label>
            <Input
              value={form.name}
              onChange={(e) => setField("name", e.target.value)}
              placeholder="Poké Saumon Avocat"
              maxLength={50}
              error={!!errors.name}
              helperText={errors.name}
            />
          </div>

          {/* Description */}
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1.5">
              Description <span className="text-red-500">*</span>
            </label>
            <textarea
              value={form.description}
              onChange={(e) => setField("description", e.target.value)}
              placeholder="Décrivez ce produit..."
              maxLength={255}
              rows={3}
              className={cn(
                "flex w-full rounded-sm border bg-white px-3 py-2 text-sm transition-colors placeholder:text-gray-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary disabled:cursor-not-allowed resize-none",
                errors.description ? "border-red-500" : "border-black/20",
              )}
            />
            <div className="flex justify-between mt-1">
              {errors.description && (
                <p className="text-xs text-red-500">{errors.description}</p>
              )}
              <p className="text-xs text-gray-400 ml-auto">
                {form.description.length}/255
              </p>
            </div>
          </div>

          {/* Category */}
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1.5">
              Catégorie <span className="text-red-500">*</span>
            </label>
            <select
              value={form.categorieId}
              onChange={(e) => setField("categorieId", e.target.value)}
              className={cn(
                "flex h-10 w-full rounded-sm border bg-white px-3 py-2 text-sm focus-visible:outline-none focus:ring-2 focus:ring-primary",
                errors.categorieId ? "border-red-500" : "border-black/20",
              )}
            >
              <option value="">Sélectionner une catégorie</option>
              {categories.map((cat) => (
                <option key={cat.id} value={cat.id}>
                  {cat.name}
                </option>
              ))}
            </select>
            {errors.categorieId && (
              <p className="mt-1 text-xs text-red-500">{errors.categorieId}</p>
            )}
          </div>

          {/* Price + Discount */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1.5">
                Prix (€) <span className="text-red-500">*</span>
              </label>
              <Input
                type="number"
                step="0.01"
                min="0"
                value={form.price}
                onChange={(e) => setField("price", e.target.value)}
                placeholder="12.90"
                error={!!errors.price}
                helperText={errors.price}
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1.5">
                Remise (€)
              </label>
              <Input
                type="number"
                step="0.01"
                min="0"
                value={form.discount}
                onChange={(e) => setField("discount", e.target.value)}
                placeholder="0"
                error={!!errors.discount}
                helperText={errors.discount}
              />
            </div>
          </div>

          {/* Display order + Availability */}
          <div className="grid grid-cols-2 gap-3 items-end">
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1.5">
                Ordre d&apos;affichage
              </label>
              <Input
                type="number"
                min="0"
                value={form.displayOrder}
                onChange={(e) => setField("displayOrder", e.target.value)}
                placeholder="999"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1.5">
                Disponibilité
              </label>
              <button
                type="button"
                onClick={() => setField("isAvailable", !form.isAvailable)}
                className={cn(
                  "flex items-center gap-2 h-10 px-4 w-full rounded-sm border text-sm font-medium transition-colors",
                  form.isAvailable
                    ? "border-green-300 bg-green-50 text-green-700 hover:bg-green-100"
                    : "border-black/20 bg-white text-gray-500 hover:bg-gray-50",
                )}
              >
                {form.isAvailable ? (
                  <>
                    <Eye className="w-4 h-4" />
                    Disponible
                  </>
                ) : (
                  <>
                    <EyeOff className="w-4 h-4" />
                    Indisponible
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Tags */}
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1.5">
              Tags
            </label>
            <div className="flex gap-2">
              <Input
                value={tagInput}
                onChange={(e) => setTagInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === ",") {
                    e.preventDefault();
                    addTag();
                  }
                }}
                placeholder="Ex: végan, bestseller..."
              />
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={addTag}
                className="shrink-0 h-10 px-3"
              >
                <Plus className="w-4 h-4" />
              </Button>
            </div>
            {form.tags.length > 0 && (
              <div className="flex flex-wrap gap-1.5 mt-2">
                {form.tags.map((tag) => (
                  <span
                    key={tag}
                    className="inline-flex items-center gap-1 px-2 py-0.5 bg-primary/10 text-primary rounded-full text-xs font-medium"
                  >
                    {tag}
                    <button
                      type="button"
                      onClick={() =>
                        setField(
                          "tags",
                          form.tags.filter((t) => t !== tag),
                        )
                      }
                      className="hover:opacity-70 transition-opacity"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </span>
                ))}
              </div>
            )}
          </div>

          {/* Option Groups */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs font-medium text-gray-700">
                Groupes d&apos;options
              </label>
              <button
                type="button"
                onClick={() => setNewGroupDialogOpen(true)}
                className="flex items-center gap-1 text-xs text-primary font-medium hover:opacity-80 transition-opacity"
              >
                <Plus className="w-3 h-3" />
                Nouveau groupe
              </button>
            </div>

            {optionGroups.length === 0 ? (
              <div className="text-center py-6 border-2 border-dashed border-black/10 rounded-lg">
                <p className="text-xs text-[#676767]">
                  Aucun groupe d&apos;options
                </p>
                <button
                  type="button"
                  onClick={() => setNewGroupDialogOpen(true)}
                  className="mt-2 text-xs text-primary font-medium hover:opacity-80 transition-opacity"
                >
                  + Créer un groupe
                </button>
              </div>
            ) : (
              <div className="border border-black/10 rounded-lg overflow-hidden">
                {optionGroups.map((group) => {
                  const checked = form.optionGroupIds.includes(group.id);
                  const isExpanded = expandedGroups.has(group.id);
                  return (
                    <div
                      key={group.id}
                      className="border-b border-black/5 last:border-0"
                    >
                      <div className="flex items-center gap-2 px-3 py-2.5 hover:bg-gray-50 transition-colors">
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={() => toggleOptionGroup(group.id)}
                          className="w-4 h-4 rounded border-gray-300 accent-primary shrink-0"
                        />
                        <button
                          type="button"
                          onClick={() => toggleExpandGroup(group.id)}
                          className="flex-1 flex items-center gap-2 text-left min-w-0"
                        >
                          <div className="min-w-0 flex-1">
                            <p className="text-sm font-medium truncate">
                              {group.name}
                            </p>
                            <p className="text-xs text-[#676767]">
                              {group.hasMultiple ? "Multiple" : "Unique"} ·{" "}
                              {group.optionChoices.length} choix
                              {group.isRequired && (
                                <span className="ml-1 text-[#e67400]">
                                  · Requis
                                </span>
                              )}
                            </p>
                          </div>
                          {isExpanded ? (
                            <ChevronDown className="w-3.5 h-3.5 text-gray-400 shrink-0" />
                          ) : (
                            <ChevronRight className="w-3.5 h-3.5 text-gray-400 shrink-0" />
                          )}
                        </button>
                      </div>

                      {isExpanded && (
                        <div className="border-t border-black/5 bg-gray-50/50">
                          {group.optionChoices.length === 0 &&
                            addingChoiceFor !== group.id && (
                              <p className="text-xs text-[#676767] px-8 py-2.5 italic">
                                Aucun choix pour l&apos;instant
                              </p>
                            )}
                          {[...group.optionChoices]
                            .sort((a, b) => a.displayOrder - b.displayOrder)
                            .map((choice) => (
                              <div
                                key={choice.id}
                                className="flex items-center gap-3 px-8 py-2 border-b border-black/5 last:border-0 text-xs"
                              >
                                <span className="flex-1">{choice.name}</span>
                                <span
                                  className={cn(
                                    "shrink-0",
                                    parseFloat(choice.priceModifier) > 0
                                      ? "text-[#e67400]"
                                      : "text-gray-400",
                                  )}
                                >
                                  {parseFloat(choice.priceModifier) > 0
                                    ? `+${formatEuros(parseFloat(choice.priceModifier))}`
                                    : "inclus"}
                                </span>
                              </div>
                            ))}
                          {addingChoiceFor === group.id ? (
                            <InlineChoiceAddRow
                              groupId={group.id}
                              nextOrder={group.optionChoices.length}
                              onSaved={async () => {
                                setAddingChoiceFor(null);
                                await onRefreshGroups();
                              }}
                              onCancel={() => setAddingChoiceFor(null)}
                              onError={onError}
                            />
                          ) : (
                            <button
                              type="button"
                              onClick={() => setAddingChoiceFor(group.id)}
                              className="flex items-center gap-2 w-full px-8 py-2 text-xs text-primary font-medium hover:bg-primary/5 transition-colors"
                            >
                              <Plus className="w-3 h-3" />
                              Ajouter un choix
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}

            <GroupDialog
              open={newGroupDialogOpen}
              onClose={() => setNewGroupDialogOpen(false)}
              group={null}
              nextOrder={optionGroups.length}
              onSaved={async (_, newGroup) => {
                setNewGroupDialogOpen(false);
                await onRefreshGroups();
                if (newGroup) {
                  setField("optionGroupIds", [
                    ...form.optionGroupIds,
                    newGroup.id,
                  ]);
                  setExpandedGroups((prev) => new Set([...prev, newGroup.id]));
                }
              }}
              onError={onError}
            />
          </div>
        </div>

        {/* Footer */}
        <div className="border-t px-6 py-4 flex gap-2">
          <SheetClose asChild>
            <Button
              variant="outline"
              className="flex-1"
              disabled={submitting}
              onClick={onClose}
            >
              Annuler
            </Button>
          </SheetClose>
          <Button
            className="flex-1"
            onClick={handleSubmit}
            disabled={submitting}
          >
            {submitting && <Loader2 className="w-4 h-4 mr-1 animate-spin" />}
            {product ? "Enregistrer" : "Créer"}
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}

// ─── Inline choice add row (inside ProductSheet) ──────────────────────────────

function InlineChoiceAddRow({
  groupId,
  nextOrder,
  onSaved,
  onCancel,
  onError,
}: {
  groupId: string;
  nextOrder: number;
  onSaved: () => void;
  onCancel: () => void;
  onError: (msg: string) => void;
}) {
  const [name, setName] = useState("");
  const [price, setPrice] = useState("0");
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    if (!name.trim()) return;
    setSaving(true);
    const result = await addOptionChoice(groupId, {
      name: name.trim(),
      priceModifier: parseFloat(price) || 0,
      displayOrder: nextOrder,
    });
    setSaving(false);
    if (result.error) onError(result.error);
    else onSaved();
  };

  return (
    <div className="flex items-center gap-2 px-8 py-2 bg-white border-t border-black/5">
      <input
        type="text"
        autoFocus
        placeholder="Nom du choix..."
        value={name}
        onChange={(e) => setName(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter") handleSave();
          if (e.key === "Escape") onCancel();
        }}
        className="flex-1 h-7 px-2 text-xs border border-black/20 rounded-sm focus:outline-none focus:ring-2 focus:ring-primary"
      />
      <input
        type="number"
        step="0.01"
        min="0"
        placeholder="0.00"
        value={price}
        onChange={(e) => setPrice(e.target.value)}
        className="w-16 h-7 px-2 text-xs border border-black/20 rounded-sm focus:outline-none focus:ring-2 focus:ring-primary"
      />
      <span className="text-xs text-[#676767]">€</span>
      <button
        type="button"
        onClick={handleSave}
        disabled={!name.trim() || saving}
        className="p-1 bg-primary text-white rounded-md hover:bg-primary/90 disabled:opacity-50 transition-colors"
      >
        {saving ? (
          <Loader2 className="w-3 h-3 animate-spin" />
        ) : (
          <Check className="w-3 h-3" />
        )}
      </button>
      <button
        type="button"
        onClick={onCancel}
        className="p-1 hover:bg-black/5 rounded-md transition-colors"
      >
        <X className="w-3 h-3 text-[#676767]" />
      </button>
    </div>
  );
}
