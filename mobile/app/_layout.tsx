import "../global.css";
import {
  DarkTheme,
  DefaultTheme,
  ThemeProvider,
} from "@react-navigation/native";
import { PortalHost } from "@rn-primitives/portal";
import { StatusBar } from "expo-status-bar";
import { useEffect } from "react";
import { useRouter, useSegments, Stack } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import {
  useFonts,
  ArchivoBlack_400Regular,
} from "@expo-google-fonts/archivo-black";
import {
  DMSans_300Light,
  DMSans_400Regular,
  DMSans_400Regular_Italic,
  DMSans_500Medium,
  DMSans_600SemiBold,
  DMSans_700Bold_Italic,
} from "@expo-google-fonts/dm-sans";

import { useColorScheme } from "@/hooks/use-color-scheme";
import { AuthProvider, useAuth } from "@/context/auth";
import { NAV_THEME } from "@/lib/constants";

SplashScreen.preventAutoHideAsync();

const LightTheme = {
  ...DefaultTheme,
  colors: { ...DefaultTheme.colors, ...NAV_THEME.light },
};

const DarkBrandTheme = {
  ...DarkTheme,
  colors: { ...DarkTheme.colors, ...NAV_THEME.dark },
};

function InitialLayout() {
  const { session, initialized } = useAuth();
  const segments = useSegments();
  const router = useRouter();

  useEffect(() => {
    if (!initialized) return;

    SplashScreen.hideAsync();

    const inAuthGroup = segments[0] === "(auth)";

    if (!session && !inAuthGroup) {
      router.replace("/(auth)/login");
    } else if (session && inAuthGroup) {
      router.replace("/(app)");
    }
  }, [session, initialized, segments]);

  if (!initialized) return null;

  return <Stack screenOptions={{ headerShown: false }} />;
}

export default function RootLayout() {
  const colorScheme = useColorScheme();
  const [fontsLoaded] = useFonts({
    ArchivoBlack_400Regular,
    DMSans_300Light,
    DMSans_400Regular,
    DMSans_400Regular_Italic,
    DMSans_500Medium,
    DMSans_600SemiBold,
    DMSans_700Bold_Italic,
  });

  if (!fontsLoaded) return null;

  return (
    <ThemeProvider value={colorScheme === "dark" ? DarkBrandTheme : LightTheme}>
      <AuthProvider>
        <InitialLayout />
        <StatusBar style="auto" />
      </AuthProvider>
      <PortalHost />
    </ThemeProvider>
  );
}
