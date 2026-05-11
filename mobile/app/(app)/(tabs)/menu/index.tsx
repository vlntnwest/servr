import { Text } from "@/components/ui/text";
import { ScrollView, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import useMenu from "@/hooks/use-menu";
import CategorySection from "./components/categorySection";

export default function Menu() {
  const { menu, updateItem } = useMenu();

  const sortedCategories = [...menu].sort(
    (a, b) => a.displayOrder - b.displayOrder,
  );

  return (
    <SafeAreaView className="flex-1" edges={["top"]}>
      <View style={{ flex: 1 }}>
        <ScrollView style={{ flex: 1 }}>
          <View className="px-5 pt-12 pb-4">
            <Text variant="display">Menu</Text>
          </View>

          <View className="flex flex-col px-5">
            {sortedCategories.map((category) => (
              <View key={category.id}>
                <CategorySection category={category} updateItem={updateItem} />
              </View>
            ))}
          </View>
        </ScrollView>
      </View>
    </SafeAreaView>
  );
}
