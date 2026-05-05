"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useUserContext } from "@/contexts/user-context";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { User, LogOut, ChevronRight, ClipboardList, Mail, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function CustomerSheet() {
  const [open, setOpen] = useState(false);
  const supabase = createClient();
  const { user } = useUserContext();

  return (
    <>
      <button
        className="p-2 rounded-full hover:bg-black/5 transition-colors"
        onClick={() => setOpen(true)}
        aria-label="Menu"
      >
        <User className="w-5 h-5 text-gray-600" />
      </button>

      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent side="right" className="w-full sm:max-w-sm p-0">
          <SheetHeader className="px-5 py-4 border-b border-border">
            <SheetTitle>{user ? "Mon compte" : "Menu"}</SheetTitle>
          </SheetHeader>

          <div className="py-2">
            {user ? (
              <>
                <SheetLink href="/account" onClick={() => setOpen(false)}>
                  <User className="w-4 h-4" />
                  Détails du compte
                </SheetLink>
                <SheetLink href="/account/orders" onClick={() => setOpen(false)}>
                  <ClipboardList className="w-4 h-4" />
                  Historique des commandes
                </SheetLink>

                <div className="border-t border-border my-2" />

                <SheetLink href="/contact" onClick={() => setOpen(false)}>
                  <Mail className="w-4 h-4" />
                  Nous contacter
                </SheetLink>
                <SheetLink href="/legal" onClick={() => setOpen(false)}>
                  <FileText className="w-4 h-4" />
                  Mentions légales
                </SheetLink>

                <div className="border-t border-border my-2" />

                <div className="px-4">
                  <Button
                    variant="outline"
                    className="w-full text-red-600 border-red-200 hover:bg-red-50"
                    onClick={() => {
                      supabase.auth.signOut();
                      setOpen(false);
                    }}
                  >
                    <LogOut className="w-4 h-4 mr-2" />
                    Se déconnecter
                  </Button>
                </div>
              </>
            ) : (
              <>
                <SheetLink href="/login" onClick={() => setOpen(false)}>
                  <User className="w-4 h-4" />
                  Se connecter
                </SheetLink>
                <SheetLink href="/register" onClick={() => setOpen(false)}>
                  <User className="w-4 h-4" />
                  Créer un compte
                </SheetLink>

                <div className="border-t border-border my-2" />

                <SheetLink href="/contact" onClick={() => setOpen(false)}>
                  <Mail className="w-4 h-4" />
                  Nous contacter
                </SheetLink>
                <SheetLink href="/legal" onClick={() => setOpen(false)}>
                  <FileText className="w-4 h-4" />
                  Mentions légales
                </SheetLink>
              </>
            )}
          </div>
        </SheetContent>
      </Sheet>
    </>
  );
}

function SheetLink({
  href,
  onClick,
  children,
}: {
  href: string;
  onClick?: () => void;
  children: React.ReactNode;
}) {
  return (
    <a
      href={href}
      onClick={onClick}
      className="flex items-center gap-3 px-5 py-3 text-sm hover:bg-black/[0.03] transition-colors"
    >
      {children}
      <ChevronRight className="w-4 h-4 ml-auto text-gray-400" />
    </a>
  );
}
