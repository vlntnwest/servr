import { ScrollView, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Text } from "@/components/ui/text";

export default function Orders() {
  return (
    <SafeAreaView className="flex-1" edges={["top"]}>
      <View className="px-5 pt-2 pb-4">
        {/* TODO: widget d'affluence ici */}
        <View className="h-10 mb-3 bg-brand-100 rounded-xl" />

        <Text variant="display">Commandes</Text>
      </View>

      <ScrollView contentContainerClassName="pb-10">
        <View className="h-[200vh] px-5">
          <Text>Orders</Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
