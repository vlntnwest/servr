import { Stack } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";

export default function Menu() {
  return (
    <SafeAreaView>
      <Stack.Screen options={{ headerShown: true, headerLargeTitle: true }} />
    </SafeAreaView>
  );
}
