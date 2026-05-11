import { Pressable, View } from "react-native";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from "react-native-reanimated";
import { Restaurant } from "@/types/api";
import { Text } from "@/components/ui/text";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { BRAND } from "@/lib/constants";

const RestaurantCard = ({
  restaurant,
  onPress,
  className,
}: {
  restaurant: Restaurant;
  onPress: (restaurant: Restaurant) => void;
  className?: string;
}) => {
  const scale = useSharedValue(1);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  return (
    <>
      <Animated.View style={[animatedStyle]} className={className}>
        <Pressable
          onPressIn={() => {
            scale.value = withTiming(0.97, { duration: 100 });
          }}
          onPressOut={() => {
            scale.value = withTiming(1, { duration: 100 });
          }}
          onPress={() => onPress(restaurant)}
        >
          <View className="flex-row items-center justify-between py-4 px-5 bg-brand-orange rounded-2xl">
            <Text variant="cardLabel" style={{ color: BRAND.cream }}>
              {restaurant.name}
            </Text>
            <IconSymbol name="chevron.right" size={16} color={BRAND.cream} />
          </View>
        </Pressable>
      </Animated.View>
    </>
  );
};

export default RestaurantCard;
