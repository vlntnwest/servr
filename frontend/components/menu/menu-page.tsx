"use client";

import type { Category } from "@/types/api";
import { CategorySection } from "./category-section";
import Cart from "@/components/cart/cart";
import PopularSection from "./popular-section";

interface MenuPageProps {
  categories: Category[];
}

export default function MenuPage({ categories }: MenuPageProps) {
  const popularProducts = categories
    .flatMap((cat) => cat.productCategories.map((pc) => pc.product))
    .filter(
      (product, index, self) =>
        product.tags.includes("bestseller") &&
        self.findIndex((p) => p.id === product.id) === index
    );

  return (
    <div className="flex max-w-screen-2xl mx-auto">
      {/* Menu content */}
      <div className="flex-1 min-w-0 max-w-full md:max-w-[60%] lg:max-w-[70%]">
        <div className="pb-20 md:pb-6">
          <PopularSection products={popularProducts} />
          {categories.map((cat) => (
            <CategorySection key={cat.id} category={cat} />
          ))}
        </div>
      </div>

      {/* Desktop cart */}
      <div className="hidden md:block w-[420px] flex-shrink-0">
        <div className="sticky top-[65px] h-[calc(100vh-65px)] p-4 pl-0">
          <div className="h-full border border-black/5 bg-white overflow-hidden flex flex-col rounded-lg">
            <Cart />
          </div>
        </div>
      </div>
    </div>
  );
}
