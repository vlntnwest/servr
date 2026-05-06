import type { Category } from "@/types/api";
import ProductCard from "./product-card";
import { Skeleton } from "@/components/ui/skeleton";

interface CategorySectionProps {
  category: Category;
}

export function CategorySection({ category }: CategorySectionProps) {
  const products = category.productCategories
    .filter((pc) => pc.product.isAvailable)
    .sort((a, b) => a.product.displayOrder - b.product.displayOrder);

  if (products.length === 0) return null;

  return (
    <section id={`cat-${category.id}`} className="mt-6">
      <div className="px-3 mb-3">
        <h2 className="text-2xl font-bold">{category.name}</h2>
        {category.subHeading && (
          <p className="text-muted-foreground text-base">
            {category.subHeading}
          </p>
        )}
      </div>
      <div className="grid gap-2 px-3 xl:grid-cols-2 3xl:grid-cols-3">
        {products.map((pc) => (
          <ProductCard key={pc.id} product={pc.product} />
        ))}
      </div>
    </section>
  );
}

export function CategorySectionSkeleton() {
  return (
    <section className="mt-6">
      <div className="px-3 mb-3">
        <Skeleton className="h-7 w-32 mb-1" />
        <Skeleton className="h-4 w-48" />
      </div>
      <div className="grid md:gap-1 md:px-2 lg:grid-cols-2">
        {[1, 2, 3].map((i) => (
          <Skeleton
            key={i}
            className="h-32 w-full mb-0.5 rounded-none md:rounded-lg"
          />
        ))}
      </div>
    </section>
  );
}
