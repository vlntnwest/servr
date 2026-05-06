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
        className="flex flex-col w-[250px] p-3 bg-white text-brand-ink rounded-2xl overflow-hidden text-left flex-shrink-0 hover:shadow-lg transition-shadow hover:cursor-pointer"
        onClick={() => setOpen(true)}
      >
        {product.imageUrl && (
          <Image
            src={product.imageUrl}
            alt={product.name}
            width={152}
            height={152}
            className="w-full aspect-[4/3] object-cover rounded-xl"
          />
        )}
        <div className="flex flex-row justify-between flex-1 pt-2 gap-1">
          <div>
            <p className="font-display text-md leading-tight flex-1">
              {product.name}
            </p>
            <p className="text-sm">{formatEuros(price)}</p>
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
    <div className="pt-4 pl-4">
      <h2 className="font-bold text-2xl mb-3">Populaire</h2>
      <div className="flex gap-2 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden scroll-smooth snap-x snap-mandatory overflow-y-visible">
        {products.map((product) => (
          <div key={product.id} className="snap-center">
            <PopularCard product={product} />
          </div>
        ))}
      </div>
    </div>
  );
}
