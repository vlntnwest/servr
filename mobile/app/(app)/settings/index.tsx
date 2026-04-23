import { Stack } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";

export default function Settings() {
  return (
    <SafeAreaView>
      <Stack.Screen
        options={{
          headerShown: true,
          headerLargeTitle: true,
          title: "Réglages",
        }}
      />
    </SafeAreaView>
  );
}
