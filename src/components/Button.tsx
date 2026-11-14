import React from 'react';
import {
  Pressable,
  StyleProp,
  StyleSheet,
  Text,
  TextStyle,
  ViewStyle,
} from 'react-native';
import { colors, fontSizes, spacing } from '@/theme';

export interface ButtonProps {
  title: string;
  onPress: () => void;
  disabled?: boolean;
  variant?: 'primary' | 'secondary' | 'danger';
  style?: StyleProp<ViewStyle>;
  textStyle?: StyleProp<TextStyle>;
}

export default function Button({
  title,
  onPress,
  disabled = false,
  variant = 'primary',
  style,
  textStyle,
}: ButtonProps) {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityState={{ disabled: !!disabled }}
      style={({ pressed }) => [
        styles.base,
        styles[variant],
        disabled && styles.disabled,
        pressed && !disabled && styles.pressed,
        style,
      ]}>
      <Text
        style={[
          styles.textBase,
          styles[`${variant}Text`],
          disabled && styles.disabledText,
          textStyle,
        ]}>
        {title}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    minHeight: 44,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primary: {
    backgroundColor: colors.primary,
  },
  secondary: {
    backgroundColor: colors.surfaceSubtle,
    borderWidth: 1,
    borderColor: colors.border,
  },
  danger: {
    backgroundColor: colors.danger,
  },
  disabled: {
    backgroundColor: colors.disabled,
    borderColor: colors.disabled,
  },
  pressed: {
    opacity: 0.8,
  },
  textBase: {
    fontSize: fontSizes.md,
    fontWeight: '600',
    textAlign: 'center',
  },
  primaryText: {
    color: '#FFFFFF',
  },
  secondaryText: {
    color: colors.text,
  },
  dangerText: {
    color: '#FFFFFF',
  },
  disabledText: {
    color: colors.disabledText,
  },
});
