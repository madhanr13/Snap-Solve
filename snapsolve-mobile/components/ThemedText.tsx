import React from 'react';
import { Text, TextProps } from 'react-native';
import { useTheme } from '../utils/ThemeContext';

interface ThemedTextProps extends TextProps {
  variant?: 'default' | 'secondary' | 'muted' | 'accent' | 'danger' | 'success';
  weight?: 'regular' | 'medium' | 'semibold' | 'bold';
}

export function ThemedText({
  style,
  variant = 'default',
  weight = 'regular',
  ...rest
}: ThemedTextProps) {
  const { colors } = useTheme();

  let color = colors.text;
  switch (variant) {
    case 'secondary': color = colors.textSecondary; break;
    case 'muted': color = colors.textMuted; break;
    case 'accent': color = colors.accent; break;
    case 'danger': color = colors.danger; break;
    case 'success': color = colors.success; break;
  }

  let fontFamily = 'Inter_400Regular';
  switch (weight) {
    case 'medium': fontFamily = 'Inter_500Medium'; break;
    case 'semibold': fontFamily = 'Inter_600SemiBold'; break;
    case 'bold': fontFamily = 'Inter_700Bold'; break;
  }

  return (
    <Text
      style={[
        { color, fontFamily },
        style,
      ]}
      {...rest}
    />
  );
}
