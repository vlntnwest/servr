import { Pressable, View } from "react-native";
import { Text } from "@/components/ui/text";
import { useAffluence, PREP_LEVEL_LABELS } from "@/hooks/use-affluence";
import { PreparationLevel } from "@/types/api";

const LEVELS: PreparationLevel[] = ["EASY", "MEDIUM", "BUSY", "CLOSED"];

const ACTIVE_STYLE: Record<PreparationLevel, { bg: string; text: string }> = {
  EASY: { bg: "bg-brand-forest/20", text: "text-brand-forest" },
  MEDIUM: { bg: "bg-brand-yellow/40", text: "text-brand-ink" },
  BUSY: { bg: "bg-brand-orange/20", text: "text-brand-orange" },
  CLOSED: { bg: "bg-brand-maroon/15", text: "text-brand-maroon" },
};

export default function Affluence() {
  const { level, setLevel } = useAffluence();

  return (
    <View className="flex-row bg-brand-sand rounded-xl p-1 mx-5 mb-2">
      {LEVELS.map((l) => {
        const active = level === l;
        const { bg, text } = ACTIVE_STYLE[l];
        return (
          <Pressable
            key={l}
            onPress={() => setLevel(l)}
            className={`flex-1 py-2 rounded-lg items-center ${active ? bg : ""}`}
          >
            <Text
              className={`text-action font-sans-medium ${active ? text : "text-brand-stone"}`}
            >
              {PREP_LEVEL_LABELS[l]}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}
