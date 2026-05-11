import { Stack } from "expo-router";
import { useWindowDimensions, useColorScheme, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { NAV_THEME } from "@/lib/constants";
import SettingsList from "./components/settingsList";

export const unstable_settings = {
  initialRouteName: "index",
};

export default function SettingsLayout() {
  const { width } = useWindowDimensions();
  const colorScheme = useColorScheme();
  const bg = NAV_THEME[colorScheme === "dark" ? "dark" : "light"].background;
  const isTablet = width >= 768;

  return (
    <View className="flex-1 flex-row bg-background">
      {isTablet && (
        <SafeAreaView className="w-80 p-3" edges={["top", "left", "bottom"]}>
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
        </SafeAreaView>
      )}

      <View className={`flex-1 ${isTablet ? "pt-12" : ""}`}>
        <Stack
          screenOptions={{
            headerShown: !isTablet,
            headerStyle: { backgroundColor: bg },
            headerShadowVisible: false,
            headerBackButtonDisplayMode: "minimal",
            headerTitle: "",
          }}
        >
          <Stack.Screen name="index" options={{ headerShown: false }} />
          <Stack.Screen name="general" />
          <Stack.Screen name="printer" />
          <Stack.Screen name="history" />
        </Stack>
      </View>
    </View>
  );
}
