"use client";

import { useEffect, useState, useCallback } from "react";
import {
  getExceptionalHours,
  createExceptionalHour,
  deleteExceptionalHour,
} from "@/lib/api";
import type { ExceptionalHour } from "@/types/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import { Plus, Trash2, Loader2, CalendarOff } from "lucide-react";
import dayjs from "dayjs";
import "dayjs/locale/fr";

dayjs.locale("fr");

export default function ExceptionalHoursSection() {
  const [hours, setHours] = useState<ExceptionalHour[]>([]);
  const [loading, setLoading] = useState(true);
  const [createOpen, setCreateOpen] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    const data = await getExceptionalHours();
    setHours(data);
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const handleDelete = async (id: string) => {
    await deleteExceptionalHour(id);
    await load();
  };

  return (
    <div className="mt-8">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-sm font-semibold">Horaires exceptionnels</h3>
          <p className="text-xs text-muted-foreground">
            Fermetures et horaires spéciaux (jours fériés, etc.)
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={() => setCreateOpen(true)}>
          <Plus className="w-4 h-4 mr-1" />
          Ajouter
        </Button>
      </div>

      {loading ? (
        <div className="text-sm text-muted-foreground">Chargement...</div>
      ) : hours.length === 0 ? (
        <div className="text-center py-8 border-2 border-dashed border-black/10 rounded-xl">
          <CalendarOff className="w-8 h-8 text-muted-foreground/40 mx-auto mb-2" />
          <p className="text-xs text-muted-foreground">
            Aucun horaire exceptionnel configuré
          </p>
        </div>
      ) : (
        <div className="border border-border rounded-lg overflow-hidden">
          {hours.map((h, i) => (
            <div
              key={h.id}
              className={cn(
                "flex items-center gap-3 px-4 py-3 hover:bg-muted transition-colors",
                i !== hours.length - 1 && "border-b border-border",
              )}
            >
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <p className="text-sm font-medium">
                    {dayjs(h.date).format("dddd D MMMM YYYY")}
                  </p>
                  <span
                    className={cn(
                      "text-xs px-2 py-0.5 rounded-full font-medium",
                      h.isClosed
                        ? "bg-destructive/15 text-destructive"
                        : "bg-primary/15 text-primary",
                    )}
                  >
                    {h.isClosed
                      ? "Fermé"
                      : `${h.openTime} - ${h.closeTime}`}
                  </span>
                </div>
                {h.label && (
                  <p className="text-xs text-muted-foreground mt-0.5">{h.label}</p>
                )}
              </div>
              <button
                className="p-2 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-lg transition-colors"
                onClick={() => handleDelete(h.id)}
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          ))}
        </div>
      )}

      <CreateExceptionalHourDialog
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        onCreated={() => {
          setCreateOpen(false);
          load();
        }}
      />
    </div>
  );
}

function CreateExceptionalHourDialog({
  open,
  onClose,
  onCreated,
}: {
  open: boolean;
  onClose: () => void;
  onCreated: () => void;
}) {
  const [date, setDate] = useState("");
  const [isClosed, setIsClosed] = useState(true);
  const [openTime, setOpenTime] = useState("");
  const [closeTime, setCloseTime] = useState("");
  const [label, setLabel] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (open) {
      setDate("");
      setIsClosed(true);
      setOpenTime("");
      setCloseTime("");
      setLabel("");
      setError("");
    }
  }, [open]);

  const handleSubmit = async () => {
    if (!date) {
      setError("Date requise");
      return;
    }
    if (!isClosed && (!openTime || !closeTime)) {
      setError("Horaires requis pour une journée ouverte");
      return;
    }
    setSubmitting(true);
    const result = await createExceptionalHour({
      date,
      isClosed,
      ...(isClosed ? {} : { openTime, closeTime }),
      ...(label ? { label } : {}),
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
          <DialogTitle>Ajouter un horaire exceptionnel</DialogTitle>
        </DialogHeader>
        <div className="p-4 space-y-4">
          {error && (
            <p className="text-sm text-destructive bg-destructive/10 border border-destructive/20 px-3 py-2 rounded-lg">
              {error}
            </p>
          )}

          <div>
            <label className="block text-xs font-medium text-foreground/70 mb-1.5">
              Date <span className="text-destructive">*</span>
            </label>
            <Input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-foreground/70 mb-1.5">
              Type
            </label>
            <div className="flex gap-1 p-1 bg-muted rounded-lg">
              {[
                { value: true, label: "Fermé" },
                { value: false, label: "Horaires modifiés" },
              ].map((opt) => (
                <button
                  key={String(opt.value)}
                  type="button"
                  onClick={() => setIsClosed(opt.value)}
                  className={cn(
                    "flex-1 px-3 py-1.5 rounded-md text-xs font-medium transition-all",
                    isClosed === opt.value
                      ? "bg-white text-foreground shadow-sm"
                      : "text-muted-foreground hover:text-foreground",
                  )}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          {!isClosed && (
            <div className="flex gap-3">
              <div className="flex-1">
                <label className="block text-xs font-medium text-foreground/70 mb-1.5">
                  Ouverture
                </label>
                <Input
                  type="time"
                  value={openTime}
                  onChange={(e) => setOpenTime(e.target.value)}
                />
              </div>
              <div className="flex-1">
                <label className="block text-xs font-medium text-foreground/70 mb-1.5">
                  Fermeture
                </label>
                <Input
                  type="time"
                  value={closeTime}
                  onChange={(e) => setCloseTime(e.target.value)}
                />
              </div>
            </div>
          )}

          <div>
            <label className="block text-xs font-medium text-foreground/70 mb-1.5">
              Motif (optionnel)
            </label>
            <Input
              placeholder="Ex : Jour férié"
              value={label}
              onChange={(e) => setLabel(e.target.value)}
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
              Ajouter
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
