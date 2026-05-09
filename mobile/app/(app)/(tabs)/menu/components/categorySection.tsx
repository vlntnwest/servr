import { Text } from "@/components/ui/text";
import { Category } from "@/types/api";
import { View } from "react-native";
import ProductToggle from "./productToggle";

export default function CategorySection({
  category,
  updateItem,
}: {
  category: Category;
  updateItem: (id: string) => Promise<boolean | undefined>;
}) {
  const products = category.productCategories.sort(
    (a, b) => a.product.displayOrder - b.product.displayOrder,
  );

  if (products.length === 0) {
    return null;
  }

  return (
    <View className="mb-16">
      <Text variant="h2" className="mb-4">
        {category.name}
      </Text>
      <View className="flex flex-row flex-wrap gap-3">
        {products.map((product) => (
          <ProductToggle
            key={product.product.id}
            product={product.product}
            className="w-full md:w-[48%] lg:w-[31%]"
            updateItem={updateItem}
          />
        ))}
      </View>
    </View>
  );
}
