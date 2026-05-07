import { Pressable, View } from "react-native";
import { usePrinter } from "@/context/printer";
import { useEffect } from "react";
import { Text } from "@/components/ui/text";
import { router } from "expo-router";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { BRAND } from "@/lib/constants";

export default function PrinterSelect() {
  const {
    scan,
    isDiscovering,
    printers,
    printerError,
    connect,
    disconnect,
    savedPrinter,
  } = usePrinter();

  useEffect(() => {
    if (printerError) {
      alert(printerError);
    }
  }, [printerError]);

  return (
    <View>
      <Text variant="caption">Matériel</Text>
      <View className="border border-border rounded-lg bg-white">
        <Pressable
          className="flex-row items-center justify-between p-4 rounded-lg"
          onPress={() => router.push("/settings/printer")}
        >
          <View className="flex-row items-center">
            <Text variant="default">Imprimante</Text>
            {savedPrinter && <Text>{savedPrinter.deviceName}</Text>}
            <IconSymbol name="chevron.right" size={16} color={BRAND.ink} />
          </View>
        </Pressable>
      </View>
    </View>
  );
}
