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
        <CheckCircle
          className="w-14 h-14 text-brand-forest mx-auto mb-5"
          strokeWidth={1.5}
        />
        <h1 className="font-display-italic italic font-black text-[28px] leading-none text-brand-ink mb-3">
          Commande confirmée
        </h1>
        <p className="text-body text-brand-stone mb-6">
          Merci pour votre commande. Vous recevrez une confirmation par email.
        </p>
        {session_id && (
          <p className="text-caption uppercase tracking-label text-brand-stone mb-6">
            Réf · {session_id.slice(-8)}
          </p>
        )}
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
