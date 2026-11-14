import React from 'react';
import { Redirect, Tabs } from 'expo-router';
import LoadingState from '@/components/LoadingState';
import { useSiprakContext } from '@/context/SiprakContext';
import { colors } from '@/theme';

export default function AsistenLayout() {
  const { currentUser, authStatus } = useSiprakContext();

  // Tampilkan loading saat status Firebase Auth sedang dipulihkan (SRS Bab 5.1 & FR-S2-21)
  if (authStatus === 'initializing') {
    return (
      <LoadingState
        fullScreen
        title="Memverifikasi Akses Asisten..."
        description="Memeriksa otorisasi profil pengguna pada Cloud Firestore."
      />
    );
  }

  // Arahkan ke halaman status akun jika profil belum aktif atau gagal dimuat
  if (authStatus === 'profile-pending' || authStatus === 'profile-error') {
    return <Redirect href="/account-pending" />;
  }

  // Route guard: pengguna belum login diarahkan ke halaman masuk (FR-S2-03, FR-S2-04)
  if (authStatus === 'unauthenticated' || !currentUser) {
    return <Redirect href="/" />;
  }

  // Role guard: praktikan dilarang mengakses rute asisten (FR-S2-04, UT-S2-03)
  if (currentUser.peran !== 'asisten') {
    return <Redirect href="/praktikan" />;
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
