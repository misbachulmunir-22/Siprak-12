import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Button from '@/components/Button';
import { colors, fontSizes, spacing } from '@/theme';

export interface ErrorStateProps {
  title?: string;
  message: string;
  onRetry?: () => void;
  retryLabel?: string;
}

export default function ErrorState({
  title = 'Gagal Memuat Data',
  message,
  onRetry,
  retryLabel = 'Coba Lagi',
}: ErrorStateProps) {
  return (
    <View
      style={styles.container}
      accessibilityRole="alert"
      accessibilityLiveRegion="assertive">
      <View style={styles.iconCircle}>
        <Text style={styles.iconText}>!</Text>
      </View>
      <Text style={styles.title}>{title}</Text>
      <Text style={styles.message}>{message}</Text>
      {onRetry ? (
        <View style={styles.actionBox}>
          <Button title={retryLabel} onPress={onRetry} variant="primary" />
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    backgroundColor: '#FEF2F2',
    borderColor: '#FECACA',
    borderWidth: 1,
    borderRadius: 16,
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.xl,
    marginVertical: spacing.md,
  },
  iconCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#FEE2E2',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.md,
  },
  iconText: {
    fontSize: fontSizes.xl,
    fontWeight: '800',
    color: colors.danger,
  },
  title: {
    fontSize: fontSizes.md,
    fontWeight: '700',
    color: '#991B1B',
    textAlign: 'center',
  },
  message: {
    fontSize: fontSizes.xs,
    color: '#7F1D1D',
    textAlign: 'center',
    marginTop: spacing.xs,
    lineHeight: 18,
  },
  actionBox: {
    width: '100%',
    marginTop: spacing.lg,
  },
});
