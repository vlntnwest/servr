import { ActivityIndicator, FlatList, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Text } from "@/components/ui/text";
import { useOrderHistory } from "@/hooks/use-order-history";
import { orderStore } from "@/lib/order-store";
import { Order } from "@/types/api";
import { router, useFocusEffect } from "expo-router";
import { useCallback } from "react";
import OrderCard from "../orders/components/orderCard";

export default function OrderHistory() {
  const { orders, isLoading, error, loadMore, reset } = useOrderHistory();

  useFocusEffect(
    useCallback(() => {
      reset();
    }, [reset]),
  );

  const handlePress = (order: Order) => {
    orderStore.set(order);
    router.push(`/(app)/order/${order.id}`);
  };

  return (
    <SafeAreaView className="flex-1" edges={["top"]}>
      <FlatList
        data={orders}
        keyExtractor={(item) => item.id}
        contentContainerClassName="px-5 pt-4 pb-8 gap-3"
        numColumns={1}
        ListHeaderComponent={
          <View className="pb-2">
            <Text variant="display">Historique</Text>
          </View>
        }
        ListEmptyComponent={
          error ? (
            <Text variant="muted" className="text-center mt-8">
              {error}
            </Text>
          ) : !isLoading ? (
            <Text variant="muted" className="text-center mt-8">
              Aucune commande dans l'historique
            </Text>
          ) : null
        }
        ListFooterComponent={
          isLoading ? <ActivityIndicator className="py-4" /> : null
        }
        renderItem={({ item }) => (
          <OrderCard
            order={item}
            onPress={() => handlePress(item)}
            className="w-full"
          />
        )}
        onEndReached={loadMore}
        onEndReachedThreshold={0.3}
      />
    </SafeAreaView>
  );
}
