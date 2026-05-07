import { Icon, Label, NativeTabs } from "expo-router/unstable-native-tabs";

export default function TabsLayout() {
  return (
    <NativeTabs minimizeBehavior="onScrollDown">
      <NativeTabs.Trigger name="orders">
        <Label>Commandes</Label>
        <Icon sf="list.bullet" drawable="tab_orders" />
      </NativeTabs.Trigger>

      <NativeTabs.Trigger name="menu">
        <Label>Menu</Label>
        <Icon sf="fork.knife" drawable="tab_menu" />
      </NativeTabs.Trigger>

      <NativeTabs.Trigger name="settings">
        <Label>Paramètres</Label>
        <Icon sf="gear" drawable="tab_settings" />
      </NativeTabs.Trigger>
    </NativeTabs>
  );
}
