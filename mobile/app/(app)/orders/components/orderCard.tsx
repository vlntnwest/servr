import { Badge } from "@/components/ui/badge";
import { Text } from "@/components/ui/text";
import { BRAND } from "@/lib/constants";
import {
  formatEuros,
  getOrderItemCount,
  getOrderStatusBadge,
  getOrderStatusLabel,
  getOrderTime,
} from "@/lib/utils";
import { Order } from "@/types/api";
import { Pressable, View } from "react-native";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from "react-native-reanimated";

export default function OrderCard({
  order,
  onPress,
  className,
}: {
  order: Order;
  onPress?: () => void;
  className?: string;
}) {
  const scale = useSharedValue(1);
  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const itemCount = getOrderItemCount(order.orderProducts);
  const time = getOrderTime(order.scheduledFor, order.createdAt);
  const { bg, text } = getOrderStatusBadge(order.status);

  return (
    <Animated.View style={animatedStyle} className={className}>
      <Pressable
        onPressIn={() => {
          scale.value = withTiming(0.97, { duration: 100 });
        }}
        onPressOut={() => {
          scale.value = withTiming(1, { duration: 100 });
        }}
        onPress={onPress}
        className="flex-row justify-between bg-white rounded-card px-6 py-5"
        style={{
          shadowColor: BRAND.ink,
          shadowOffset: { width: 0, height: 4 },
          shadowOpacity: 0.08,
          shadowRadius: 12,
          elevation: 3,
        }}
      >
        <View className="flex-1 gap-2">
          <Text
            className="font-display text-logo-sm leading-none text-foreground"
            style={{ letterSpacing: -0.28 }}
          >
            #{order.orderNumber ?? "—"}
          </Text>
          <Text variant="default">{order.fullName ?? "Client inconnu"}</Text>
          <Text
            variant="muted"
            className="font-sans-medium text-body-sm uppercase"
            style={{ letterSpacing: 0.78 }}
          >
            {itemCount} article{itemCount > 1 ? "s" : ""} · {time}
          </Text>
        </View>

        <View className="items-end justify-between pl-5">
          <Badge className={`${bg} border-transparent px-3 py-1`}>
            <Text
              variant="badge"
              className={text}
              style={{ letterSpacing: 0.52 }}
            >
              {getOrderStatusLabel(order.status)}
            </Text>
          </Badge>
          <Text
            className="font-sans-semibold text-heading text-foreground"
            style={{ letterSpacing: -0.22 }}
          >
            {formatEuros(parseFloat(order.totalPrice))}
          </Text>
        </View>
      </Pressable>
    </Animated.View>
  );
}
