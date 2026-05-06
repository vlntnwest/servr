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
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="text-center max-w-sm">
        <CheckCircle
          className="w-14 h-14 text-brand-forest mx-auto mb-5"
          strokeWidth={1.5}
        />
        <h1 className="font-display-italic italic font-black text-[28px] leading-none text-brand-ink mb-3">
          Commande confirmée
        </h1>
        <p className="text-body text-brand-stone mb-1">
          Votre commande a bien été enregistrée.
        </p>
        <p className="text-body text-brand-stone mb-6">
          Paiement à régler sur place lors du retrait.
        </p>
        <p className="text-caption uppercase tracking-label text-brand-stone mb-7">
          Commande · #{order?.orderNumber ?? orderId.slice(-8)}
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
