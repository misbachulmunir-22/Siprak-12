import React from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { colors, fontSizes, spacing } from '@/theme';

export interface LoadingStateProps {
  title?: string;
  description?: string;
  fullScreen?: boolean;
}

export default function LoadingState({
  title = 'Memuat data...',
  description = 'Mohon tunggu sebentar, sedang menyinkronkan dengan server Firebase.',
  fullScreen = false,
}: LoadingStateProps) {
  return (
    <View
      style={[styles.container, fullScreen && styles.fullScreen]}
      accessibilityRole="progressbar"
      accessibilityLiveRegion="polite">
      <View style={styles.spinnerBox}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
      <Text style={styles.title}>{title}</Text>
      {description ? <Text style={styles.description}>{description}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: 16,
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.xxl,
    marginVertical: spacing.md,
  },
  fullScreen: {
    flex: 1,
    backgroundColor: colors.background,
    borderWidth: 0,
    borderRadius: 0,
    marginVertical: 0,
  },
  spinnerBox: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: colors.surfaceSubtle,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.md,
  },
  title: {
    fontSize: fontSizes.md,
    fontWeight: '700',
    color: colors.text,
    textAlign: 'center',
  },
  description: {
    fontSize: fontSizes.xs,
    color: colors.textSecondary,
    textAlign: 'center',
    marginTop: spacing.xs,
    lineHeight: 18,
  },
});
