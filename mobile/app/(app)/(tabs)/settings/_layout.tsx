import { Stack, Slot } from "expo-router";
import { useWindowDimensions, useColorScheme, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { NAV_THEME } from "@/lib/constants";
import SettingsList from "./components/settingsList";

export default function SettingsLayout() {
  const { width } = useWindowDimensions();
  const colorScheme = useColorScheme();
  const bg = NAV_THEME[colorScheme === "dark" ? "dark" : "light"].background;

  if (width >= 768) {
    return (
      <SafeAreaView className="flex-1 flex-row bg-background" edges={["top"]}>
        <View className="w-80 p-3">
          <View
            className="flex-1 rounded-[30px] overflow-hidden bg-card px-4"
            style={{
              shadowColor: "#000",
              shadowOffset: { width: 0, height: 8 },
              shadowRadius: 24,
              shadowOpacity: 0.08,
              elevation: 12,
            }}
          >
            <SettingsList />
          </View>
        </View>
        <View className="flex-1 pt-12">
          <Slot />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <Stack>
      <Stack.Screen name="index" options={{ headerShown: false }} />
      <Stack.Screen
        name="printer"
        options={{
          headerBackButtonDisplayMode: "minimal",
          headerTitle: "",
          headerStyle: { backgroundColor: bg },
          headerShadowVisible: false,
        }}
      />
      <Stack.Screen
        name="general"
        options={{
          headerBackButtonDisplayMode: "minimal",
          headerTitle: "",
          headerStyle: { backgroundColor: bg },
          headerShadowVisible: false,
        }}
      />
      <Stack.Screen
        name="history"
        options={{
          headerBackButtonDisplayMode: "minimal",
          headerTitle: "",
          headerStyle: { backgroundColor: bg },
          headerShadowVisible: false,
        }}
      />
    </Stack>
  );
}
