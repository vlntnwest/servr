import { ScrollView, useWindowDimensions, View } from "react-native";
import { Button } from "@/components/ui/button";
import { router, usePathname } from "expo-router";
import { Text } from "@/components/ui/text";
import { BRAND } from "@/lib/constants";
import { supabase } from "@/lib/supabase";
import { usePrinter } from "@/context/printer";
import Row from "./settingsRow";

export default function SettingsList() {
  const { savedPrinter } = usePrinter();
  const { width } = useWindowDimensions();
  const isTablet = width >= 768;
  const pathname = usePathname();

  return (
    <ScrollView style={{ flex: 1 }}>
      <View className={`pt-12 pb-4 ${isTablet ? "" : "px-5"}`}>
        <Text variant="display">Réglages</Text>
      </View>

      <Text variant="default" className="px-5 mb-1.5 mt-4">
        Général
      </Text>
      <View className={`${isTablet ? "" : "px-5"}`}>
        <View className="rounded-[30px] overflow-hidden">
          <Row
            iconName="gearshape.fill"
            iconBg={BRAND.stone}
            label="Réglages généraux"
            onPress={() => router.push("/settings/general")}
            active={pathname === "/settings/general"}
            showSeparator={false}
          />
        </View>
      </View>

      <Text variant="default" className="px-5 mb-1.5 mt-4">
        Matériel
      </Text>
      <View className={`${isTablet ? "" : "px-5"}`}>
        <View className="rounded-[30px] overflow-hidden">
          <Row
            iconName="printer.fill"
            iconBg={BRAND.orange}
            label="Imprimante"
            value={savedPrinter?.deviceName ?? "Aucune"}
            onPress={() => router.push("/settings/printer")}
            active={pathname === "/settings/printer"}
            showSeparator={false}
          />
        </View>
      </View>

      <Text variant="default" className="px-5 mb-1.5 mt-4">
        Activité
      </Text>
      <View className={`${isTablet ? "" : "px-5"}`}>
        <View className="rounded-[30px] overflow-hidden">
          <Row
            iconName="clock.arrow.circlepath"
            iconBg={BRAND.stone}
            label="Historique des commandes"
            onPress={() => router.push("/settings/history")}
            active={pathname === "/settings/history"}
            showSeparator={false}
          />
        </View>
      </View>

      <Button
        variant="link"
        onPress={() => supabase.auth.signOut()}
        className="mt-4"
      >
        <Text>Se déconnecter</Text>
      </Button>
    </ScrollView>
  );
}
