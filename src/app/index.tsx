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
import { Link, useRouter } from 'expo-router';
import AuthForm from '@/components/AuthForm';
import ScreenContainer from '@/components/ScreenContainer';
import { useSiprakContext } from '@/context/SiprakContext';
import { colors, fontSizes, spacing } from '@/theme';

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

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

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
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={styles.loadingText}>Memeriksa sesi login...</Text>
        </View>
      </ScreenContainer>
    );
  }

  return (
    <ScreenContainer>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.flex}>
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}>
          <View style={styles.header}>
            <View style={styles.logoBadge}>
              <Text style={styles.logoText}>S12</Text>
            </View>
            <Text style={styles.title}>Siprak-12</Text>
            <Text style={styles.tagline}>Sistem Informasi Praktikum</Text>
            <Text style={styles.description}>
              Masuk dengan akun Firebase Authentication. Peran akun dibaca dari
              profil pengguna di Cloud Firestore.
            </Text>
          </View>

          <View style={styles.card}>
            <Text style={styles.cardTitle}>Masuk ke Akun</Text>
            <AuthForm
              mode="login"
              email={email}
              password={password}
              onEmailChange={(value) => {
                setEmail(value);
                if (authError) clearAuthError();
              }}
              onPasswordChange={(value) => {
                setPassword(value);
                if (authError) clearAuthError();
              }}
              isSubmitting={isAuthenticating}
              errorMessage={authError}
              onSubmit={loginWithEmail}
            />
            <View style={styles.registerRow}>
              <Text style={styles.registerPrompt}>Belum memiliki akun? </Text>
              <Link href="/register" asChild>
                <Pressable accessibilityRole="link" hitSlop={8}>
                  <Text style={styles.registerLink}>Daftar sebagai Praktikan</Text>
                </Pressable>
              </Link>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  scrollContent: { paddingBottom: spacing.xxxl },
  loading: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: spacing.md },
  loadingText: { color: colors.textSecondary, fontSize: fontSizes.sm },
  header: { alignItems: 'center', marginVertical: spacing.xl },
  logoBadge: {
    width: 60,
    height: 60,
    borderRadius: 16,
    backgroundColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  logoText: { fontSize: fontSizes.xl, fontWeight: '800', color: '#FFFFFF' },
  title: { fontSize: fontSizes.title, fontWeight: '800', color: colors.text },
  tagline: { color: colors.primary, fontSize: fontSizes.sm, fontWeight: '700', marginTop: 4 },
  description: {
    color: colors.textSecondary,
    fontSize: fontSizes.xs,
    textAlign: 'center',
    marginTop: spacing.sm,
    paddingHorizontal: spacing.md,
    lineHeight: 19,
  },
  card: {
    backgroundColor: colors.surface,
    borderRadius: 16,
    padding: spacing.xl,
    borderWidth: 1,
    borderColor: colors.border,
  },
  cardTitle: { fontSize: fontSizes.lg, fontWeight: '800', color: colors.text, marginBottom: spacing.lg },
  registerRow: {
    minHeight: 44,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    flexWrap: 'wrap',
    marginTop: spacing.md,
  },
  registerPrompt: { fontSize: fontSizes.xs, color: colors.textSecondary },
  registerLink: { fontSize: fontSizes.xs, color: colors.primary, fontWeight: '800' },
});
