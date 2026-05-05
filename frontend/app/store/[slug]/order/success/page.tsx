import Link from "next/link";
import { CheckCircle } from "lucide-react";
import { Button } from "@/components/ui/button";

export default async function StoreOrderSuccessPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ session_id?: string }>;
}) {
  const { slug } = await params;
  const { session_id } = await searchParams;

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="text-center max-w-sm">
        <CheckCircle className="w-16 h-16 text-brand-lime mx-auto mb-4" />
        <h1 className="text-2xl font-bold mb-2">Commande confirmée !</h1>
        <p className="text-muted-foreground mb-6">
          Merci pour votre commande. Vous recevrez une confirmation par email.
        </p>
        {session_id && (
          <p className="text-xs text-muted-foreground mb-4 font-mono">
            Réf: {session_id.slice(-8)}
          </p>
        )}
        <Button asChild>
          <Link href={`/store/${slug}`}>Retour au menu</Link>
        </Button>
      </div>
    </div>
  );
}
