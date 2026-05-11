import { ScrollView, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Text } from "@/components/ui/text";
import { useRestaurant } from "@/context/restaurant";
import RestaurantCard from "./components/card";
import { Restaurant } from "@/types/api";

export default function SelectRestaurant() {
  const { restaurants, selectRestaurant } = useRestaurant();

  const selectRestaurantHandler = (restaurant: Restaurant) => {
    selectRestaurant(restaurant.id);
  };

  return (
    <SafeAreaView className="flex-1" edges={["top"]}>
      <ScrollView contentContainerClassName="pb-10">
        <View className="px-5 pt-8 pb-4">
          <Text variant="display">Sélectionner un restaurant</Text>
        </View>
        <View className="flex flex-row flex-wrap gap-[10px] px-5">
          {restaurants.map((restaurant) => (
            <RestaurantCard
              key={restaurant.id}
              restaurant={restaurant}
              onPress={selectRestaurantHandler}
              className="min-w-[180px] flex-1"
            />
          ))}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
