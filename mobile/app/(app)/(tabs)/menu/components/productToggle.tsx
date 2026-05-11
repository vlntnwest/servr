import { Product } from "@/types/api";

import { Text } from "@/components/ui/text";
import { Pressable, View } from "react-native";
import { Switch } from "@/components/ui/switch";
import { useState } from "react";
import * as Haptics from "expo-haptics";
import { formatEuros } from "@/lib/utils";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
} from "react-native-reanimated";

export default function ProductToggle({
  product,
  className,
  updateItem,
}: {
  product: Product;
  className?: string;
  updateItem: (id: string) => Promise<boolean | undefined>;
}) {
  const [checked, setChecked] = useState(product.isAvailable);

  const scale = useSharedValue(1);
  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  function onPress() {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    handleChange();
  }

  async function handleChange() {
    const newValue = !checked;
    setChecked(newValue);
    const result = await updateItem(product.id);
    if (result === undefined) setChecked(!newValue);
  }

  return (
    <Animated.View style={animatedStyle} className={className}>
      <Pressable
        className="flex-row items-center justify-between px-4 py-5 bg-white border-brand-border border rounded-card"
        onPressIn={() => {
          scale.value = withTiming(0.97, { duration: 100 });
        }}
        onPressOut={() => {
          scale.value = withTiming(1, { duration: 100 });
        }}
        onPress={onPress}
      >
        <View className="flex-1 flex-row items-center justify-between">
          <View className="flex-1 flex-row">
            <View className="flex-row items-center">
              <View
                className={`w-2 h-2 rounded-full  ${checked ? "bg-brand-lime" : "bg-brand-stone"}`}
              />
            </View>
            <View className="flex-1 ml-4">
              <Text
                variant="cardLabel"
                className={`${checked ? "" : "text-brand-stone"}`}
              >
                {product.name}
              </Text>
              <Text variant="caption" className="text-brand-stone">
                {formatEuros(Number(product.price))}
              </Text>
            </View>
          </View>
          <View className="ml-4">
            <Switch checked={checked} onCheckedChange={handleChange} />
          </View>
        </View>
      </Pressable>
    </Animated.View>
  );
}
