import { Stack } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";

export default function Orders() {
  return (
    <SafeAreaView>
      <Stack.Screen
        options={{
          headerShown: true,
          headerLargeTitle: true,
          title: "Commandes",
        }}
      />
    </SafeAreaView>
  );
}
