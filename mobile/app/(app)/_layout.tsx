import { Icon, Label, NativeTabs } from "expo-router/unstable-native-tabs";

export default function Layout() {
  return (
    <NativeTabs minimizeBehavior="onScrollDown">
      <NativeTabs.Trigger name="orders">
        <Label>Commandes</Label>
        <Icon sf="house.fill" drawable="custom_android_drawable" />
      </NativeTabs.Trigger>

      <NativeTabs.Trigger name="menu">
        <Label>Menu</Label>
        <Icon sf="gear" drawable="custom_android_drawable" />
      </NativeTabs.Trigger>

      <NativeTabs.Trigger name="settings">
        <Label>Paramètres</Label>
        <Icon sf="gear" drawable="custom_android_drawable" />
      </NativeTabs.Trigger>
    </NativeTabs>
  );
}
