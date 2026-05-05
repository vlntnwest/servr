import { useEffect } from "react";
import * as Notifications from "expo-notifications";
import * as Device from "expo-device";
import Constants from "expo-constants";
import { Alert, Platform } from "react-native";
import { apiFetch } from "@/lib/api";

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

async function registerAndSendToken() {
  if (!Device.isDevice) return;

  if (Platform.OS === "android") {
    await Notifications.setNotificationChannelAsync("default", {
      name: "default",
      importance: Notifications.AndroidImportance.MAX,
    });
  }

  const { status: existingStatus } = await Notifications.getPermissionsAsync();
  let finalStatus = existingStatus;

  if (existingStatus !== "granted") {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }

  if (finalStatus !== "granted") return;

  const projectId =
    Constants?.expoConfig?.extra?.eas?.projectId ??
    Constants?.easConfig?.projectId;

  const { data: token } = await Notifications.getExpoPushTokenAsync({
    projectId,
  });
  Alert.alert("Push token", token);

  const result = await apiFetch("/user/me/push-token", {
    method: "PATCH",
    body: JSON.stringify({ token }),
  });
  Alert.alert("API result", JSON.stringify(result));
}

export function usePushNotifications(enabled: boolean) {
  useEffect(() => {
    if (!enabled) return;
    registerAndSendToken().catch((e) => Alert.alert("Push error", String(e)));
  }, [enabled]);
}
