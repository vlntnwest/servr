import { Button } from "@/components/ui/button";
import { Text } from "@/components/ui/text";
import { supabase } from "@/lib/supabase";
import { Stack } from "expo-router";
import { ScrollView, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

export default function Settings() {
  const logout = async () => {
    await supabase.auth.signOut();
  };
  return (
    <SafeAreaView className="flex-1" edges={["top"]}>
      <ScrollView contentContainerClassName="pb-10">
        <View className="px-5 pt-12 pb-4">
          <Text variant="display">Réglages</Text>
        </View>
        <View className="h-[200vh] px-5">
          <Button variant="link" onPress={logout}>
            <Text>Se déconnecter</Text>
          </Button>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
