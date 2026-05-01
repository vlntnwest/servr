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
import { Archivo_900Black_Italic } from "@expo-google-fonts/archivo";
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
import { supabase } from "@/lib/supabase";
import { RestaurantProvider, useRestaurant } from "@/context/restaurant";
import { PrinterProvider } from "@/context/printer";

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
  const { restaurants, selectedRestaurant, isLoading, error: restaurantError, selectRestaurant } =
    useRestaurant();
  const segments = useSegments();
  const router = useRouter();

  useEffect(() => {
    if (!initialized || isLoading) return;

    SplashScreen.hideAsync();

    const inAuthGroup = segments[0] === "(auth)";
    const inSelectGroup = segments[0] === "(select)";
    const inAppGroup = segments[0] === "(app)";

    if (!session) {
      if (!inAuthGroup) router.replace("/(auth)/login");
    } else if (selectedRestaurant) {
      if (!inAppGroup) router.replace("/(app)");
    } else if (restaurants.length === 1) {
      selectRestaurant(restaurants[0].id);
    } else if (restaurants.length > 1) {
      if (!inSelectGroup) router.replace("/(select)/restaurant");
    } else if (restaurantError) {
      // fetch failed (e.g. API unreachable) — back to login so the user isn't stuck silently
      supabase.auth.signOut();
    }
  }, [
    session,
    initialized,
    segments,
    isLoading,
    restaurantError,
    selectedRestaurant,
    restaurants,
    selectRestaurant,
  ]);

  if (!initialized) return null;

  return <Stack screenOptions={{ headerShown: false }} />;
}

export default function RootLayout() {
  const colorScheme = useColorScheme();
  const [fontsLoaded] = useFonts({
    ArchivoBlack_400Regular,
    Archivo_900Black_Italic,
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
        <RestaurantProvider>
          <PrinterProvider>
            <InitialLayout />
          </PrinterProvider>
        </RestaurantProvider>
      </AuthProvider>
      <StatusBar style="auto" />
      <PortalHost />
    </ThemeProvider>
  );
}
