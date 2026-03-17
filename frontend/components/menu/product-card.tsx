"use client";

import { useState } from "react";
import Image from "next/image";
import { Plus } from "lucide-react";
import type { Product } from "@/types/api";
import { formatEuros } from "@/lib/utils";
import ProductDetailSheet from "./product-detail-sheet";

interface ProductCardProps {
  product: Product;
}

export default function ProductCard({ product }: ProductCardProps) {
  const [open, setOpen] = useState(false);
  const price = parseFloat(product.price);

  return (
    <>
      <button
        className="w-full text-left bg-white border border-black/5 hover:bg-gray-50 transition-colors rounded-sm overflow-hidden p-4"
        onClick={() => setOpen(true)}
      >
        <div className="flex items-stretch">
          {/* Text content */}
          <div className="flex-1 min-w-0">
            <p className="font-bold text-base leading-tight">{product.name}</p>
            <p className="text-[#676767] text-sm line-clamp-2 mt-0.5">
              {product.description}
            </p>
            <p className="text-sm mt-1 text-[#676767]">
              {formatEuros(price)}
              {product.tags.includes("bestseller") && (
                <span className="text-[#e67400]"> · Populaire</span>
              )}
            </p>
          </div>

          {/* Product image */}
          {product.imageUrl && (
            <div className="shrink-0 flex items-center ml-4">
              <Image
                src={product.imageUrl}
                alt={product.name}
                width={100}
                height={100}
                className="rounded object-cover aspect-square"
              />
            </div>
          )}

          {/* Full-height add button */}
          <div className="shrink-0 w-10 border border-black/8 flex items-center justify-center text-black/25 bg-transparent hover:bg-black/4 transition-colors rounded-sm ml-4">
            <Plus className="w-5 h-5" />
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
