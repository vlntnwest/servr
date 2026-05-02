import { View, Pressable, useWindowDimensions } from "react-native";
import { Text } from "@/components/ui/text";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { BRAND } from "@/lib/constants";
import type { ComponentProps } from "react";

export type RowProps = {
  iconName?: ComponentProps<typeof IconSymbol>["name"];
  iconBg?: string;
  label: string;
  value?: string;
  onPress?: () => void;
  active?: boolean;
  showSeparator?: boolean;
};

export default function Row({
  iconName,
  iconBg,
  label,
  value,
  onPress,
  active = false,
  showSeparator = true,
}: RowProps) {
  const { width } = useWindowDimensions();
  const isTablet = width >= 768;
  const showBg = !isTablet || active;

  return (
    <>
      <Pressable
        onPress={onPress}
        disabled={!onPress}
        className={`flex-row items-center gap-3 px-4 py-3.5 active:opacity-60${showBg ? " bg-white" : ""}`}
      >
        {iconName && iconBg && (
          <View
            className="w-8 h-8 rounded-lg items-center justify-center"
            style={{ backgroundColor: iconBg }}
          >
            <IconSymbol name={iconName} size={15} color="white" />
          </View>
        )}
        <Text className="flex-1 text-[15px]">{label}</Text>
        {value && (
          <Text variant="muted" className="text-sm" numberOfLines={1}>
            {value}
          </Text>
        )}
        {onPress && (
          <IconSymbol name="chevron.right" size={13} color={BRAND.ink} />
        )}
      </Pressable>
      {showSeparator && <View className="h-px bg-border" />}
    </>
  );
}
