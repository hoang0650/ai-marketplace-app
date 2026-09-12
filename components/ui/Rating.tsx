import React from 'react';
import { Text } from 'react-native';
import { useTheme } from '@/hooks/useT';

export function Rating({ value, count }: { value?: number; count?: number }) {
  const { colors } = useTheme();
  if (!value) return null;
  return (
    <Text style={{ color: colors.textSecondary, fontSize: 12, fontWeight: '600', lineHeight: 16, includeFontPadding: false }}>
      ★ {value.toFixed(1)}
      {count ? ` · ${count}` : ''}
    </Text>
  );
}
