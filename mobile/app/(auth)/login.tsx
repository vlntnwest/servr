import { useState } from "react";
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { supabase } from "@/lib/supabase";

type Field = "email" | "password" | null;

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [focused, setFocused] = useState<Field>(null);
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading] = useState(false);

  async function signIn() {
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    if (error) Alert.alert("Erreur", error.message);
    setLoading(false);
  }

  const fieldClass = (name: Exclude<Field, null>) =>
    [
      "w-full rounded-xl px-4 py-3.5 text-body font-sans text-foreground",
      focused === name
        ? "bg-white border-hairline border-foreground"
        : "bg-white/50 border-hairline border-border",
    ].join(" ");

  return (
    <SafeAreaView className="flex-1 bg-background">
      <KeyboardAvoidingView
        className="flex-1"
        behavior={Platform.OS === "ios" ? "padding" : "height"}
      >
        <View className="flex-1 px-7 pt-13">
          <View className="mb-2">
            <Text className="font-display text-display-sm leading-none tracking-tighter text-foreground">
              My<Text className="text-primary">.</Text>
            </Text>
            <Text className="font-display text-display-sm leading-none tracking-tighter text-foreground">
              Spots
            </Text>
          </View>
          <Text className="mb-10 font-sans text-body-sm text-muted-foreground">
            Vos endroits préférés, toujours à portée.
          </Text>

          <View className="gap-4">
            <View>
              <Text className="mb-2 font-sans-medium text-caption uppercase tracking-label text-muted-foreground">
                E-mail
              </Text>
              <TextInput
                value={email}
                onChangeText={setEmail}
                onFocus={() => setFocused("email")}
                onBlur={() => setFocused(null)}
                placeholder="vous@exemple.com"
                placeholderTextColor="rgba(138,127,114,0.5)"
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
                className={fieldClass("email")}
              />
            </View>

            <View>
              <Text className="mb-2 font-sans-medium text-caption uppercase tracking-label text-muted-foreground">
                Mot de passe
              </Text>
              <View className="relative justify-center">
                <TextInput
                  value={password}
                  onChangeText={setPassword}
                  onFocus={() => setFocused("password")}
                  onBlur={() => setFocused(null)}
                  placeholder="••••••••"
                  placeholderTextColor="rgba(138,127,114,0.5)"
                  secureTextEntry={!showPass}
                  autoCapitalize="none"
                  className={`${fieldClass("password")} pr-12`}
                />
                <Pressable
                  onPress={() => setShowPass((s) => !s)}
                  hitSlop={8}
                  className="absolute right-3.5 p-1"
                >
                  <Text className="font-sans-medium text-action text-muted-foreground">
                    {showPass ? "Masquer" : "Voir"}
                  </Text>
                </Pressable>
              </View>
            </View>

            <Pressable className="-mt-2 self-end" hitSlop={6}>
              <Text className="font-sans-medium text-action text-muted-foreground">
                Mot de passe oublié ?
              </Text>
            </Pressable>

            <Pressable
              onPress={signIn}
              disabled={loading}
              className="mt-2 w-full items-center justify-center rounded-full bg-foreground py-4 active:opacity-90 disabled:opacity-60"
            >
              <Text className="font-sans-medium text-body tracking-cta text-background">
                {loading ? "Connexion…" : "Se connecter"}
              </Text>
            </Pressable>
          </View>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
