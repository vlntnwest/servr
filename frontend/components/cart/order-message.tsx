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
    <div className="mx-4 border border-border rounded-xl overflow-hidden">
      <button
        type="button"
        onClick={() => {
          if (!open) setDraft(message);
          setOpen((v) => !v);
        }}
        className="w-full flex items-center justify-between px-4 py-3 text-left hover:bg-black/[0.02] transition-colors"
      >
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2.5">
            <MessageSquare className="w-4 h-4 text-muted-foreground shrink-0" />
            <span className="text-sm font-medium flex-1">
              Indications pour le restaurant
            </span>
            {!open && !message && (
              <span className="text-xs font-medium text-primary">Ajouter</span>
            )}
            <ChevronDown
              className={`w-4 h-4 text-muted-foreground transition-transform duration-200 shrink-0 ${open ? "rotate-180" : ""}`}
            />
          </div>
          {!open && (
            <p className="text-xs text-muted-foreground truncate mt-0.5 pl-6">
              {message || "Aucune indication renseignée"}
            </p>
          )}
        </div>
      </button>

      {open && (
        <div className="px-4 pb-4">
          <textarea
            className="w-full text-sm border border-border rounded-md px-3 py-2.5 resize-none focus:outline-none focus:ring-2 focus:ring-primary/30 placeholder:text-muted-foreground"
            rows={4}
            placeholder="Ex. : « Merci de ne pas mettre de riz »"
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
          />
          <Button
            className="w-full mt-2 h-12 rounded-full"
            onClick={handleSave}
          >
            Enregistrer
          </Button>
        </div>
      )}
    </div>
  );
}
