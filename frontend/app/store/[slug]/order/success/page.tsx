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
    <div className="min-h-screen flex items-center justify-center p-5 bg-background">
      <div className="text-center max-w-sm">
        <div className="w-20 h-20 rounded-full bg-brand-lime mx-auto mb-6 flex items-center justify-center">
          <CheckCircle
            className="w-10 h-10 text-brand-forest"
            strokeWidth={2.5}
          />
        </div>
        <h1 className="font-display text-display-sm tracking-tighter leading-none mb-3 text-foreground">
          Commande confirmée<span className="text-primary">.</span>
        </h1>
        <p className="text-body text-muted-foreground mb-6 leading-relaxed">
          Merci pour votre commande. Vous recevrez une confirmation par email.
        </p>
        {session_id && (
          <p className="text-action text-muted-foreground mb-6 font-mono">
            Réf : {session_id.slice(-8)}
          </p>
        )}
        <Button asChild>
          <Link href={`/store/${slug}`}>Retour au menu</Link>
        </Button>
      </div>
    </div>
  );
}
