import { getMenu } from "@/lib/api";
import Header from "@/components/layout/header";
import MenuPage from "@/components/menu/menu-page";
import { CategorySectionSkeleton } from "@/components/menu/category-section";
import { Suspense } from "react";

export default async function HomePage() {
  const categories = await getMenu();

  const sorted = [...categories].sort(
    (a, b) => a.displayOrder - b.displayOrder
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
