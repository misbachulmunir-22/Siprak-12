
import { SiprakProvider } from '@/context/SiprakContext';
import { colors } from '@/theme';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import React from 'react';
import { SafeAreaProvider } from 'react-native-safe-area-context';

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <SiprakProvider>
        <StatusBar style="dark" />
        <Stack
          screenOptions={{
            headerShown: false,
            contentStyle: { backgroundColor: colors.background },
          }}
        >
          <Stack.Screen name="index" />
          <Stack.Screen name="asisten" />
          <Stack.Screen name="asisten/rekap" />
          <Stack.Screen name="praktikan" />
          <Stack.Screen
            name="sesi/[id]"
            options={{
              headerShown: true,
              title: 'Detail Sesi',
              headerTintColor: colors.primary,
              headerStyle: { backgroundColor: colors.surface },
              headerShadowVisible: false,
              headerBackTitle: 'Kembali',
            }}
          />
          <Stack.Screen
            name="rekap/[id]"
            options={{
              headerShown: true,
              title: 'Rekap Presensi Sesi',
              headerTintColor: colors.primary,
              headerStyle: { backgroundColor: colors.surface },
              headerShadowVisible: false,
              headerBackTitle: 'Kembali',
            }}
          />
        </Stack>
      </SiprakProvider>
    </SafeAreaProvider>
  );
}
