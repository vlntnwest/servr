"use client";

import { useState } from "react";
import { ChevronDown, MessageSquare } from "lucide-react";
import { useCart } from "@/contexts/cart-context";
import { Button } from "@/components/ui/button";

export default function OrderMessage() {
  const { message, setMessage } = useCart();
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState(message);

  const handleSave = () => {
    setMessage(draft);
    setOpen(false);
  };

  return (
    <div className="mx-4 border border-brand-border bg-white rounded-card overflow-hidden">
      <button
        type="button"
        onClick={() => {
          if (!open) setDraft(message);
          setOpen((v) => !v);
        }}
        className="w-full flex items-center justify-between px-4 py-4 text-left hover:bg-brand-ink/[0.02] transition-colors"
      >
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2.5">
            <MessageSquare className="w-4 h-4 text-brand-stone shrink-0" />
            <span className="text-body-sm font-semibold flex-1 text-brand-ink">
              Indications pour le restaurant
            </span>
            {!open && !message && (
              <span className="text-caption font-semibold text-brand-orange uppercase tracking-pill">
                Ajouter
              </span>
            )}
            <ChevronDown
              className={`w-4 h-4 text-brand-stone transition-transform duration-200 shrink-0 ${open ? "rotate-180" : ""}`}
            />
          </div>
          {!open && (
            <p className="text-caption text-brand-stone truncate mt-1 pl-6">
              {message || "Aucune indication renseignée"}
            </p>
          )}
        </div>
      </button>

      {open && (
        <div className="px-4 pb-4">
          <textarea
            className="w-full text-body-sm border border-brand-border rounded-note px-3 py-2.5 resize-none focus:outline-none focus:border-brand-ink placeholder:text-brand-stone transition-colors"
            rows={4}
            placeholder="Ex. : « Merci de ne pas mettre de riz »"
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
          />
          <Button
            className="w-full mt-3 h-12 rounded-full bg-brand-orange hover:bg-brand-orange/90 text-body font-semibold tracking-cta text-brand-cream"
            onClick={handleSave}
          >
            Enregistrer
          </Button>
        </div>
      )}
    </div>
  );
}
