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
        className="flex flex-col min-w-[160px] max-w-[160px] bg-background border border-brand-border rounded-card overflow-hidden text-left hover:bg-card transition-colors flex-shrink-0 shadow-sm shadow-black/5"
        onClick={() => setOpen(true)}
      >
        {product.imageUrl && (
          <Image
            src={product.imageUrl}
            alt={product.name}
            width={160}
            height={160}
            className="w-full aspect-square object-cover"
            style={{ height: "auto" }}
          />
        )}
        <div className="flex flex-col flex-1 p-3 gap-1.5">
          <p className="font-sans font-semibold text-body-sm leading-tight flex-1 text-foreground">
            {product.name}
          </p>
          <p className="text-body-sm font-sans-medium text-muted-foreground">
            {formatEuros(price)}
          </p>
          <div className="bg-primary text-primary-foreground rounded-pill flex items-center justify-center mt-1 h-9">
            <Plus className="w-4 h-4" strokeWidth={2.5} />
          </div>
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
    <div className="pt-6 pl-5">
      <h2 className="font-display text-display-sm tracking-tighter leading-none mb-4 text-foreground">
        Populaire
      </h2>
      <div className="flex gap-3 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden scroll-smooth snap-x snap-mandatory pr-5">
        {products.map((product) => (
          <div key={product.id} className="snap-center">
            <PopularCard product={product} />
          </div>
        ))}
      </div>
    </div>
  );
}
