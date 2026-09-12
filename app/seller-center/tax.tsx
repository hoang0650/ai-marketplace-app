import React from 'react';
import { Text, View } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { sellersApi } from '@/api';
import { useTheme } from '@/hooks/useT';
import { Screen } from '@/components/ui/Screen';

export default function SellerTaxScreen() {
  const { colors } = useTheme();
  const q = useQuery({ queryKey: ['seller-tax'], queryFn: sellersApi.taxProfile });
  const p = q.data || {};
  const entries = Object.entries(p).filter(([k]) => !/history|secret/i.test(k)).slice(0, 16);
  return (
    <Screen>
      <Text style={{ color: colors.text, fontSize: 22, fontWeight: '700', marginBottom: 16 }}>Tax</Text>
      {entries.map(([k, v]) => (
        <View key={k} style={{ paddingVertical: 10, borderBottomWidth: 1, borderColor: colors.border }}>
          <Text style={{ color: colors.textSecondary, fontSize: 12 }}>{k}</Text>
          <Text style={{ color: colors.text }}>{typeof v === 'string' || typeof v === 'number' ? String(v) : JSON.stringify(v).slice(0, 120)}</Text>
        </View>
      ))}
    </Screen>
  );
}
