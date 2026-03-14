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
        <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
        <h1 className="text-2xl font-bold mb-2">Commande confirmée !</h1>
        <p className="text-[#676767] mb-2">
          Votre commande a bien été enregistrée.
        </p>
        <p className="text-[#676767] mb-6">
          Paiement à régler sur place lors du retrait.
        </p>
        <p className="text-xs text-[#676767] mb-4 font-mono">
          Commande #{order?.orderNumber ?? orderId.slice(-8)}
        </p>
        <Button asChild>
          <Link href={`/store/${slug}`}>Retour au menu</Link>
        </Button>
      </div>
    </div>
  );
}
