import React, { useEffect } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import Button from '@/components/Button';
import ErrorState from '@/components/ErrorState';
import LoadingState from '@/components/LoadingState';
import ScreenContainer from '@/components/ScreenContainer';
import { useSiprakContext } from '@/context/SiprakContext';
import { colors, fontSizes, spacing } from '@/theme';

export default function AccountPendingScreen() {
  const router = useRouter();
  const { currentUser, authStatus, authError, refreshProfile, logout } =
    useSiprakContext();

  useEffect(() => {
    if (authStatus === 'unauthenticated') {
      router.replace('/');
    } else if (authStatus === 'authenticated' && currentUser?.aktif) {
      if (currentUser.peran === 'asisten') {
        router.replace('/asisten');
      } else {
        router.replace('/praktikan');
      }
    }
  }, [authStatus, currentUser, router]);

  if (authStatus === 'initializing') {
    return (
      <ScreenContainer>
        <LoadingState
          fullScreen
          title="Memeriksa Status Akun..."
          description="Menghubungi Cloud Firestore untuk memuat profil Anda."
        />
      </ScreenContainer>
    );
  }

  const handleLogout = async () => {
    await logout();
    router.replace('/');
  };

  if (authStatus === 'profile-error') {
    return (
      <ScreenContainer>
        <View style={styles.centerBox}>
          <ErrorState
            title="Gagal Memuat Profil Pengguna"
            message={
              authError ||
              'Terjadi gangguan koneksi saat membaca dokumen profil dari Cloud Firestore.'
            }
            onRetry={() => {
              void refreshProfile();
            }}
            retryLabel="Coba Muat Ulang"
          />
          <View style={styles.logoutBox}>
            <Button
              title="Keluar Akun"
              variant="secondary"
              onPress={() => {
                void handleLogout();
              }}
            />
          </View>
        </View>
      </ScreenContainer>
    );
  }

  return (
    <ScreenContainer>
      <View style={styles.centerBox}>
        <View style={styles.card}>
          <View style={styles.badgeCircle}>
            <Text style={styles.badgeIcon}>!</Text>
          </View>
          <Text style={styles.title}>Status Akun Menunggu Aktivasi</Text>
          <Text style={styles.subtitle}>
            {authError ||
              'Profil akun Anda saat ini belum aktif atau peran pengguna belum ditetapkan oleh pengelola laboratorium.'}
          </Text>

          {currentUser ? (
            <View style={styles.infoBox}>
              <Text style={styles.infoRow}>
                Nama: <Text style={styles.infoStrong}>{currentUser.nama}</Text>
              </Text>
              <Text style={styles.infoRow}>
                Email: <Text style={styles.infoStrong}>{currentUser.email}</Text>
              </Text>
              <Text style={styles.infoRow}>
                UID: <Text style={styles.infoStrong}>{currentUser.id}</Text>
              </Text>
              <Text style={styles.infoRow}>
                Status:{' '}
                <Text style={styles.infoStrong}>
                  {currentUser.aktif ? 'Aktif' : 'Nonaktif / Menunggu Aktivasi'}
                </Text>
              </Text>
            </View>
          ) : null}

          <View style={styles.buttonStack}>
            <Button
              title="Periksa Status Sekarang"
              onPress={() => {
                void refreshProfile();
              }}
            />
            <Button
              title="Keluar & Ganti Akun"
              variant="secondary"
              onPress={() => {
                void handleLogout();
              }}
            />
          </View>
        </View>
      </View>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  centerBox: {
    flex: 1,
    justifyContent: 'center',
  },
  card: {
    backgroundColor: colors.surface,
    borderRadius: 16,
    padding: spacing.xl,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
  },
  badgeCircle: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: colors.warningLight,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.md,
  },
  badgeIcon: {
    fontSize: fontSizes.xxl,
    fontWeight: '800',
    color: colors.warning,
  },
  title: {
    fontSize: fontSizes.lg,
    fontWeight: '800',
    color: colors.text,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: fontSizes.xs,
    color: colors.textSecondary,
    textAlign: 'center',
    marginTop: spacing.xs,
    lineHeight: 19,
  },
  infoBox: {
    width: '100%',
    backgroundColor: colors.surfaceSubtle,
    borderRadius: 10,
    padding: spacing.md,
    marginTop: spacing.lg,
    gap: 4,
  },
  infoRow: {
    fontSize: fontSizes.xs,
    color: colors.textSecondary,
  },
  infoStrong: {
    fontWeight: '700',
    color: colors.text,
  },
  buttonStack: {
    width: '100%',
    gap: spacing.sm,
    marginTop: spacing.xl,
  },
  logoutBox: {
    marginTop: spacing.md,
  },
});
