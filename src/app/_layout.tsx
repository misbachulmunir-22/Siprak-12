import { DarkTheme, DefaultTheme, Stack, ThemeProvider } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import { useColorScheme } from "react-native";

import { AnimatedSplashOverlay } from "@/components/animated-icon";
import { SiprakProvider, useSiprak } from "@/context/SiprakContext";

SplashScreen.preventAutoHideAsync();

function RootNavigator() {
  const { authReady, currentUser } = useSiprak();

  const rutePraktikan = currentUser?.peran === "praktikan" ? "/praktikan" : "/";
  const ruteAsisten = currentUser?.peran === "asisten" ? "/asisten" : "/";

  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="index" />

      <Stack.Protected
        guard={authReady && currentUser?.peran === "asisten"}
        redirectTo={rutePraktikan}
      >
        <Stack.Screen name="asisten" />
        <Stack.Screen name="rekap/[id]" />
      </Stack.Protected>

      <Stack.Protected
        guard={authReady && currentUser?.peran === "praktikan"}
        redirectTo={ruteAsisten}
      >
        <Stack.Screen name="praktikan" />
      </Stack.Protected>

      <Stack.Protected guard={authReady && currentUser !== null} redirectTo="/">
        <Stack.Screen name="sesi/[id]" />
        <Stack.Screen name="explore" />
      </Stack.Protected>
    </Stack>
  );
}

export default function RootLayout() {
  const colorScheme = useColorScheme();

  return (
    <SiprakProvider>
      <ThemeProvider value={colorScheme === "dark" ? DarkTheme : DefaultTheme}>
        <AnimatedSplashOverlay />
        <RootNavigator />
      </ThemeProvider>
    </SiprakProvider>
  );
}
