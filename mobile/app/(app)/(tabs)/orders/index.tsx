import { ScrollView, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Text } from "@/components/ui/text";
import { useOrders } from "@/hooks/use-orders";
import { orderStore } from "@/lib/order-store";
import { Order } from "@/types/api";
import { router, useFocusEffect } from "expo-router";
import { useCallback } from "react";
import OrderCard from "./components/orderCard";
import Affluence from "./components/affluence";

export default function Orders() {
  const { orders, refetch } = useOrders();

  useFocusEffect(
    useCallback(() => {
      refetch();
    }, [refetch]),
  );

  const handlePress = (order: Order) => {
    orderStore.set(order);
    router.push(`/(app)/order/${order.id}`);
  };

  return (
    <SafeAreaView className="flex-1" edges={["top"]}>
      <View style={{ flex: 1 }}>
        <ScrollView style={{ flex: 1 }}>
          <Affluence />

          <View className="px-5 pb-2">
            <Text variant="display">Commandes</Text>
          </View>

          <View className="flex flex-row flex-wrap gap-3 px-5">
            {orders?.map((order) => (
              <OrderCard
                key={order.id}
                order={order}
                onPress={() => handlePress(order)}
                className="w-full md:w-[48%] lg:w-[31%]"
              />
            ))}
          </View>
        </ScrollView>
      </View>
    </SafeAreaView>
  );
}
