"use client";

import { useState } from "react";
import Image from "next/image";
import { Plus } from "lucide-react";
import type { Product } from "@/types/api";
import { formatEuros } from "@/lib/utils";
import ProductDetailSheet from "./product-detail-sheet";

function PopularCard({ product }: { product: Product }) {
  const [open, setOpen] = useState(false);
  const price = parseFloat(product.price);

  return (
    <>
      <button
        className="flex flex-col w-[230px] p-3 bg-white border border-brand-border text-brand-ink rounded-card overflow-hidden text-left flex-shrink-0 transition-colors hover:border-brand-ink/40 hover:cursor-pointer"
        onClick={() => setOpen(true)}
      >
        {product.imageUrl && (
          <Image
            src={product.imageUrl}
            alt={product.name}
            width={206}
            height={156}
            className="w-full aspect-[4/3] object-cover rounded-note"
          />
        )}
        <div className="flex flex-col flex-1 pt-3 gap-1">
          <p className="font-display-italic italic font-black text-card-name leading-none text-brand-ink line-clamp-2">
            {product.name}
          </p>
          <p className="text-body-sm font-semibold text-brand-ink tracking-tight mt-1">
            {formatEuros(price)}
          </p>
        </div>
      </button>

      <ProductDetailSheet
        product={product}
        open={open}
        onClose={() => setOpen(false)}
      />
    </>
  );
}

interface PopularSectionProps {
  products: Product[];
}

export default function PopularSection({ products }: PopularSectionProps) {
  if (products.length === 0) return null;

  return (
    <div className="pt-4">
      <div className="px-4 mb-4 flex items-baseline gap-3">
        <h2 className="font-display text-display-sm tracking-tight text-brand-ink">
          Populaire
        </h2>
        <span className="text-caption uppercase tracking-label text-brand-stone font-medium">
          La sélection
        </span>
      </div>
      <div className="flex gap-3 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden scroll-smooth snap-x snap-mandatory overflow-y-visible px-4">
        {products.map((product) => (
          <div key={product.id} className="snap-start">
            <PopularCard product={product} />
          </div>
        ))}
      </div>
    </div>
  );
}
