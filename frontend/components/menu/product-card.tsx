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
        className={`w-full text-left bg-background border border-brand-border transition-colors rounded-card overflow-hidden p-5 shadow-sm shadow-black/5 ${
          isUnavailable ? "opacity-50 cursor-not-allowed" : "hover:bg-card"
        }`}
        onClick={() => !isUnavailable && setOpen(true)}
        disabled={isUnavailable}
      >
        <div className="flex items-stretch gap-4">
          {/* Text content */}
          <div className="flex-1 min-w-0">
            <p className="font-sans font-semibold text-card-name leading-tight text-foreground">
              {product.name}
            </p>
            <p className="text-muted-foreground text-body-sm line-clamp-2 mt-1">
              {product.description}
            </p>
            <p className="text-body-sm mt-2 font-sans-medium text-foreground">
              {formatEuros(price)}
              {isUnavailable && (
                <span className="text-destructive"> · Indisponible</span>
              )}
              {!isUnavailable && product.tags.includes("bestseller") && (
                <span className="text-primary"> · Populaire</span>
              )}
            </p>
          </div>

          {/* Product image */}
          {product.imageUrl && (
            <div className="shrink-0 flex items-center">
              <Image
                src={product.imageUrl}
                alt={product.name}
                width={100}
                height={100}
                className={`rounded-swatch object-cover aspect-square ${isUnavailable ? "grayscale" : ""}`}
              />
            </div>
          )}

          {/* Add button */}
          {!isUnavailable && (
            <div className="shrink-0 w-11 self-center flex items-center justify-center text-primary-foreground bg-primary hover:bg-primary/90 transition-colors rounded-full aspect-square shadow-sm shadow-black/5">
              <Plus className="w-5 h-5" strokeWidth={2.5} />
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
