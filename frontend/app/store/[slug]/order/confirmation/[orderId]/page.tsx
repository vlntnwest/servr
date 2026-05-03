import Link from "next/link";
import { CheckCircle } from "lucide-react";
import { Button } from "@/components/ui/button";

async function getOrder(orderId: string) {
  try {
    const res = await fetch(
      `${process.env.NEXT_PUBLIC_API_URL}/api/orders/${orderId}`,
      { cache: "no-store" }
    );
    if (!res.ok) return null;
    const { data } = await res.json();
    return data;
  } catch {
    return null;
  }
}

export default async function StoreOrderConfirmationPage({
  params,
}: {
  params: Promise<{ slug: string; orderId: string }>;
}) {
  const { slug, orderId } = await params;
  const order = await getOrder(orderId);

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
        <p className="text-body text-muted-foreground mb-2 leading-relaxed">
          Votre commande a bien été enregistrée.
        </p>
        <p className="text-body text-muted-foreground mb-6 leading-relaxed">
          Paiement à régler sur place lors du retrait.
        </p>
        <p className="font-display-italic text-card-label leading-none text-foreground mb-6">
          #{order?.orderNumber ?? orderId.slice(-6)}
        </p>
        <Button asChild>
          <Link href={`/store/${slug}`}>Retour au menu</Link>
        </Button>
      </div>
    </div>
  );
}
