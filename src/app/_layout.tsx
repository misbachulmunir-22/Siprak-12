import { AnimatedSplashOverlay } from "@/components/animated-icon";
import { SiprakProvider, useSiprak } from "@/context/SiprakContext";
import { daftarkanPushToken } from "@/lib/push-notifications";
import { DarkTheme, DefaultTheme, Stack, ThemeProvider } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import { useEffect } from "react";
import { useColorScheme } from "react-native";

SplashScreen.preventAutoHideAsync();

function RootNavigator() {
  const { authReady, currentUser } = useSiprak();
  const uid = currentUser?.id;
const peran = currentUser?.peran;

  useEffect(() => {
  if (!authReady || !uid || peran !== "praktikan") return;

  void daftarkanPushToken(uid)
    .then((token) => {
      if (token) {
        console.info("Token push SIPRAK berhasil disimpan.");
      }
    })
    .catch((error) => {
      console.warn("Gagal mendaftarkan token push:", error);
    });
}, [authReady, uid, peran]);
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
        <Stack.Screen name="presensi/[id]" />
        <Stack.Screen name="presensi/scan" />
      </Stack.Protected>

      <Stack.Protected guard={authReady && currentUser !== null} redirectTo="/">
        <Stack.Screen name="sesi/[id]" />
        <Stack.Screen name="explore" />
        <Stack.Screen name="peta" />
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
