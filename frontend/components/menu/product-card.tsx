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

  const isUnavailable = !product.isAvailable;

  return (
    <>
      <button
        className={`w-full text-left bg-white border border-brand-border transition-colors rounded-sm overflow-hidden p-4 ${
          isUnavailable ? "opacity-50 cursor-not-allowed" : "hover:bg-muted"
        }`}
        onClick={() => !isUnavailable && setOpen(true)}
        disabled={isUnavailable}
      >
        <div className="flex items-stretch">
          {/* Text content */}
          <div className="flex-1 min-w-0">
            <p className="font-bold text-base leading-tight">{product.name}</p>
            <p className="text-muted-foreground text-sm line-clamp-2 mt-0.5">
              {product.description}
            </p>
            <p className="text-sm mt-1 text-muted-foreground">
              {formatEuros(price)}
              {isUnavailable && (
                <span className="text-destructive"> · Indisponible</span>
              )}
              {!isUnavailable && product.tags.includes("bestseller") && (
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
                className={`rounded object-cover aspect-square ${isUnavailable ? "grayscale" : ""}`}
              />
            </div>
          )}

          {/* Full-height add button */}
          {!isUnavailable && (
            <div className="shrink-0 w-10 border border-border flex items-center justify-center text-black/25 bg-transparent hover:bg-black/4 transition-colors rounded-sm ml-4">
              <Plus className="w-5 h-5" />
            </div>
          )}
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
