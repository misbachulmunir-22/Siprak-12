import { Tabs, usePathname } from "expo-router";

import { TabBarIcon } from "@/components/TabBarIcon";

export default function AsistenLayout() {
  const pathname = usePathname();
  const hideTabBar = pathname.endsWith("/sesi-form");

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
        tabBarStyle: hideTabBar
          ? { display: "none" }
          : {
              backgroundColor: "#FFFFFF",
              borderTopColor: "#E2E8F0",
              paddingTop: 6,
            },
      }}
    >
      <Tabs.Screen name="index" options={{ title: "Jadwal", tabBarIcon: ({ color, size }) => <TabBarIcon color={color} size={size} name={{ android: "calendar_month", ios: "calendar", web: "calendar_month" }} /> }} />
      <Tabs.Screen name="kelas" options={{ title: "Kelas", tabBarIcon: ({ color, size }) => <TabBarIcon color={color} size={size} name={{ android: "menu_book", ios: "book", web: "menu_book" }} /> }} />
      <Tabs.Screen name="laboratorium" options={{ title: "Ruangan", tabBarIcon: ({ color, size }) => <TabBarIcon color={color} size={size} name={{ android: "meeting_room", ios: "building.2", web: "meeting_room" }} /> }} />
      <Tabs.Screen name="rekap" options={{ title: "Rekap", tabBarIcon: ({ color, size }) => <TabBarIcon color={color} size={size} name={{ android: "fact_check", ios: "checklist", web: "fact_check" }} /> }} />
      <Tabs.Screen name="profil" options={{ title: "Profil", tabBarIcon: ({ color, size }) => <TabBarIcon color={color} size={size} name={{ android: "account_circle", ios: "person.crop.circle", web: "account_circle" }} /> }} />
    </Tabs>
  );
}
