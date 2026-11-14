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
import { useRouter } from 'expo-router';
import AuthForm from '@/components/AuthForm';
import ScreenContainer from '@/components/ScreenContainer';
import { useSiprakContext } from '@/context/SiprakContext';
import { colors, fontSizes, spacing } from '@/theme';

export default function RegisterScreen() {
  const router = useRouter();
  const {
    currentUser,
    authStatus,
    authError,
    isAuthenticating,
    registerAccount,
    clearAuthError,
  } = useSiprakContext();

  const [nama, setNama] = useState<string>('');
  const [email, setEmail] = useState<string>('');
  const [nim, setNim] = useState<string>('');
  const [password, setPassword] = useState<string>('');
  const [confirmPassword, setConfirmPassword] = useState<string>('');

  useEffect(() => {
    if (authStatus === 'authenticated' && currentUser) {
      if (currentUser.peran === 'asisten') {
        router.replace('/asisten');
      } else {
        router.replace('/praktikan');
      }
    } else if (authStatus === 'profile-pending') {
      router.replace('/account-pending');
    }
  }, [authStatus, currentUser, router]);

  return (
    <ScreenContainer>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.keyboardView}>
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}>
          {/* Navigasi Kembali */}
          <Pressable
            accessibilityRole="button"
            onPress={() => router.replace('/')}
            style={styles.backButton}>
            <Text style={styles.backButtonText}>← Kembali ke Halaman Masuk</Text>
          </Pressable>

          {/* Header Registrasi */}
          <View style={styles.header}>
            <Text style={styles.title}>Registrasi Akun Praktikan</Text>
            <Text style={styles.subtitle}>
              Buat akun baru untuk mengikuti kegiatan praktikum, melakukan
              presensi, dan mengajukan izin.
            </Text>
          </View>

          {/* Peringatan Kebijakan Peran (FR-S2-01 & Bab 2.2) */}
          <View style={styles.rolePolicyNotice}>
            <Text style={styles.rolePolicyTitle}>
              Peran Akun Otomatis: Praktikan
            </Text>
            <Text style={styles.rolePolicyDesc}>
              Sesuai kebijakan keamanan laboratorium (FR-S2-01), pendaftaran akun
              baru secara otomatis ditetapkan sebagai Praktikan. Peran Asisten
              hanya diberikan oleh pengelola tepercaya melalui administrasi
              sistem.
            </Text>
          </View>

          {/* Kartu Form Registrasi */}
          <View style={styles.formCard}>
            <AuthForm
              mode="register"
              nama={nama}
              nim={nim}
              email={email}
              password={password}
              confirmPassword={confirmPassword}
              onNamaChange={(v) => {
                setNama(v);
                if (authError) clearAuthError();
              }}
              onNimChange={(v) => {
                setNim(v);
                if (authError) clearAuthError();
              }}
              onEmailChange={(v) => {
                setEmail(v);
                if (authError) clearAuthError();
              }}
              onPasswordChange={(v) => {
                setPassword(v);
                if (authError) clearAuthError();
              }}
              onConfirmPasswordChange={(v) => {
                setConfirmPassword(v);
                if (authError) clearAuthError();
              }}
              isSubmitting={isAuthenticating}
              errorMessage={authError}
              onSubmit={async (input) => {
                await registerAccount(input);
              }}
            />

            <View style={styles.loginLinkRow}>
              <Text style={styles.loginPromptText}>Sudah memiliki akun? </Text>
              <Pressable
                accessibilityRole="link"
                onPress={() => router.replace('/')}
                hitSlop={8}>
                <Text style={styles.loginLinkText}>Masuk di sini</Text>
              </Pressable>
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
  backButton: {
    minHeight: 44,
    justifyContent: 'center',
    alignSelf: 'flex-start',
    marginTop: spacing.xs,
  },
  backButtonText: {
    fontSize: fontSizes.sm,
    fontWeight: '600',
    color: colors.primary,
  },
  header: {
    marginVertical: spacing.md,
  },
  title: {
    fontSize: fontSizes.xxl,
    fontWeight: '800',
    color: colors.text,
  },
  subtitle: {
    fontSize: fontSizes.xs,
    color: colors.textSecondary,
    marginTop: 4,
    lineHeight: 18,
  },
  rolePolicyNotice: {
    backgroundColor: '#EFF6FF',
    borderColor: '#BFDBFE',
    borderWidth: 1,
    borderRadius: 12,
    padding: spacing.md,
    marginBottom: spacing.md,
  },
  rolePolicyTitle: {
    fontSize: fontSizes.xs,
    fontWeight: '700',
    color: colors.primaryDark,
    marginBottom: 2,
  },
  rolePolicyDesc: {
    fontSize: fontSizes.xs,
    color: '#1E3A8A',
    lineHeight: 18,
  },
  formCard: {
    backgroundColor: colors.surface,
    borderRadius: 16,
    padding: spacing.xl,
    borderWidth: 1,
    borderColor: colors.border,
  },
  loginLinkRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: spacing.lg,
    minHeight: 44,
  },
  loginPromptText: {
    fontSize: fontSizes.xs,
    color: colors.textSecondary,
  },
  loginLinkText: {
    fontSize: fontSizes.xs,
    fontWeight: '700',
    color: colors.primary,
  },
});
