"use client";

import React, { useEffect, useState, useCallback } from "react";
import {
  Plus,
  Pencil,
  Trash2,
  Loader2,
  Check,
  AlertCircle,
  ChevronDown,
  ChevronRight,
  Settings2,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { cn, formatEuros } from "@/lib/utils";
import {
  getOptionGroups,
  createOptionGroup,
  updateOptionGroup,
  deleteOptionGroup,
  addOptionChoice,
  updateOptionChoice,
  deleteOptionChoice,
} from "@/lib/api";
import type { OptionGroup, OptionChoice } from "@/types/api";

type Notification = { type: "success" | "error"; message: string } | null;

type GroupForm = {
  name: string;
  hasMultiple: boolean;
  isRequired: boolean;
  minQuantity: string;
  maxQuantity: string;
  displayOrder: string;
};

const EMPTY_GROUP_FORM: GroupForm = {
  name: "",
  hasMultiple: false,
  isRequired: false,
  minQuantity: "1",
  maxQuantity: "1",
  displayOrder: "0",
};

// ─── Main Component ──────────────────────────────────────────────────────────

export default function OptionsTab() {
  const [groups, setGroups] = useState<OptionGroup[]>([]);
  const [loading, setLoading] = useState(true);
  const [notification, setNotification] = useState<Notification>(null);
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [groupDialogOpen, setGroupDialogOpen] = useState(false);
  const [editingGroup, setEditingGroup] = useState<OptionGroup | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<OptionGroup | null>(null);
  const [deleting, setDeleting] = useState(false);

  const notify = useCallback((type: "success" | "error", message: string) => {
    setNotification({ type, message });
    setTimeout(() => setNotification(null), 3500);
  }, []);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const data = await getOptionGroups();
      setGroups(data.sort((a, b) => a.displayOrder - b.displayOrder));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const toggleExpand = (id: string) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleDeleteGroup = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    const result = await deleteOptionGroup(deleteTarget.id);
    setDeleting(false);
    if (result.error) {
      notify("error", result.error);
    } else {
      notify("success", `Groupe "${deleteTarget.name}" supprimé`);
      setDeleteTarget(null);
      loadData();
    }
  };

  return (
    <div className="pt-4">
      {notification && (
        <div
          className={cn(
            "mb-4 flex items-center gap-2 px-4 py-3 rounded-lg text-sm font-medium",
            notification.type === "success"
              ? "bg-brand-forest/10 text-brand-forest border border-brand-forest/20"
              : "bg-destructive/10 text-destructive border border-destructive/20",
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

      <div className="flex items-center justify-between mb-6">
        <p className="text-sm text-muted-foreground">
          {groups.length} groupe{groups.length !== 1 ? "s" : ""} d&apos;options
        </p>
        <Button
          onClick={() => {
            setEditingGroup(null);
            setGroupDialogOpen(true);
          }}
        >
          <Plus className="w-4 h-4 mr-1" />
          Créer un groupe
        </Button>
      </div>

      {loading ? (
        <div className="space-y-2">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-16 rounded-lg" />
          ))}
        </div>
      ) : groups.length === 0 ? (
        <div className="text-center py-16 border-2 border-dashed border-black/10 rounded-xl">
          <Settings2 className="w-10 h-10 text-muted-foreground/40 mx-auto mb-3" />
          <p className="text-sm font-medium text-muted-foreground">
            Aucun groupe d&apos;options
          </p>
          <p className="text-xs text-muted-foreground mt-1">
            Créez des groupes pour personnaliser vos produits (taille, cuisson,
            suppléments…)
          </p>
          <Button
            variant="outline"
            className="mt-4"
            onClick={() => {
              setEditingGroup(null);
              setGroupDialogOpen(true);
            }}
          >
            <Plus className="w-4 h-4 mr-1" />
            Créer un groupe
          </Button>
        </div>
      ) : (
        <div className="space-y-2">
          {groups.map((group) => (
            <GroupCard
              key={group.id}
              group={group}
              expanded={expanded.has(group.id)}
              onToggle={() => toggleExpand(group.id)}
              onEdit={() => {
                setEditingGroup(group);
                setGroupDialogOpen(true);
              }}
              onDelete={() => setDeleteTarget(group)}
              onRefresh={loadData}
              onNotify={notify}
            />
          ))}
        </div>
      )}

      <GroupDialog
        open={groupDialogOpen}
        onClose={() => setGroupDialogOpen(false)}
        group={editingGroup}
        nextOrder={groups.length}
        onSaved={(msg) => {
          setGroupDialogOpen(false);
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
            <DialogTitle>Supprimer ce groupe ?</DialogTitle>
          </DialogHeader>
          <div className="p-4 space-y-4">
            <p className="text-sm text-muted-foreground">
              &ldquo;{deleteTarget?.name}&rdquo; sera supprimé. Les produits
              liés à ce groupe perdront ces options.
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
                onClick={handleDeleteGroup}
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

// ─── Group Card (accordion) ───────────────────────────────────────────────────

function GroupCard({
  group,
  expanded,
  onToggle,
  onEdit,
  onDelete,
  onRefresh,
  onNotify,
}: {
  group: OptionGroup;
  expanded: boolean;
  onToggle: () => void;
  onEdit: () => void;
  onDelete: () => void;
  onRefresh: () => void;
  onNotify: (type: "success" | "error", message: string) => void;
}) {
  const [addingChoice, setAddingChoice] = useState(false);
  const [editingChoice, setEditingChoice] = useState<OptionChoice | null>(null);
  const [deleteChoiceTarget, setDeleteChoiceTarget] =
    useState<OptionChoice | null>(null);
  const [deletingChoice, setDeletingChoice] = useState(false);

  const sorted = [...group.optionChoices].sort(
    (a, b) => a.displayOrder - b.displayOrder,
  );

  const handleDeleteChoice = async () => {
    if (!deleteChoiceTarget) return;
    setDeletingChoice(true);
    const result = await deleteOptionChoice(deleteChoiceTarget.id);
    setDeletingChoice(false);
    if (result.error) {
      onNotify("error", result.error);
    } else {
      onNotify("success", `Option "${deleteChoiceTarget.name}" supprimée`);
      setDeleteChoiceTarget(null);
      onRefresh();
    }
  };

  return (
    <div className="border border-border rounded-lg overflow-hidden">
      {/* Header */}
      <div className="flex items-center gap-2 px-4 py-3 bg-white hover:bg-muted transition-colors">
        <button
          onClick={onToggle}
          className="flex-1 flex items-center gap-3 text-left min-w-0"
        >
          {expanded ? (
            <ChevronDown className="w-4 h-4 text-muted-foreground shrink-0" />
          ) : (
            <ChevronRight className="w-4 h-4 text-muted-foreground shrink-0" />
          )}
          <div className="min-w-0">
            <p className="text-sm font-semibold truncate">{group.name}</p>
            <div className="flex items-center gap-2 mt-0.5 flex-wrap">
              <span className="text-xs text-muted-foreground">
                {group.hasMultiple ? "Choix multiple" : "Choix unique"}
              </span>
              <span className="text-muted-foreground/40 text-xs">·</span>
              <span className="text-xs text-muted-foreground">
                {group.isRequired ? "Requis" : "Optionnel"}
              </span>
              <span className="text-muted-foreground/40 text-xs">·</span>
              <span className="text-xs text-muted-foreground">
                {group.optionChoices.length} option
                {group.optionChoices.length !== 1 ? "s" : ""}
              </span>
            </div>
          </div>
        </button>
        <div className="flex items-center gap-1 shrink-0">
          <button
            onClick={onEdit}
            className="p-1.5 hover:bg-black/5 rounded-md transition-colors"
            aria-label="Modifier"
          >
            <Pencil className="w-3.5 h-3.5 text-muted-foreground" />
          </button>
          <button
            onClick={onDelete}
            className="p-1.5 hover:bg-destructive/10 rounded-md transition-colors"
            aria-label="Supprimer"
          >
            <Trash2 className="w-3.5 h-3.5 text-destructive" />
          </button>
        </div>
      </div>

      {/* Choices */}
      {expanded && (
        <div className="border-t border-border bg-muted/50">
          {sorted.length === 0 && !addingChoice && (
            <p className="text-xs text-muted-foreground px-10 py-3 italic">
              Aucun choix — ajoutez des options ci-dessous
            </p>
          )}

          {sorted.map((choice) =>
            editingChoice?.id === choice.id ? (
              <ChoiceEditRow
                key={choice.id}
                choice={choice}
                onSave={async (payload) => {
                  const result = await updateOptionChoice(choice.id, payload);
                  if (result.error) onNotify("error", result.error);
                  else {
                    setEditingChoice(null);
                    onRefresh();
                  }
                }}
                onCancel={() => setEditingChoice(null)}
              />
            ) : (
              <div
                key={choice.id}
                className="flex items-center gap-3 px-10 py-2.5 hover:bg-muted transition-colors border-b border-border last:border-0"
              >
                <span className="flex-1 text-sm">{choice.name}</span>
                <span
                  className={cn(
                    "text-xs font-medium shrink-0",
                    parseFloat(choice.priceModifier) > 0
                      ? "text-primary"
                      : "text-muted-foreground",
                  )}
                >
                  {parseFloat(choice.priceModifier) > 0
                    ? `+${formatEuros(parseFloat(choice.priceModifier))}`
                    : "inclus"}
                </span>
                <div className="flex items-center gap-1 shrink-0">
                  <button
                    onClick={() => setEditingChoice(choice)}
                    className="p-1 hover:bg-black/5 rounded transition-colors"
                    aria-label="Modifier"
                  >
                    <Pencil className="w-3 h-3 text-muted-foreground" />
                  </button>
                  <button
                    onClick={() => setDeleteChoiceTarget(choice)}
                    className="p-1 hover:bg-destructive/10 rounded transition-colors"
                    aria-label="Supprimer"
                  >
                    <Trash2 className="w-3 h-3 text-destructive" />
                  </button>
                </div>
              </div>
            ),
          )}

          {addingChoice ? (
            <ChoiceAddRow
              groupId={group.id}
              nextOrder={sorted.length}
              onSaved={() => {
                setAddingChoice(false);
                onRefresh();
              }}
              onCancel={() => setAddingChoice(false)}
              onError={(msg) => onNotify("error", msg)}
            />
          ) : (
            <button
              onClick={() => setAddingChoice(true)}
              className="flex items-center gap-2 w-full px-10 py-2.5 text-xs text-primary font-medium hover:bg-primary/5 transition-colors"
            >
              <Plus className="w-3.5 h-3.5" />
              Ajouter un choix
            </button>
          )}
        </div>
      )}

      {/* Delete choice confirmation */}
      <Dialog
        open={!!deleteChoiceTarget}
        onOpenChange={(o) => !o && setDeleteChoiceTarget(null)}
      >
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Supprimer cette option ?</DialogTitle>
          </DialogHeader>
          <div className="p-4 space-y-4">
            <p className="text-sm text-muted-foreground">
              &ldquo;{deleteChoiceTarget?.name}&rdquo; sera supprimé
              définitivement.
            </p>
            <div className="flex gap-2 justify-end">
              <Button
                variant="outline"
                onClick={() => setDeleteChoiceTarget(null)}
                disabled={deletingChoice}
              >
                Annuler
              </Button>
              <Button
                variant="destructive"
                onClick={handleDeleteChoice}
                disabled={deletingChoice}
              >
                {deletingChoice && (
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

// ─── Inline add row ───────────────────────────────────────────────────────────

function ChoiceAddRow({
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
    <div className="flex items-center gap-2 px-10 py-2 bg-white border-t border-border">
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
        className="flex-1 h-8 px-2 text-sm border border-border rounded-sm focus:outline-none focus:ring-2 focus:ring-primary"
      />
      <input
        type="number"
        step="0.01"
        min="0"
        placeholder="0.00"
        value={price}
        onChange={(e) => setPrice(e.target.value)}
        className="w-20 h-8 px-2 text-sm border border-border rounded-sm focus:outline-none focus:ring-2 focus:ring-primary"
      />
      <span className="text-xs text-muted-foreground">€</span>
      <button
        onClick={handleSave}
        disabled={!name.trim() || saving}
        className="p-1.5 bg-primary text-white rounded-md hover:bg-primary/90 disabled:opacity-50 transition-colors"
      >
        {saving ? (
          <Loader2 className="w-3.5 h-3.5 animate-spin" />
        ) : (
          <Check className="w-3.5 h-3.5" />
        )}
      </button>
      <button
        onClick={onCancel}
        className="p-1.5 hover:bg-black/5 rounded-md transition-colors"
      >
        <X className="w-3.5 h-3.5 text-muted-foreground" />
      </button>
    </div>
  );
}

// ─── Inline edit row ──────────────────────────────────────────────────────────

function ChoiceEditRow({
  choice,
  onSave,
  onCancel,
}: {
  choice: OptionChoice;
  onSave: (payload: { name: string; priceModifier: number }) => Promise<void>;
  onCancel: () => void;
}) {
  const [name, setName] = useState(choice.name);
  const [price, setPrice] = useState(choice.priceModifier);
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    if (!name.trim()) return;
    setSaving(true);
    await onSave({ name: name.trim(), priceModifier: parseFloat(price) || 0 });
    setSaving(false);
  };

  return (
    <div className="flex items-center gap-2 px-10 py-2 bg-white border-b border-border">
      <input
        type="text"
        autoFocus
        value={name}
        onChange={(e) => setName(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter") handleSave();
          if (e.key === "Escape") onCancel();
        }}
        className="flex-1 h-8 px-2 text-sm border border-border rounded-sm focus:outline-none focus:ring-2 focus:ring-primary"
      />
      <input
        type="number"
        step="0.01"
        min="0"
        value={price}
        onChange={(e) => setPrice(e.target.value)}
        className="w-20 h-8 px-2 text-sm border border-border rounded-sm focus:outline-none focus:ring-2 focus:ring-primary"
      />
      <span className="text-xs text-muted-foreground">€</span>
      <button
        onClick={handleSave}
        disabled={!name.trim() || saving}
        className="p-1.5 bg-primary text-white rounded-md hover:bg-primary/90 disabled:opacity-50 transition-colors"
      >
        {saving ? (
          <Loader2 className="w-3.5 h-3.5 animate-spin" />
        ) : (
          <Check className="w-3.5 h-3.5" />
        )}
      </button>
      <button
        onClick={onCancel}
        className="p-1.5 hover:bg-black/5 rounded-md transition-colors"
      >
        <X className="w-3.5 h-3.5 text-muted-foreground" />
      </button>
    </div>
  );
}

// ─── Group Dialog (create/edit) ───────────────────────────────────────────────

export function GroupDialog({
  open,
  onClose,
  group,
  nextOrder,
  onSaved,
  onError,
}: {
  open: boolean;
  onClose: () => void;
  group: OptionGroup | null;
  nextOrder: number;
  onSaved: (msg: string, newGroup?: OptionGroup) => void;
  onError: (msg: string) => void;
}) {
  const [form, setForm] = useState<GroupForm>(EMPTY_GROUP_FORM);
  const [errors, setErrors] = useState<
    Partial<Record<keyof GroupForm, string>>
  >({});
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (open) {
      setForm(
        group
          ? {
              name: group.name,
              hasMultiple: group.hasMultiple,
              isRequired: group.isRequired,
              minQuantity: String(group.minQuantity),
              maxQuantity: String(group.maxQuantity),
              displayOrder: String(group.displayOrder),
            }
          : { ...EMPTY_GROUP_FORM, displayOrder: String(nextOrder) },
      );
      setErrors({});
    }
  }, [open, group, nextOrder]);

  const setField = <K extends keyof GroupForm>(key: K, value: GroupForm[K]) => {
    setForm((f) => ({ ...f, [key]: value }));
    setErrors((e) => ({ ...e, [key]: undefined }));
  };

  const validate = () => {
    const e: Partial<Record<keyof GroupForm, string>> = {};
    if (!form.name.trim()) e.name = "Requis";
    else if (form.name.length > 50) e.name = "Max 50 caractères";
    const min = parseInt(form.minQuantity);
    const max = parseInt(form.maxQuantity);
    if (isNaN(min) || min < 1) e.minQuantity = "Min 1";
    if (isNaN(max) || max < 1) e.maxQuantity = "Min 1";
    if (!isNaN(min) && !isNaN(max) && max < min) e.maxQuantity = "≥ quantité min";
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = async () => {
    if (!validate()) return;
    setSubmitting(true);
    const payload = {
      name: form.name.trim(),
      hasMultiple: form.hasMultiple,
      isRequired: form.isRequired,
      minQuantity: parseInt(form.minQuantity),
      maxQuantity: parseInt(form.maxQuantity),
      displayOrder: parseInt(form.displayOrder) || 0,
    };
    const result = group
      ? await updateOptionGroup(group.id, payload)
      : await createOptionGroup(payload);
    setSubmitting(false);
    if (result.error) onError(result.error);
    else onSaved(group ? "Groupe mis à jour" : "Groupe créé", group ? undefined : result.data);
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>
            {group ? "Modifier le groupe" : "Créer un groupe d'options"}
          </DialogTitle>
        </DialogHeader>
        <div className="p-4 space-y-4">
          {/* Name */}
          <div>
            <label className="block text-xs font-medium text-foreground/70 mb-1.5">
              Nom <span className="text-destructive">*</span>
            </label>
            <Input
              value={form.name}
              onChange={(e) => setField("name", e.target.value)}
              placeholder="Ex: Taille, Suppléments, Cuisson..."
              maxLength={50}
              error={!!errors.name}
              helperText={errors.name}
            />
          </div>

          {/* hasMultiple + isRequired */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-foreground/70 mb-1.5">
                Type de sélection
              </label>
              <div className="flex gap-1 p-1 bg-muted rounded-lg">
                <button
                  type="button"
                  onClick={() => setField("hasMultiple", false)}
                  className={cn(
                    "flex-1 px-2 py-1.5 rounded-md text-xs font-medium transition-all",
                    !form.hasMultiple
                      ? "bg-white text-foreground shadow-sm"
                      : "text-muted-foreground hover:text-foreground",
                  )}
                >
                  Unique
                </button>
                <button
                  type="button"
                  onClick={() => setField("hasMultiple", true)}
                  className={cn(
                    "flex-1 px-2 py-1.5 rounded-md text-xs font-medium transition-all",
                    form.hasMultiple
                      ? "bg-white text-foreground shadow-sm"
                      : "text-muted-foreground hover:text-foreground",
                  )}
                >
                  Multiple
                </button>
              </div>
            </div>
            <div>
              <label className="block text-xs font-medium text-foreground/70 mb-1.5">
                Obligatoire
              </label>
              <div className="flex gap-1 p-1 bg-muted rounded-lg">
                <button
                  type="button"
                  onClick={() => setField("isRequired", true)}
                  className={cn(
                    "flex-1 px-2 py-1.5 rounded-md text-xs font-medium transition-all",
                    form.isRequired
                      ? "bg-white text-foreground shadow-sm"
                      : "text-muted-foreground hover:text-foreground",
                  )}
                >
                  Oui
                </button>
                <button
                  type="button"
                  onClick={() => setField("isRequired", false)}
                  className={cn(
                    "flex-1 px-2 py-1.5 rounded-md text-xs font-medium transition-all",
                    !form.isRequired
                      ? "bg-white text-foreground shadow-sm"
                      : "text-muted-foreground hover:text-foreground",
                  )}
                >
                  Non
                </button>
              </div>
            </div>
          </div>

          {/* Quantities */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-foreground/70 mb-1.5">
                Qté min
              </label>
              <Input
                type="number"
                min="1"
                value={form.minQuantity}
                onChange={(e) => setField("minQuantity", e.target.value)}
                error={!!errors.minQuantity}
                helperText={errors.minQuantity}
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-foreground/70 mb-1.5">
                Qté max
              </label>
              <Input
                type="number"
                min="1"
                value={form.maxQuantity}
                onChange={(e) => setField("maxQuantity", e.target.value)}
                error={!!errors.maxQuantity}
                helperText={errors.maxQuantity}
              />
            </div>
          </div>

          {/* Display order */}
          <div>
            <label className="block text-xs font-medium text-foreground/70 mb-1.5">
              Ordre d&apos;affichage
            </label>
            <Input
              type="number"
              min="0"
              value={form.displayOrder}
              onChange={(e) => setField("displayOrder", e.target.value)}
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
              {group ? "Enregistrer" : "Créer"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
