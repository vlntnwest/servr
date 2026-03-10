import { Suspense } from "react";
import AcceptInvitationClient from "./accept-client";
import { Loader2 } from "lucide-react";

export default function AcceptInvitationPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      }
    >
      <AcceptInvitationClient />
    </Suspense>
  );
}
