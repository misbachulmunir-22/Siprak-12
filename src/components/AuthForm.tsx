/**
 * Komponen UI Bersama: AuthForm (SRS Bab 5.3)
 * Owner: Programmer 1 (Jeje)
 * Tanggung jawab: Validasi form registrasi/login dan menampilkan error Firebase.
 */

import React, { useState } from 'react';
import {
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import Button from '@/components/Button';
import {
  validateLoginInput,
  validateRegisterInput,
} from '@/services/authService';
import { colors, fontSizes, spacing } from '@/theme';
import type { LoginInput, RegisterInput } from '@/types/siprak';

export interface AuthFormLoginProps {
  mode: 'login';
  email: string;
  password: string;
  onEmailChange: (value: string) => void;
  onPasswordChange: (value: string) => void;
  onSubmit: (input: LoginInput) => Promise<void> | void;
  isSubmitting?: boolean;
  errorMessage?: string | null;
}

export interface AuthFormRegisterProps {
  mode: 'register';
  nama: string;
  nim: string;
  email: string;
  password: string;
  confirmPassword: string;
  onNamaChange: (value: string) => void;
  onNimChange: (value: string) => void;
  onEmailChange: (value: string) => void;
  onPasswordChange: (value: string) => void;
  onConfirmPasswordChange: (value: string) => void;
  onSubmit: (input: RegisterInput) => Promise<void> | void;
  isSubmitting?: boolean;
  errorMessage?: string | null;
}

export type AuthFormProps = AuthFormLoginProps | AuthFormRegisterProps;

export default function AuthForm(props: AuthFormProps) {
  const { mode, isSubmitting = false, errorMessage } = props;
  const [showPassword, setShowPassword] = useState<boolean>(false);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  const clearFieldError = (key: string) => {
    if (fieldErrors[key]) {
      setFieldErrors((prev) => ({ ...prev, [key]: '' }));
    }
  };

  const handlePressSubmit = async () => {
    if (mode === 'login') {
      const input: LoginInput = {
        email: props.email,
        password: props.password,
      };
      const validation = validateLoginInput(input);
      if (!validation.valid) {
        setFieldErrors(validation.errors);
        return;
      }
      setFieldErrors({});
      await props.onSubmit(input);
      return;
    }

    const input: RegisterInput = {
      nama: props.nama,
      nim: props.nim,
      email: props.email,
      password: props.password,
      confirmPassword: props.confirmPassword,
    };
    const validation = validateRegisterInput(input);
    if (!validation.valid) {
      setFieldErrors(validation.errors);
      return;
    }
    setFieldErrors({});
    await props.onSubmit(input);
  };

  return (
    <View style={styles.container}>
      {errorMessage ? (
        <View
          style={styles.errorBanner}
          accessibilityRole="alert"
          accessibilityLiveRegion="assertive">
          <Text style={styles.errorBannerTitle}>
            {mode === 'login' ? 'Gagal Masuk' : 'Gagal Mendaftar'}
          </Text>
          <Text style={styles.errorBannerText}>{errorMessage}</Text>
        </View>
      ) : null}

      {mode === 'register' ? (
        <>
          {/* Nama Lengkap */}
          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Nama Lengkap *</Text>
            <TextInput
              accessibilityLabel="Nama Lengkap"
              style={[
                styles.textInput,
                Boolean(fieldErrors.nama) && styles.textInputError,
              ]}
              placeholder="Contoh: Raka Pratama"
              placeholderTextColor={colors.disabledText}
              autoCapitalize="words"
              editable={!isSubmitting}
              value={props.nama}
              onChangeText={(value) => {
                clearFieldError('nama');
                props.onNamaChange(value);
              }}
            />
            {fieldErrors.nama ? (
              <Text style={styles.fieldErrorText}>{fieldErrors.nama}</Text>
            ) : null}
          </View>

          {/* NIM */}
          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>
              Nomor Induk Mahasiswa / NIM (Opsional)
            </Text>
            <TextInput
              accessibilityLabel="NIM"
              style={[
                styles.textInput,
                Boolean(fieldErrors.nim) && styles.textInputError,
              ]}
              placeholder="Contoh: 220101099"
              placeholderTextColor={colors.disabledText}
              keyboardType="number-pad"
              editable={!isSubmitting}
              value={props.nim}
              onChangeText={(value) => {
                clearFieldError('nim');
                props.onNimChange(value);
              }}
            />
            {fieldErrors.nim ? (
              <Text style={styles.fieldErrorText}>{fieldErrors.nim}</Text>
            ) : null}
          </View>
        </>
      ) : null}

      {/* Alamat Email */}
      <View style={styles.inputGroup}>
        <Text style={styles.inputLabel}>
          Alamat Email {mode === 'register' ? '*' : ''}
        </Text>
        <TextInput
          accessibilityLabel="Alamat Email"
          style={[
            styles.textInput,
            Boolean(fieldErrors.email) && styles.textInputError,
          ]}
          placeholder={
            mode === 'login'
              ? 'contoh: ahmad@siprak.ac.id'
              : 'Contoh: raka@siprak.ac.id'
          }
          placeholderTextColor={colors.disabledText}
          keyboardType="email-address"
          autoCapitalize="none"
          autoCorrect={false}
          editable={!isSubmitting}
          value={props.email}
          onChangeText={(value) => {
            clearFieldError('email');
            props.onEmailChange(value);
          }}
        />
        {fieldErrors.email ? (
          <Text style={styles.fieldErrorText}>{fieldErrors.email}</Text>
        ) : null}
      </View>

      {/* Kata Sandi */}
      <View style={styles.inputGroup}>
        <View style={styles.passwordHeaderRow}>
          <Text style={styles.inputLabel}>
            Kata Sandi {mode === 'register' ? '*' : ''}
          </Text>
          <Pressable
            accessibilityRole="button"
            onPress={() => setShowPassword((prev) => !prev)}
            hitSlop={8}>
            <Text style={styles.togglePasswordText}>
              {showPassword ? 'Sembunyikan' : 'Tampilkan'}
            </Text>
          </Pressable>
        </View>
        <TextInput
          accessibilityLabel="Kata Sandi"
          style={[
            styles.textInput,
            Boolean(fieldErrors.password) && styles.textInputError,
          ]}
          placeholder="Minimal 6 karakter"
          placeholderTextColor={colors.disabledText}
          secureTextEntry={!showPassword}
          autoCapitalize="none"
          editable={!isSubmitting}
          value={props.password}
          onChangeText={(value) => {
            clearFieldError('password');
            props.onPasswordChange(value);
          }}
        />
        {fieldErrors.password ? (
          <Text style={styles.fieldErrorText}>{fieldErrors.password}</Text>
        ) : null}
      </View>

      {/* Konfirmasi Kata Sandi (Khusus Registrasi) */}
      {mode === 'register' ? (
        <View style={styles.inputGroup}>
          <Text style={styles.inputLabel}>Konfirmasi Kata Sandi *</Text>
          <TextInput
            accessibilityLabel="Konfirmasi Kata Sandi"
            style={[
              styles.textInput,
              Boolean(fieldErrors.confirmPassword) && styles.textInputError,
            ]}
            placeholder="Ketik ulang kata sandi"
            placeholderTextColor={colors.disabledText}
            secureTextEntry={!showPassword}
            autoCapitalize="none"
            editable={!isSubmitting}
            value={props.confirmPassword}
            onChangeText={(value) => {
              clearFieldError('confirmPassword');
              props.onConfirmPasswordChange(value);
            }}
          />
          {fieldErrors.confirmPassword ? (
            <Text style={styles.fieldErrorText}>
              {fieldErrors.confirmPassword}
            </Text>
          ) : null}
        </View>
      ) : null}

      <View style={styles.submitButtonBox}>
        <Button
          title={
            mode === 'login'
              ? isSubmitting
                ? 'Memverifikasi Akun...'
                : 'Masuk'
              : isSubmitting
                ? 'Mendaftarkan Akun...'
                : 'Daftar Sekarang'
          }
          onPress={() => {
            void handlePressSubmit();
          }}
          disabled={isSubmitting}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: '100%',
  },
  errorBanner: {
    backgroundColor: '#FEF2F2',
    borderColor: '#FECACA',
    borderWidth: 1,
    borderRadius: 10,
    padding: spacing.md,
    marginBottom: spacing.md,
  },
  errorBannerTitle: {
    fontSize: fontSizes.xs,
    fontWeight: '700',
    color: '#991B1B',
    marginBottom: 2,
  },
  errorBannerText: {
    fontSize: fontSizes.xs,
    color: '#7F1D1D',
    lineHeight: 18,
  },
  inputGroup: {
    marginBottom: spacing.md,
  },
  passwordHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  inputLabel: {
    fontSize: fontSizes.xs,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 6,
  },
  togglePasswordText: {
    fontSize: fontSizes.xs,
    fontWeight: '600',
    color: colors.primary,
    marginBottom: 6,
  },
  textInput: {
    minHeight: 48,
    backgroundColor: colors.background,
    borderWidth: 1.5,
    borderColor: colors.border,
    borderRadius: 10,
    paddingHorizontal: spacing.md,
    fontSize: fontSizes.sm,
    color: colors.text,
  },
  textInputError: {
    borderColor: colors.danger,
    backgroundColor: '#FFFBFB',
  },
  fieldErrorText: {
    fontSize: fontSizes.xs,
    color: colors.danger,
    marginTop: 4,
    fontWeight: '500',
  },
  submitButtonBox: {
    marginTop: spacing.sm,
  },
});
