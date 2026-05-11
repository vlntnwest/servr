import { Text } from "@/components/ui/text";
import { OrderProductOption } from "@/types/api";
import { View } from "react-native";

export default function OrderOptions({ options }: { options: OrderProductOption[] }) {
  if (options.length === 0) return null;

  const groups = options.reduce<Record<string, string[]>>((acc, o) => {
    const group = o.optionChoice.optionGroup?.name ?? "Options";
    (acc[group] ??= []).push(o.optionChoice.name);
    return acc;
  }, {});

  return (
    <View className="pl-3 mt-0.5 gap-0.5">
      {Object.entries(groups).map(([group, choices]) => (
        <View key={group}>
          <Text variant="muted" className="font-sans-medium">{group}</Text>
          {choices.map((c, i) => (
            <Text key={i} variant="muted" className="pl-2">{c}</Text>
          ))}
        </View>
      ))}
    </View>
  );
}
