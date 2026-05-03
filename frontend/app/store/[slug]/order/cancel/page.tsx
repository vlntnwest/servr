import Link from "next/link";
import { XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";

export default async function StoreOrderCancelPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;

  return (
    <div className="min-h-screen flex items-center justify-center p-5 bg-background">
      <div className="text-center max-w-sm">
        <div className="w-20 h-20 rounded-full bg-brand-maroon mx-auto mb-6 flex items-center justify-center">
          <XCircle className="w-10 h-10 text-brand-pink" strokeWidth={2.5} />
        </div>
        <h1 className="font-display text-display-sm tracking-tighter leading-none mb-3 text-foreground">
          Commande annulée<span className="text-primary">.</span>
        </h1>
        <p className="text-body text-muted-foreground mb-6 leading-relaxed">
          Votre paiement a été annulé. Votre panier est conservé.
        </p>
        <Button asChild>
          <Link href={`/store/${slug}`}>Retour au menu</Link>
        </Button>
      </div>
    </div>
  );
}
