import { Stack } from "expo-router";
import { useAppLifecycle } from "@/hooks/use-app-lifecycle";

export default function AppLayout() {
  useAppLifecycle();

  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen
        name="order/[id]"
        options={{
          presentation: "formSheet",
          sheetGrabberVisible: true,
          headerShown: false,
        }}
      />
    </Stack>
  );
}
