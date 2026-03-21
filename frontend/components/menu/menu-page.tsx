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
        self.findIndex((p) => p.id === product.id) === index,
    );

  return (
    <div className="max-w-screen-3xl mx-auto sm:grid lg:[grid-template-columns:minmax(50%,60%)_minmax(420px,1fr)] 2xl:[grid-template-columns:minmax(60%,70%)_minmax(420px,1fr)] md:px-8 xl:px-16">
      {/* Menu content */}
      <div className="min-w-0">
        <div className="pb-20 md:pb-6">
          <PopularSection products={popularProducts} />
          {categories.map((cat) => (
            <CategorySection key={cat.id} category={cat} />
          ))}
        </div>
      </div>

      {/* Desktop cart */}
      <div className="hidden lg:block">
        <div className="sticky top-[65px] h-[calc(100vh-65px)] p-4 pl-0">
          <div className="h-full border border-black/5 bg-white overflow-hidden flex flex-col rounded-lg">
            <Cart />
          </div>
        </div>
      </div>
    </div>
  );
}
