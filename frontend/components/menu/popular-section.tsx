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
        className="flex flex-col min-w-[152px] max-w-[152px] bg-white border border-black/5 rounded-md overflow-hidden text-left hover:bg-gray-50 transition-colors flex-shrink-0"
        onClick={() => setOpen(true)}
      >
        {product.imageUrl && (
          <Image
            src={product.imageUrl}
            alt={product.name}
            width={152}
            height={152}
            className="w-full aspect-square object-cover"
          />
        )}
        <div className="flex flex-col flex-1 p-2 gap-1">
          <p className="font-bold text-sm leading-tight flex-1">{product.name}</p>
          <p className="text-sm text-[#676767]">{formatEuros(price)}</p>
          <div className="border border-black/10 rounded text-black/25 flex items-center justify-center mt-1 min-h-[34px]">
            <Plus className="w-4 h-4" />
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
    <div className="pt-4">
      <h2 className="font-bold text-2xl px-4 mb-3">Populaire</h2>
      <div className="flex gap-2 px-4 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden scroll-smooth snap-x snap-mandatory">
        {products.map((product) => (
          <div key={product.id} className="snap-center">
            <PopularCard product={product} />
          </div>
        ))}
      </div>
    </div>
  );
}
