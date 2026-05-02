import { ScrollView, View, useWindowDimensions } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useEffect, useState } from "react";
import { Text } from "@/components/ui/text";
import { Switch } from "@/components/ui/switch";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { BRAND } from "@/lib/constants";
import { Row, IconBox } from "@/components/ui/printerRow";

const AUTO_PRINT_KEY = "autoValidate";

export default function General() {
  const { width } = useWindowDimensions();
  const isTablet = width >= 768;
  const [autoPrint, setAutoPrint] = useState(false);

  useEffect(() => {
    AsyncStorage.getItem(AUTO_PRINT_KEY).then((val) => {
      if (val !== null) setAutoPrint(val === "true");
    });
  }, []);

  const toggle = async (value: boolean) => {
    setAutoPrint(value);
    await AsyncStorage.setItem(AUTO_PRINT_KEY, String(value));
  };

  return (
    <SafeAreaView
      className="flex-1 bg-background"
      edges={isTablet ? ["top"] : []}
    >
      <View className="pt-4 pb-1">
        <Text variant="h2">Général</Text>
      </View>

      <ScrollView contentContainerClassName="pb-10">
        <View className="px-5">
          <Text variant="caption" className="mb-1.5 mt-5">
            Impression
          </Text>
          <View className="rounded-[30px] overflow-hidden">
            <Row
              label="Validation automatique"
              sub="Imprimer le ticket lors du passage en préparation"
              left={
                <IconBox bg={BRAND.orange}>
                  <IconSymbol name="printer.fill" size={15} color="white" />
                </IconBox>
              }
              right={
                <Switch checked={autoPrint} onCheckedChange={toggle} />
              }
              showSeparator={false}
            />
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
