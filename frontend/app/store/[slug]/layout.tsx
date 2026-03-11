import { notFound } from "next/navigation";
import { getRestaurantBySlug } from "@/lib/api";
import { RestaurantProvider } from "@/contexts/restaurant-context";

export default async function StoreLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const restaurant = await getRestaurantBySlug(slug);

  if (!restaurant) {
    notFound();
  }

  return (
    <RestaurantProvider restaurant={restaurant} slug={slug}>
      {children}
    </RestaurantProvider>
  );
}
