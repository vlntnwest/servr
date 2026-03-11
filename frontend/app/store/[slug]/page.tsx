import { notFound } from "next/navigation";
import { getRestaurantBySlug, getMenuForRestaurant } from "@/lib/api";
import Header from "@/components/layout/header";
import MenuPage from "@/components/menu/menu-page";
import { CategorySectionSkeleton } from "@/components/menu/category-section";
import { Suspense } from "react";

export default async function StorePage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const restaurant = await getRestaurantBySlug(slug);

  if (!restaurant) {
    notFound();
  }

  const categories = await getMenuForRestaurant(restaurant.id);
  const sorted = [...categories].sort(
    (a, b) => a.displayOrder - b.displayOrder,
  );

  return (
    <>
      <Header />
      <main>
        <Suspense
          fallback={
            <div>
              {[1, 2, 3].map((i) => (
                <CategorySectionSkeleton key={i} />
              ))}
            </div>
          }
        >
          <MenuPage categories={sorted} />
        </Suspense>
      </main>
    </>
  );
}
