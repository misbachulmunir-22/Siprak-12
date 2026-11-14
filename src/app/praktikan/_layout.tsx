import React from 'react';
import { Redirect, Tabs } from 'expo-router';
import LoadingState from '@/components/LoadingState';
import { useSiprakContext } from '@/context/SiprakContext';
import { colors } from '@/theme';

export default function PraktikanLayout() {
  const { currentUser, authStatus } = useSiprakContext();

  // Tampilkan loading saat status Firebase Auth sedang dipulihkan (SRS Bab 5.1 & FR-S2-21)
  if (authStatus === 'initializing') {
    return (
      <LoadingState
        fullScreen
        title="Memverifikasi Akses Praktikan..."
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

  // Role guard: asisten diarahkan ke area asisten jika membuka rute praktikan (FR-S2-04, UT-S2-03)
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
        name="riwayat"
        options={{
          title: 'Riwayat',
          headerTitle: 'Riwayat Presensi',
        }}
      />
      <Tabs.Screen
        name="profil"
        options={{
          title: 'Profil',
          headerTitle: 'Profil Praktikan',
        }}
      />
    </Tabs>
  );
}
