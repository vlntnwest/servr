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
import { supabase } from "@/lib/supabase";

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  async function signIn() {
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) Alert.alert("Erreur", error.message);
    setLoading(false);
  }

  return (
    <KeyboardAvoidingView
      className="flex-1 bg-brand-green"
      behavior={Platform.OS === "ios" ? "padding" : "height"}
    >
      <View className="flex-1 justify-center px-8 gap-14">
        <View className="gap-1.5">
          <Text className="text-white text-5xl font-bold tracking-tighter">
            servr
          </Text>
          <Text className="text-white/50 text-xs uppercase tracking-widest">
            Espace administration
          </Text>
        </View>

        <View className="gap-5">
          <View className="gap-2">
            <Text className="text-white/60 text-sm font-medium tracking-wide">
              Adresse e-mail
            </Text>
            <TextInput
              className="h-13 rounded-xl border border-white/15 bg-white/10 px-4 text-base text-white"
              value={email}
              onChangeText={setEmail}
              placeholder="vous@restaurant.com"
              placeholderTextColor="rgba(255,255,255,0.35)"
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
            />
          </View>

          <View className="gap-2">
            <Text className="text-white/60 text-sm font-medium tracking-wide">
              Mot de passe
            </Text>
            <TextInput
              className="h-13 rounded-xl border border-white/15 bg-white/10 px-4 text-base text-white"
              value={password}
              onChangeText={setPassword}
              placeholder="••••••••"
              placeholderTextColor="rgba(255,255,255,0.35)"
              secureTextEntry
              autoCapitalize="none"
            />
          </View>

          <Pressable
            className="mt-2 h-13 items-center justify-center rounded-xl bg-white active:bg-white/90"
            onPress={signIn}
            disabled={loading}
          >
            <Text className="text-base font-semibold text-brand-green">
              {loading ? "Connexion…" : "Se connecter"}
            </Text>
          </Pressable>
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}
