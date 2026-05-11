import { useRestaurant } from "@/context/restaurant";
import { apiFetch } from "@/lib/api";
import { Category } from "@/types/api";
import { useEffect, useState } from "react";
import { Alert } from "react-native";

export default function useMenu() {
  const [menu, setMenu] = useState<Category[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { selectedRestaurant } = useRestaurant();

  const updateItem = async (id: string) => {
    if (!selectedRestaurant) return;

    const product = menu
      .flatMap((cat) => cat.productCategories)
      .find((pc) => pc.product.id === id)?.product;
    if (!product) return;

    const newIsAvailable = !product.isAvailable;

    try {
      const result = await apiFetch(
        `/menu/restaurants/${selectedRestaurant.id}/products/${id}`,
        {
          method: "PUT",
          body: JSON.stringify({ isAvailable: newIsAvailable }),
        },
      );
      if ("error" in result) {
        setError(result.error);
        Alert.alert("Error", result.error);
        return;
      }
      setMenu((prev) =>
        prev.map((cat) => ({
          ...cat,
          productCategories: cat.productCategories.map((pc) =>
            pc.product.id === id
              ? {
                  ...pc,
                  product: { ...pc.product, isAvailable: newIsAvailable },
                }
              : pc,
          ),
        })),
      );
    } catch (error) {
      console.error("Failed to update item:", error);
      Alert.alert("Error", "Failed to update item");
    }

    return newIsAvailable;
  };

  useEffect(() => {
    if (!selectedRestaurant) return;
    setIsLoading(true);
    setError(null);
    const fetchMenu = async () => {
      try {
        const result = await apiFetch<Category[]>(
          `/menu/restaurants/${selectedRestaurant?.id}/menu`,
        );
        if ("error" in result) {
          setError(result.error);
          console.error("Failed to fetch menu items:", result.error);
          return [];
        }
        setMenu(result.data ?? []);
      } catch (error) {
        console.error("Failed to fetch menu items:", error);
        return [];
      } finally {
        setIsLoading(false);
      }
    };
    fetchMenu();
  }, [selectedRestaurant]);

  return {
    menu,
    isLoading,
    error,
    updateItem,
  };
}
