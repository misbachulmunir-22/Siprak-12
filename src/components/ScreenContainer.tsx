import React, { ReactNode } from 'react';
import { StyleProp, StyleSheet, View, ViewStyle } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors, spacing } from '@/theme';

export interface ScreenContainerProps {
  children: ReactNode;
  style?: StyleProp<ViewStyle>;
  disablePadding?: boolean;
  edges?: readonly ('top' | 'right' | 'bottom' | 'left')[];
}

export default function ScreenContainer({
  children,
  style,
  disablePadding = false,
  edges = ['top', 'left', 'right'],
}: ScreenContainerProps) {
  return (
    <SafeAreaView edges={edges} style={styles.safeArea}>
      <View
        style={[
          styles.container,
          !disablePadding && styles.padding,
          style,
        ]}>
        {children}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.background,
  },
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  padding: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
});
