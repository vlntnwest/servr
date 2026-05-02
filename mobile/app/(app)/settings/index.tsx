import { useWindowDimensions } from "react-native";
import { Redirect } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import SettingsList from "./components/settingsList";

export default function Settings() {
  const { width } = useWindowDimensions();

  if (width >= 768) {
    return <Redirect href="/settings/general" />;
  }

  return (
    <SafeAreaView className="flex-1" edges={["top"]}>
      <SettingsList />
    </SafeAreaView>
  );
}
