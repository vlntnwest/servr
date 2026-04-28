import Constants from "expo-constants";

export function getApiUrl(): string {
  if (__DEV__) {
    const hostUri = Constants.expoConfig?.hostUri;
    if (hostUri) {
      const host = hostUri.split(":")[0];
      return `http://${host}:5001`;
    }
  }
  return process.env.EXPO_PUBLIC_API_URL!;
}
