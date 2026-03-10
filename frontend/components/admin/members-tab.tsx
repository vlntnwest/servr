"use client";

import { useEffect, useState, useCallback } from "react";
import { Plus, Loader2, Check, AlertCircle, Mail } from "lucide-react";
import { getMembers, inviteMember } from "@/lib/api";
import type { RestaurantMember } from "@/types/api";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

type Notification = { type: "success" | "error"; message: string } | null;

const ROLE_COLORS: Record<string, string> = {
  OWNER: "bg-purple-100 text-purple-800",
  ADMIN: "bg-blue-100 text-blue-800",
  STAFF: "bg-gray-100 text-gray-700",
};

const ROLE_LABELS: Record<string, string> = {
  OWNER: "Propriétaire",
  ADMIN: "Admin",
  STAFF: "Staff",
};

export default function MembersTab() {
  const [members, setMembers] = useState<RestaurantMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [inviteOpen, setInviteOpen] = useState(false);
  const [notification, setNotification] = useState<Notification>(null);

  const notify = useCallback((type: "success" | "error", message: string) => {
    setNotification({ type, message });
    setTimeout(() => setNotification(null), 3500);
  }, []);

  const loadMembers = useCallback(async () => {
    setLoading(true);
    const data = await getMembers();
    setMembers(data.data);
    setLoading(false);
  }, []);

  useEffect(() => {
    loadMembers();
  }, [loadMembers]);

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
          {members.length} membre{members.length !== 1 ? "s" : ""}
        </p>
        <Button onClick={() => setInviteOpen(true)}>
          <Plus className="w-4 h-4 mr-1" />
          Ajouter un membre
        </Button>
      </div>

      {loading ? (
        <div className="space-y-2">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-16 rounded-lg" />
          ))}
        </div>
      ) : members.length === 0 ? (
        <div className="text-center py-16 border-2 border-dashed border-black/10 rounded-xl">
          <Mail className="w-10 h-10 text-gray-300 mx-auto mb-3" />
          <p className="text-sm font-medium text-[#676767]">Aucun membre</p>
          <p className="text-xs text-gray-400 mt-1">
            Invitez des collaborateurs pour gérer ce restaurant
          </p>
          <Button
            variant="outline"
            className="mt-4"
            onClick={() => setInviteOpen(true)}
          >
            <Plus className="w-4 h-4 mr-1" />
            Ajouter un membre
          </Button>
        </div>
      ) : (
        <div className="border border-black/8 rounded-lg overflow-hidden">
          {members.map((member, i) => (
            <div
              key={member.id}
              className={cn(
                "flex items-center gap-4 px-4 py-3.5 hover:bg-gray-50 transition-colors",
                i !== members.length - 1 && "border-b border-black/5",
              )}
            >
              <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                <span className="text-sm font-bold text-primary">
                  {(member.user.fullName ?? member.user.email)
                    .charAt(0)
                    .toUpperCase()}
                </span>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold truncate">
                  {member.user.fullName ?? member.user.email}
                </p>
                <p className="text-xs text-[#676767] truncate">
                  {member.user.email}
                </p>
              </div>
              <span
                className={cn(
                  "text-xs px-2 py-0.5 rounded-full font-medium shrink-0",
                  ROLE_COLORS[member.role] ?? "bg-gray-100 text-gray-700",
                )}
              >
                {ROLE_LABELS[member.role] ?? member.role}
              </span>
            </div>
          ))}
        </div>
      )}

      <InviteDialog
        open={inviteOpen}
        onClose={() => setInviteOpen(false)}
        onInvited={(email) => {
          setInviteOpen(false);
          notify("success", `Invitation envoyée à ${email}`);
        }}
        onError={(msg) => notify("error", msg)}
      />
    </div>
  );
}

function InviteDialog({
  open,
  onClose,
  onInvited,
  onError,
}: {
  open: boolean;
  onClose: () => void;
  onInvited: (email: string) => void;
  onError: (msg: string) => void;
}) {
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<"ADMIN" | "STAFF">("STAFF");
  const [submitting, setSubmitting] = useState(false);
  const [emailError, setEmailError] = useState("");

  useEffect(() => {
    if (open) {
      setEmail("");
      setRole("STAFF");
      setEmailError("");
    }
  }, [open]);

  const handleSubmit = async () => {
    if (!email.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setEmailError("Adresse email invalide");
      return;
    }
    setSubmitting(true);
    const result = await inviteMember(email.trim(), role);
    setSubmitting(false);
    if (result.error) {
      onError(result.error);
    } else {
      onInvited(email.trim());
    }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>Inviter un membre</DialogTitle>
        </DialogHeader>
        <div className="p-4 space-y-4">
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1.5">
              Email <span className="text-red-500">*</span>
            </label>
            <Input
              type="email"
              placeholder="collaborateur@exemple.com"
              value={email}
              onChange={(e) => {
                setEmail(e.target.value);
                setEmailError("");
              }}
              onKeyDown={(e) => e.key === "Enter" && handleSubmit()}
              error={!!emailError}
              helperText={emailError}
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1.5">
              Rôle
            </label>
            <div className="flex gap-1 p-1 bg-gray-100 rounded-lg">
              {(["STAFF", "ADMIN"] as const).map((r) => (
                <button
                  key={r}
                  type="button"
                  onClick={() => setRole(r)}
                  className={cn(
                    "flex-1 px-3 py-1.5 rounded-md text-xs font-medium transition-all",
                    role === r
                      ? "bg-white text-gray-900 shadow-sm"
                      : "text-gray-600 hover:text-gray-900",
                  )}
                >
                  {r === "STAFF" ? "Staff" : "Admin"}
                </button>
              ))}
            </div>
            <p className="text-[11px] text-[#676767] mt-1.5">
              {role === "ADMIN"
                ? "Peut gérer les produits, commandes et membres."
                : "Peut consulter et gérer les commandes."}
            </p>
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
              {submitting && (
                <Loader2 className="w-4 h-4 mr-1 animate-spin" />
              )}
              Envoyer l&apos;invitation
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
