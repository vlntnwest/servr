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
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="text-center max-w-sm">
        <XCircle
          className="w-14 h-14 text-destructive mx-auto mb-5"
          strokeWidth={1.5}
        />
        <h1 className="font-display-italic italic font-black text-[28px] leading-none text-brand-ink mb-3">
          Commande annulée
        </h1>
        <p className="text-body text-brand-stone mb-7">
          Votre paiement a été annulé. Votre panier est conservé.
        </p>
        <Button
          asChild
          className="rounded-full h-12 px-6 bg-brand-orange text-brand-cream hover:bg-brand-orange/90 text-body font-semibold tracking-cta"
        >
          <Link href={`/store/${slug}`}>Retour au menu</Link>
        </Button>
      </div>
    </div>
  );
}
