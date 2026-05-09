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
        className="group w-full text-left bg-white border border-brand-border rounded-card overflow-hidden p-4 transition-colors hover:border-brand-ink/40 hover:cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed disabled:hover:border-brand-border"
        onClick={() => !isUnavailable && setOpen(true)}
        disabled={isUnavailable}
      >
        <div className="flex items-stretch gap-4">
          {/* Product image */}
          {product.imageUrl && (
            <div className="shrink-0 flex items-center">
              <Image
                src={product.imageUrl}
                alt={product.name}
                width={104}
                height={104}
                className={`rounded-card object-cover aspect-square ${isUnavailable ? "grayscale" : ""}`}
              />
            </div>
          )}

          {/* Text content */}
          <div className="flex-1 min-w-0 flex flex-col">
            <p className="font-display-italic italic font-black text-card-name leading-none text-brand-ink">
              {product.name}
            </p>
            {product.description && (
              <p className="text-body-sm text-brand-stone line-clamp-2 mt-2">
                {product.description}
              </p>
            )}
            <div className="mt-auto pt-2 flex items-center gap-2 text-body-sm">
              <span className="font-semibold text-brand-ink tracking-tight">
                {formatEuros(price)}
              </span>
              {isUnavailable && (
                <span className="text-brand-stone uppercase tracking-pill text-caption">
                  · Indisponible
                </span>
              )}
              {!isUnavailable && product.tags.includes("bestseller") && (
                <span className="text-brand-orange uppercase tracking-pill text-caption font-semibold">
                  · Populaire
                </span>
              )}
            </div>
          </div>

          {/* Add button — pill, ink on cream */}
          {!isUnavailable && (
            <div className="self-center shrink-0 w-9 h-9 border border-brand-border bg-brand-cream/0 group-hover:bg-brand-ink group-hover:border-brand-ink group-hover:text-brand-cream flex items-center justify-center text-brand-ink transition-colors rounded-full">
              <Plus className="w-4 h-4" strokeWidth={2.25} />
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
