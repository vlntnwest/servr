import { notFound } from "next/navigation";
import { getRestaurantBySlug, getMenuForRestaurant, getOpeningHours, getExceptionalHours } from "@/lib/api";
import Header from "@/components/layout/header";
import RestaurantHeader from "@/components/store/restaurant-header";
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

  const [categories, openingHours, exceptionalHours] = await Promise.all([
    getMenuForRestaurant(restaurant.id),
    getOpeningHours(restaurant.id),
    getExceptionalHours(restaurant.id),
  ]);
  const sorted = [...categories].sort(
    (a, b) => a.displayOrder - b.displayOrder,
  );

  return (
    <>
      <Header />
      <RestaurantHeader restaurant={restaurant} openingHours={openingHours} exceptionalHours={exceptionalHours} />
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
