import React, { useEffect, useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { Link, useRouter } from 'expo-router';
import AuthForm from '@/components/AuthForm';
import LoadingState from '@/components/LoadingState';
import ScreenContainer from '@/components/ScreenContainer';
import { useSiprakContext } from '@/context/SiprakContext';
import { colors, fontSizes, spacing } from '@/theme';

const QUICK_DEMO_ACCOUNTS = [
  {
    label: 'Asisten Kelas A',
    name: 'Budi Santoso, S.Kom.',
    email: 'asisten@siprak.ac.id',
    password: 'password123',
  },
  {
    label: 'Praktikan Kelas A',
    name: 'Ahmad Fauzi (220101001)',
    email: 'ahmad@siprak.ac.id',
    password: 'password123',
  },
  {
    label: 'Praktikan 2 Kelas A',
    name: 'Bella Septiani (220101002)',
    email: 'bella@siprak.ac.id',
    password: 'password123',
  },
  {
    label: 'Asisten Kelas B',
    name: 'Siti Aminah, M.Kom.',
    email: 'asisten2@siprak.ac.id',
    password: 'password123',
  },
];

export default function LoginScreen() {
  const router = useRouter();
  const {
    currentUser,
    authStatus,
    authError,
    isAuthenticating,
    loginWithEmail,
    clearAuthError,
  } = useSiprakContext();

  const [email, setEmail] = useState<string>('');
  const [password, setPassword] = useState<string>('');

  // Redirect otomatis berdasarkan status autentikasi & role dari Firestore (FR-S2-02, FR-S2-03, FR-S2-04)
  useEffect(() => {
    if (authStatus === 'authenticated' && currentUser) {
      if (currentUser.peran === 'asisten') {
        router.replace('/asisten');
      } else if (currentUser.peran === 'praktikan') {
        router.replace('/praktikan');
      }
    } else if (
      authStatus === 'profile-pending' ||
      authStatus === 'profile-error'
    ) {
      router.replace('/account-pending');
    }
  }, [authStatus, currentUser, router]);

  // Saat bootstrap sesi awal Firebase Auth belum selesai, tampilkan loading (SRS Bab 5.1)
  if (authStatus === 'initializing') {
    return (
      <ScreenContainer>
        <LoadingState
          fullScreen
          title="Memeriksa Sesi Login..."
          description="Memulihkan status autentikasi Firebase dan memuat profil pengguna."
        />
      </ScreenContainer>
    );
  }

  const handleEmailChange = (value: string) => {
    setEmail(value);
    if (authError) clearAuthError();
  };

  const handlePasswordChange = (value: string) => {
    setPassword(value);
    if (authError) clearAuthError();
  };

  const handleFillDemoAccount = (demoEmail: string, demoPass: string) => {
    setEmail(demoEmail);
    setPassword(demoPass);
    if (authError) clearAuthError();
  };

  return (
    <ScreenContainer>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.keyboardView}>
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}>
          {/* Header Aplikasi */}
          <View style={styles.header}>
            <View style={styles.logoBadge}>
              <Text style={styles.logoBadgeText}>S12</Text>
            </View>
            <Text style={styles.appName}>Siprak-12</Text>
            <Text style={styles.tagline}>
              Sistem Informasi Praktikum Terintegrasi
            </Text>
            <Text style={styles.description}>
              Masuk menggunakan akun Firebase Authentication untuk mengakses jadwal,
              presensi real-time, dan pengajuan izin.
            </Text>
          </View>

          {/* Kartu Form Login */}
          <View style={styles.formCard}>
            <Text style={styles.cardTitle}>Masuk ke Akun</Text>
            <Text style={styles.cardSubtitle}>
              Peran pengguna (Asisten / Praktikan) ditentukan otomatis dari profil
              Cloud Firestore Anda.
            </Text>

            <AuthForm
              mode="login"
              email={email}
              password={password}
              onEmailChange={handleEmailChange}
              onPasswordChange={handlePasswordChange}
              isSubmitting={isAuthenticating}
              errorMessage={authError}
              onSubmit={async (input) => {
                await loginWithEmail(input);
              }}
            />

            {/* Tautan Registrasi */}
            <View style={styles.registerLinkRow}>
              <Text style={styles.registerPromptText}>
                Belum memiliki akun praktikan?{' '}
              </Text>
              <Link href="/register" asChild>
                <Pressable accessibilityRole="link" hitSlop={8}>
                  <Text style={styles.registerLinkText}>Daftar Akun Baru</Text>
                </Pressable>
              </Link>
            </View>
          </View>

          {/* Panel Pengisian Cepat Akun Uji Sprint 2 */}
          <View style={styles.demoSection}>
            <Text style={styles.demoTitle}>
              Pintasan Kredensial Uji (Demo Sprint 2)
            </Text>
            <Text style={styles.demoSubtitle}>
              Ketuk salah satu akun terdaftar di bawah ini untuk mengisi email dan
              kata sandi secara cepat saat demonstrasi:
            </Text>
            <View style={styles.demoGrid}>
              {QUICK_DEMO_ACCOUNTS.map((acc) => {
                const isSelected = email.toLowerCase() === acc.email.toLowerCase();
                return (
                  <Pressable
                    key={acc.email}
                    accessibilityRole="button"
                    style={[
                      styles.demoChip,
                      isSelected && styles.demoChipActive,
                    ]}
                    onPress={() => handleFillDemoAccount(acc.email, acc.password)}>
                    <Text
                      style={[
                        styles.demoChipRole,
                        isSelected && styles.demoChipRoleActive,
                      ]}>
                      {acc.label}
                    </Text>
                    <Text style={styles.demoChipName}>{acc.name}</Text>
                    <Text style={styles.demoChipEmail}>{acc.email}</Text>
                  </Pressable>
                );
              })}
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  keyboardView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: spacing.xxxl,
  },
  header: {
    alignItems: 'center',
    marginVertical: spacing.lg,
  },
  logoBadge: {
    width: 60,
    height: 60,
    borderRadius: 16,
    backgroundColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.md,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  logoBadgeText: {
    fontSize: fontSizes.xl,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: 1,
  },
  appName: {
    fontSize: fontSizes.title,
    fontWeight: '800',
    color: colors.text,
    letterSpacing: 0.5,
  },
  tagline: {
    fontSize: fontSizes.sm,
    fontWeight: '600',
    color: colors.primary,
    marginTop: 4,
    textAlign: 'center',
  },
  description: {
    fontSize: fontSizes.xs,
    color: colors.textSecondary,
    textAlign: 'center',
    marginTop: spacing.xs,
    paddingHorizontal: spacing.md,
    lineHeight: 18,
  },
  formCard: {
    backgroundColor: colors.surface,
    borderRadius: 16,
    padding: spacing.xl,
    borderWidth: 1,
    borderColor: colors.border,
  },
  cardTitle: {
    fontSize: fontSizes.lg,
    fontWeight: '700',
    color: colors.text,
  },
  cardSubtitle: {
    fontSize: fontSizes.xs,
    color: colors.muted,
    marginTop: 4,
    marginBottom: spacing.lg,
    lineHeight: 18,
  },
  registerLinkRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    flexWrap: 'wrap',
    marginTop: spacing.lg,
    minHeight: 44,
  },
  registerPromptText: {
    fontSize: fontSizes.xs,
    color: colors.textSecondary,
  },
  registerLinkText: {
    fontSize: fontSizes.xs,
    fontWeight: '700',
    color: colors.primary,
  },
  demoSection: {
    marginTop: spacing.xl,
    padding: spacing.lg,
    backgroundColor: colors.surfaceSubtle,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.border,
  },
  demoTitle: {
    fontSize: fontSizes.xs,
    fontWeight: '700',
    color: colors.text,
  },
  demoSubtitle: {
    fontSize: fontSizes.xs,
    color: colors.muted,
    marginTop: 2,
    marginBottom: spacing.md,
    lineHeight: 17,
  },
  demoGrid: {
    gap: spacing.sm,
  },
  demoChip: {
    backgroundColor: colors.surface,
    borderRadius: 10,
    padding: spacing.md,
    borderWidth: 1.5,
    borderColor: colors.border,
    minHeight: 54,
  },
  demoChipActive: {
    borderColor: colors.primary,
    backgroundColor: '#EFF6FF',
  },
  demoChipRole: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.primary,
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
  demoChipRoleActive: {
    color: colors.primaryDark,
  },
  demoChipName: {
    fontSize: fontSizes.sm,
    fontWeight: '700',
    color: colors.text,
    marginTop: 2,
  },
  demoChipEmail: {
    fontSize: fontSizes.xs,
    color: colors.muted,
    marginTop: 1,
  },
});
