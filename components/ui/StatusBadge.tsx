import React from 'react';
import { Text } from 'react-native';
import { useTheme } from '@/hooks/useT';

export function StatusBadge({ status }: { status: string }) {
  const { colors } = useTheme();
  const s = (status || '').toLowerCase();
  const color = s.includes('pending') || s.includes('hold') || s.includes('open')
    ? colors.tint
    : s.includes('fail') || s.includes('cancel') || s.includes('reject')
      ? colors.danger
      : s.includes('paid') || s.includes('complete') || s.includes('success') || s.includes('closed')
        ? colors.success
        : colors.textSecondary;
  return (
    <Text style={{ color, fontSize: 11, fontWeight: '800', textTransform: 'uppercase', letterSpacing: 0.4 }}>{status}</Text>
  );
}
