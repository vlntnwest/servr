import {
  ScrollView,
  View,
  Pressable,
  ActivityIndicator,
  useWindowDimensions,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Text } from "@/components/ui/text";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { BRAND } from "@/lib/constants";
import { usePrinter } from "@/context/printer";
import { Row, IconBox } from "@/components/ui/printerRow";
import { getOrder } from "@/lib/api";

const EXAMPLE_ORDER_ID = "b8141f34-31df-4bf3-8eaa-4528a4be34e0";

export default function Printer() {
  const { savedPrinter, printers, isDiscovering, scan, connect, disconnect, printTest, printOrder } =
    usePrinter();

  const printExampleOrder = async () => {
    const result = await getOrder(EXAMPLE_ORDER_ID);
    if ("error" in result) {
      console.error("Failed to fetch example order:", result.error);
      return;
    }
    await printOrder(result.data);
  };
  const { width } = useWindowDimensions();
  const isTablet = width >= 768;

  const otherPrinters = printers.filter(
    (p) => p.target !== savedPrinter?.target,
  );

  return (
    <SafeAreaView
      className="flex-1 bg-background"
      edges={isTablet ? ["top"] : []}
    >
      <View className="pt-4 pb-1">
        <Text variant="h2">Imprimante</Text>
      </View>

      <ScrollView contentContainerClassName="pb-10">
        <View className="px-5">
          {savedPrinter && (
            <>
              <Text variant="caption" className="mb-1.5 mt-5">
                Connectée
              </Text>
              <View className="rounded-[30px] overflow-hidden">
                <Row
                  label={savedPrinter.deviceName}
                  sub={savedPrinter.target}
                  left={
                    <IconSymbol
                      name="checkmark.circle.fill"
                      size={22}
                      color="#34c759"
                    />
                  }
                  showSeparator={false}
                />
              </View>
            </>
          )}

          <Text variant="caption" className="mb-1.5 mt-5">
            Actions
          </Text>
          <View className="rounded-[30px] overflow-hidden">
            <Row
              label="Impression de test"
              left={
                <IconBox bg={BRAND.orange}>
                  <IconSymbol name="printer.fill" size={15} color="white" />
                </IconBox>
              }
              onPress={printTest}
            />
            <Row
              label="Ticket exemple"
              left={
                <IconBox bg="#5856d6">
                  <IconSymbol name="list.bullet" size={15} color="white" />
                </IconBox>
              }
              onPress={printExampleOrder}
            />
            <Row
              label="Reconnecter"
              left={
                <IconBox bg="#ff9500">
                  <IconSymbol name="arrow.clockwise" size={15} color="white" />
                </IconBox>
              }
              onPress={() => {}}
              showSeparator={false}
            />
          </View>

          {savedPrinter && (
            <>
              <Text variant="caption" className="mb-1.5 mt-5">
                Informations
              </Text>
              <View className="rounded-[30px] overflow-hidden">
                <Row label="Appareil" value={savedPrinter.deviceName} />
                <Row label="Adresse" value={savedPrinter.target} />
                <Row label="Protocole" value="Wi-Fi (TCP/IP)" />
                <Row
                  label="État"
                  right={
                    <View
                      className="px-2.5 py-1 rounded-full"
                      style={{ backgroundColor: "#34c75920" }}
                    >
                      <Text
                        className="text-xs font-sans-semibold"
                        style={{ color: "#1a7a3a" }}
                      >
                        ● En ligne
                      </Text>
                    </View>
                  }
                  showSeparator={false}
                />
              </View>
            </>
          )}

          <Text variant="caption" className="mb-1.5 mt-5">
            Autres imprimantes
          </Text>
          <View className="rounded-[30px] overflow-hidden">
            {otherPrinters.map((printer) => (
              <Row
                key={printer.target}
                label={printer.deviceName}
                sub={printer.target}
                onPress={() => connect(printer)}
              />
            ))}

            {isDiscovering ? (
              <View className="flex-row items-center gap-3 bg-white px-4 py-3.5">
                <ActivityIndicator size="small" color={BRAND.stone} />
                <Text variant="muted">Recherche en cours…</Text>
              </View>
            ) : (
              <Pressable
                onPress={scan}
                className="flex-row items-center gap-2 bg-white px-4 py-3.5 active:opacity-60"
              >
                <IconSymbol
                  name="arrow.clockwise"
                  size={14}
                  color={BRAND.orange}
                />
                <Text className="text-primary text-[15px]">
                  Rechercher des imprimantes
                </Text>
              </Pressable>
            )}
          </View>

          {savedPrinter && (
            <View className="mt-7 rounded-[30px] overflow-hidden">
              <Pressable
                onPress={disconnect}
                className="bg-white py-4 items-center active:opacity-60"
              >
                <Text
                  className="font-sans-medium text-[15px]"
                  style={{ color: "#ff3b30" }}
                >
                  Déconnecter l'imprimante
                </Text>
              </Pressable>
            </View>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
