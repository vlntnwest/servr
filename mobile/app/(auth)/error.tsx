import { ActivityIndicator, Pressable, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { supabase } from "@/lib/supabase";
import { useRestaurant } from "@/context/restaurant";

export default function ConnectionError() {
  const { error, refresh, isLoading } = useRestaurant();

  return (
    <SafeAreaView className="flex-1 bg-background">
      <View className="flex-1 justify-center px-7 gap-4">
        <View>
          <Text className="font-display text-display-sm leading-none tracking-tighter text-foreground">
            Connexion{"\n"}impossible
          </Text>
          <Text className="mt-3 font-sans text-body-sm text-muted-foreground">
            {error ?? "Une erreur est survenue lors du chargement de vos données."}
          </Text>
        </View>

        <Pressable
          onPress={refresh}
          disabled={isLoading}
          className="w-full items-center justify-center rounded-full bg-foreground py-4 active:opacity-90 disabled:opacity-60"
        >
          {isLoading ? (
            <ActivityIndicator color="white" />
          ) : (
            <Text className="font-sans-medium text-body tracking-cta text-background">
              Réessayer
            </Text>
          )}
        </Pressable>

        <Pressable
          onPress={() => supabase.auth.signOut()}
          className="w-full items-center py-2"
        >
          <Text className="font-sans-medium text-action text-muted-foreground">
            Se déconnecter
          </Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}
