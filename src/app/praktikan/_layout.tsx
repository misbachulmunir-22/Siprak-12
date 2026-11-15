import React from 'react';
import { ActivityIndicator, View } from 'react-native';
import { useSiprakContext } from '@/context/SiprakContext';
import { colors } from '@/theme';
import { Redirect, Tabs } from 'expo-router';

export default function PraktikanLayout() {
  const { currentUser, authStatus } = useSiprakContext();

  if (authStatus === 'initializing') {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.background }}>
        <ActivityIndicator color={colors.primary} size="large" />
      </View>
    );
  }
  if (authStatus === 'profile-pending' || authStatus === 'profile-error') {
    return <Redirect href="/account-pending" />;
  }
  if (authStatus !== 'authenticated' || !currentUser) {
    return <Redirect href="/" />;
  }
  if (currentUser.peran !== 'praktikan') {
    return <Redirect href="/asisten" />;
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
        tabBarStyle: { backgroundColor: colors.surface, borderTopColor: colors.border },
      }}>
      <Tabs.Screen name="index" options={{ title: 'Jadwal', headerShown: false }} />
      <Tabs.Screen name="riwayat" options={{ title: 'Riwayat', headerTitle: 'Riwayat Presensi' }} />
      <Tabs.Screen name="profil" options={{ title: 'Profil', headerTitle: 'Profil Praktikan' }} />
    </Tabs>
  );
}
