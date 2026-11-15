import React, { useEffect } from 'react';
import {
  ActivityIndicator,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useRouter } from 'expo-router';
import Button from '@/components/Button';
import ScreenContainer from '@/components/ScreenContainer';
import { useSiprakContext } from '@/context/SiprakContext';
import { colors, fontSizes, spacing } from '@/theme';

export default function AccountPendingScreen() {
  const router = useRouter();
  const {
    currentUser,
    authStatus,
    authError,
    refreshProfile,
    logout,
    isAuthenticating,
  } = useSiprakContext();

  useEffect(() => {
    if (authStatus === 'unauthenticated') router.replace('/');
    if (authStatus === 'authenticated' && currentUser) {
      router.replace(currentUser.peran === 'asisten' ? '/asisten' : '/praktikan');
    }
  }, [authStatus, currentUser, router]);

  if (authStatus === 'initializing') {
    return (
      <ScreenContainer>
        <View style={styles.center}>
          <ActivityIndicator color={colors.primary} size="large" />
          <Text style={styles.body}>Memeriksa profil akun...</Text>
        </View>
      </ScreenContainer>
    );
  }

  const handleLogout = async () => {
    try {
      await logout();
      router.replace('/');
    } catch {
      // Pesan kesalahan ditampilkan oleh Context.
    }
  };

  return (
    <ScreenContainer>
      <View style={styles.center}>
        <View style={styles.card}>
          <View style={styles.iconCircle}>
            <Text style={styles.iconText}>!</Text>
          </View>
          <Text style={styles.title}>
            {authStatus === 'profile-error' ? 'Profil Gagal Dimuat' : 'Akun Menunggu Aktivasi'}
          </Text>
          <Text style={styles.body}>
            {authError ??
              'Akun Firebase Anda belum memiliki profil aktif di Cloud Firestore.'}
          </Text>

          {currentUser ? (
            <View style={styles.details}>
              <Text style={styles.detailText}>Nama: {currentUser.nama}</Text>
              <Text style={styles.detailText}>Email: {currentUser.email ?? '-'}</Text>
              <Text style={styles.detailText}>UID: {currentUser.id}</Text>
              <Text style={styles.detailText}>Peran: {currentUser.peran}</Text>
            </View>
          ) : null}

          <View style={styles.actions}>
            <Button
              title="Periksa Status Lagi"
              onPress={() => void refreshProfile()}
              disabled={isAuthenticating}
            />
            <Button
              title="Keluar dari Akun"
              variant="secondary"
              onPress={() => void handleLogout()}
            />
          </View>
        </View>
      </View>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, justifyContent: 'center' },
  card: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 16,
    padding: spacing.xl,
    alignItems: 'center',
  },
  iconCircle: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: colors.warningLight,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.md,
  },
  iconText: { color: colors.warning, fontSize: fontSizes.xxl, fontWeight: '800' },
  title: { color: colors.text, fontSize: fontSizes.lg, fontWeight: '800', textAlign: 'center' },
  body: {
    color: colors.textSecondary,
    fontSize: fontSizes.xs,
    textAlign: 'center',
    lineHeight: 19,
    marginTop: spacing.sm,
  },
  details: {
    width: '100%',
    backgroundColor: colors.surfaceSubtle,
    borderRadius: 10,
    padding: spacing.md,
    marginTop: spacing.lg,
    gap: 5,
  },
  detailText: { color: colors.text, fontSize: 11 },
  actions: { width: '100%', gap: spacing.sm, marginTop: spacing.xl },
});
