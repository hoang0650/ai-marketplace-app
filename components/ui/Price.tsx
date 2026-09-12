import React from 'react';
import { Text } from 'react-native';
import { useTheme } from '@/hooks/useT';
import { formatMoney } from '@/utils/format';

export function Price({ amount, currency, unit }: { amount: number; currency?: string; unit?: string }) {
  const { colors } = useTheme();
  return (
    <Text style={{ color: colors.text, fontWeight: '800', fontSize: 16 }}>
      {formatMoney(amount, currency || 'USD')}
      {unit ? ` ${unit}` : ''}
    </Text>
  );
}
