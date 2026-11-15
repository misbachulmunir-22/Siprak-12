import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
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

  const [nama, setNama] = useState('');
  const [nim, setNim] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  useEffect(() => {
    if (authStatus === 'authenticated' && currentUser) {
      router.replace(currentUser.peran === 'asisten' ? '/asisten' : '/praktikan');
    } else if (
      authStatus === 'profile-pending' ||
      authStatus === 'profile-error'
    ) {
      router.replace('/account-pending');
    }
  }, [authStatus, currentUser, router]);

  if (authStatus === 'initializing') {
    return (
      <ScreenContainer>
        <View style={styles.loading}>
          <ActivityIndicator color={colors.primary} size="large" />
          <Text style={styles.subtitle}>Memeriksa status akun...</Text>
        </View>
      </ScreenContainer>
    );
  }

  const clearError = () => {
    if (authError) clearAuthError();
  };

  return (
    <ScreenContainer>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.flex}>
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}>
          <Pressable onPress={() => router.replace('/')} style={styles.backButton}>
            <Text style={styles.backButtonText}>← Kembali ke halaman masuk</Text>
          </Pressable>

          <View style={styles.header}>
            <Text style={styles.title}>Registrasi Akun Praktikan</Text>
            <Text style={styles.subtitle}>
              Buat akun untuk mengakses jadwal, presensi, dan pengajuan izin.
            </Text>
          </View>

          <View style={styles.policyNotice}>
            <Text style={styles.policyTitle}>Peran otomatis: Praktikan</Text>
            <Text style={styles.policyText}>
              Akun baru hanya dapat didaftarkan sebagai Praktikan. Peran Asisten
              ditetapkan oleh pengelola tepercaya, bukan dipilih saat registrasi.
            </Text>
          </View>

          <View style={styles.card}>
            <AuthForm
              mode="register"
              nama={nama}
              nim={nim}
              email={email}
              password={password}
              confirmPassword={confirmPassword}
              onNamaChange={(value) => { setNama(value); clearError(); }}
              onNimChange={(value) => { setNim(value); clearError(); }}
              onEmailChange={(value) => { setEmail(value); clearError(); }}
              onPasswordChange={(value) => { setPassword(value); clearError(); }}
              onConfirmPasswordChange={(value) => { setConfirmPassword(value); clearError(); }}
              isSubmitting={isAuthenticating}
              errorMessage={authError}
              onSubmit={registerAccount}
            />
            <View style={styles.loginRow}>
              <Text style={styles.subtitle}>Sudah memiliki akun? </Text>
              <Pressable onPress={() => router.replace('/')} hitSlop={8}>
                <Text style={styles.link}>Masuk di sini</Text>
              </Pressable>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  loading: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: spacing.md },
  scrollContent: { paddingBottom: spacing.xxxl },
  backButton: { minHeight: 44, justifyContent: 'center', alignSelf: 'flex-start' },
  backButtonText: { color: colors.primary, fontSize: fontSizes.sm, fontWeight: '700' },
  header: { marginVertical: spacing.md },
  title: { color: colors.text, fontSize: fontSizes.xxl, fontWeight: '800' },
  subtitle: { color: colors.textSecondary, fontSize: fontSizes.xs, lineHeight: 18 },
  policyNotice: {
    padding: spacing.md,
    backgroundColor: '#EFF6FF',
    borderRadius: 10,
    borderColor: '#BFDBFE',
    borderWidth: 1,
    marginBottom: spacing.md,
  },
  policyTitle: { color: colors.primaryDark, fontSize: fontSizes.xs, fontWeight: '800' },
  policyText: { color: '#1E3A8A', fontSize: fontSizes.xs, lineHeight: 18, marginTop: 3 },
  card: {
    backgroundColor: colors.surface,
    borderRadius: 16,
    padding: spacing.xl,
    borderWidth: 1,
    borderColor: colors.border,
  },
  loginRow: {
    minHeight: 44,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: spacing.md,
  },
  link: { color: colors.primary, fontSize: fontSizes.xs, fontWeight: '800' },
});
