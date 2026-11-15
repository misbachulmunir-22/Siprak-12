import React, { useState } from 'react';
import {
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

type CommonProps = {
  isSubmitting?: boolean;
  errorMessage?: string | null;
};

type LoginProps = CommonProps & {
  mode: 'login';
  email: string;
  password: string;
  onEmailChange: (value: string) => void;
  onPasswordChange: (value: string) => void;
  onSubmit: (input: LoginInput) => Promise<unknown> | unknown;
};

type RegisterProps = CommonProps & {
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
  onSubmit: (input: RegisterInput) => Promise<unknown> | unknown;
};

export type AuthFormProps = LoginProps | RegisterProps;

export default function AuthForm(props: AuthFormProps) {
  const [showPassword, setShowPassword] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const submitting = Boolean(props.isSubmitting);

  const setFieldError = (key: string, value: string) => {
    setFieldErrors((previous) => ({ ...previous, [key]: value }));
  };

  const handleSubmit = async () => {
    if (props.mode === 'login') {
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

  const renderError = (key: string) =>
    fieldErrors[key] ? (
      <Text style={styles.fieldError}>{fieldErrors[key]}</Text>
    ) : null;

  const renderInput = (
    label: string,
    value: string,
    onChangeText: (value: string) => void,
    options: {
      key: string;
      placeholder: string;
      secureTextEntry?: boolean;
      keyboardType?: 'default' | 'email-address' | 'number-pad';
      autoCapitalize?: 'none' | 'words';
    }
  ) => (
    <View style={styles.inputGroup}>
      <Text style={styles.label}>{label}</Text>
      <TextInput
        accessibilityLabel={label}
        style={[
          styles.input,
          Boolean(fieldErrors[options.key]) && styles.inputError,
        ]}
        value={value}
        onChangeText={(text) => {
          onChangeText(text);
          if (fieldErrors[options.key]) {
            setFieldError(options.key, '');
          }
        }}
        placeholder={options.placeholder}
        placeholderTextColor={colors.disabledText}
        secureTextEntry={options.secureTextEntry}
        keyboardType={options.keyboardType ?? 'default'}
        autoCapitalize={options.autoCapitalize ?? 'none'}
        autoCorrect={false}
        editable={!submitting}
        returnKeyType="next"
      />
      {renderError(options.key)}
    </View>
  );

  return (
    <View style={styles.container}>
      {props.errorMessage ? (
        <View style={styles.errorBanner} accessibilityRole="alert">
          <Text style={styles.errorTitle}>
            {props.mode === 'login' ? 'Gagal Masuk' : 'Gagal Mendaftar'}
          </Text>
          <Text style={styles.errorText}>{props.errorMessage}</Text>
        </View>
      ) : null}

      {props.mode === 'register'
        ? renderInput('Nama Lengkap', props.nama, props.onNamaChange, {
            key: 'nama',
            placeholder: 'Nama lengkap',
            autoCapitalize: 'words',
          })
        : null}

      {props.mode === 'register'
        ? renderInput('NIM (Opsional)', props.nim, props.onNimChange, {
            key: 'nim',
            placeholder: 'Nomor Induk Mahasiswa',
            keyboardType: 'number-pad',
          })
        : null}

      {renderInput('Email', props.email, props.onEmailChange, {
        key: 'email',
        placeholder: 'nama@email.com',
        keyboardType: 'email-address',
      })}

      <View style={styles.inputGroup}>
        <Text style={styles.label}>Kata Sandi</Text>
        <View style={styles.passwordRow}>
          <TextInput
            accessibilityLabel="Kata Sandi"
            style={[
              styles.input,
              styles.passwordInput,
              Boolean(fieldErrors.password) && styles.inputError,
            ]}
            value={props.password}
            onChangeText={(text) => {
              props.onPasswordChange(text);
              if (fieldErrors.password) setFieldError('password', '');
            }}
            placeholder="Minimal 6 karakter"
            placeholderTextColor={colors.disabledText}
            secureTextEntry={!showPassword}
            autoCapitalize="none"
            autoCorrect={false}
            editable={!submitting}
          />
          <Text
            accessibilityRole="button"
            onPress={() => setShowPassword((value) => !value)}
            style={styles.showPassword}>
            {showPassword ? 'Sembunyikan' : 'Lihat'}
          </Text>
        </View>
        {renderError('password')}
      </View>

      {props.mode === 'register'
        ? renderInput(
            'Konfirmasi Kata Sandi',
            props.confirmPassword,
            props.onConfirmPasswordChange,
            {
              key: 'confirmPassword',
              placeholder: 'Ulangi kata sandi',
              secureTextEntry: true,
            }
          )
        : null}

      <Button
        title={
          submitting
            ? 'Memproses...'
            : props.mode === 'login'
              ? 'Masuk'
              : 'Buat Akun Praktikan'
        }
        onPress={() => void handleSubmit()}
        disabled={submitting}
        style={styles.submitButton}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { gap: spacing.md },
  inputGroup: { gap: 6 },
  label: {
    color: colors.text,
    fontSize: fontSizes.xs,
    fontWeight: '700',
  },
  input: {
    minHeight: 48,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 9,
    backgroundColor: colors.surface,
    paddingHorizontal: spacing.md,
    color: colors.text,
    fontSize: fontSizes.sm,
  },
  inputError: { borderColor: colors.danger },
  fieldError: { color: colors.danger, fontSize: 11 },
  passwordRow: { position: 'relative', justifyContent: 'center' },
  passwordInput: { paddingRight: 92 },
  showPassword: {
    position: 'absolute',
    right: 12,
    color: colors.primary,
    fontSize: 11,
    fontWeight: '700',
    paddingVertical: 12,
  },
  errorBanner: {
    padding: spacing.md,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.danger,
    backgroundColor: colors.dangerLight,
    gap: 4,
  },
  errorTitle: { color: colors.danger, fontSize: fontSizes.sm, fontWeight: '800' },
  errorText: { color: colors.text, fontSize: fontSizes.xs, lineHeight: 18 },
  submitButton: { marginTop: spacing.sm },
});
