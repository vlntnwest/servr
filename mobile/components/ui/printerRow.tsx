import { View, Pressable } from "react-native";
import { Text } from "@/components/ui/text";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { BRAND } from "@/lib/constants";
import React from "react";

export type RowProps = {
  label: string;
  sub?: string;
  value?: string;
  left?: React.ReactNode;
  right?: React.ReactNode;
  onPress?: () => void | Promise<void>;
  showSeparator?: boolean;
};

export function Row({
  label,
  sub,
  value,
  left,
  right,
  onPress,
  showSeparator = true,
}: RowProps) {
  const content = (
    <View className="flex-row items-center gap-3 bg-white px-4 py-3.5">
      {left}
      <View className="flex-1 min-w-0">
        <Text className="text-[15px]">{label}</Text>
        {sub && (
          <Text variant="muted" className="text-xs mt-0.5" numberOfLines={1}>
            {sub}
          </Text>
        )}
      </View>
      {value && (
        <Text variant="muted" className="text-sm" numberOfLines={1}>
          {value}
        </Text>
      )}
      {right}
      {onPress && !right && (
        <IconSymbol name="chevron.right" size={13} color={BRAND.border} />
      )}
    </View>
  );

  return (
    <>
      {onPress ? (
        <Pressable onPress={onPress} className="active:opacity-60">
          {content}
        </Pressable>
      ) : (
        content
      )}
      {showSeparator && <View className="h-px bg-border" />}
    </>
  );
}

export function IconBox({
  bg,
  children,
}: {
  bg: string;
  children: React.ReactNode;
}) {
  return (
    <View
      className="w-8 h-8 rounded-lg items-center justify-center"
      style={{ backgroundColor: bg }}
    >
      {children}
    </View>
  );
}
