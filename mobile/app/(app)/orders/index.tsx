import { ScrollView, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Text } from "@/components/ui/text";
import { useAuth } from "@/context/auth";

export default function Orders() {
  const { session } = useAuth();
  return (
    <SafeAreaView className="flex-1" edges={["top"]}>
      <View className="px-5 pt-12 pb-4">
        {/* TODO: widget d'affluence ici */}
        <Text variant="display">Commandes</Text>
      </View>

      <ScrollView contentContainerClassName="pb-10">
        <View className="h-[200vh] px-5">
          <Text>{session?.user.id}</Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
