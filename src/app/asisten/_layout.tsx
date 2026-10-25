import React from 'react';
import { Redirect, Tabs } from 'expo-router';
import { useSiprakContext } from '@/context/SiprakContext';
import { colors } from '@/theme';

export default function AsistenLayout() {
  const { currentUser } = useSiprakContext();

  // Route guard: hanya pengguna yang sudah login dengan peran asisten yang diizinkan
  if (!currentUser) {
    return <Redirect href="/" />;
  }

  if (currentUser.peran !== 'asisten') {
    return <Redirect href="/" />;
  }

  return (
    <Tabs
      screenOptions={{
        headerShown: true,
        headerStyle: { backgroundColor: colors.surface },
        headerShadowVisible: false,
        headerTitleStyle: { color: colors.text, fontWeight: '700' },
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.muted,
        tabBarStyle: {
          backgroundColor: colors.surface,
          borderTopColor: colors.border,
        },
      }}>
      <Tabs.Screen
        name="index"
        options={{
          title: 'Jadwal',
          headerTitle: 'Jadwal Praktikum',
        }}
      />
      <Tabs.Screen
        name="rekap"
        options={{
          title: 'Rekap',
          headerTitle: 'Rekap Presensi',
        }}
      />
      <Tabs.Screen
        name="profil"
        options={{
          title: 'Profil',
          headerTitle: 'Profil Asisten',
        }}
      />
    </Tabs>
  );
}
