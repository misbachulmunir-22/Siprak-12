import { Tabs } from "expo-router";

import { TabBarIcon } from "@/components/TabBarIcon";

export default function PraktikanLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: "#174A78",
        tabBarInactiveTintColor: "#7A8793",
        tabBarLabelStyle: {
          fontSize: 12,
          fontWeight: "600",
        },
        tabBarStyle: {
          backgroundColor: "#FFFFFF",
          borderTopColor: "#E2E8F0",
          paddingTop: 6,
        },
      }}
    >
      <Tabs.Screen name="index" options={{ title: "Jadwal", tabBarIcon: ({ color, size }) => <TabBarIcon color={color} size={size} name={{ android: "calendar_month", ios: "calendar", web: "calendar_month" }} /> }} />
      <Tabs.Screen name="riwayat" options={{ title: "Riwayat", tabBarIcon: ({ color, size }) => <TabBarIcon color={color} size={size} name={{ android: "history", ios: "clock.arrow.circlepath", web: "history" }} /> }} />
      <Tabs.Screen name="profil" options={{ title: "Profil", tabBarIcon: ({ color, size }) => <TabBarIcon color={color} size={size} name={{ android: "account_circle", ios: "person.crop.circle", web: "account_circle" }} /> }} />
    </Tabs>
  );
}
