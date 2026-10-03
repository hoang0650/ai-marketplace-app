import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { workApi } from '@/api';
import { useTheme, useT } from '@/hooks/useT';

/** "20.000đ" — the fee is set in VND on the server and charged from the USD wallet. */
export function useWorkListingFee() {
  const q = useQuery({ queryKey: ['work', 'listing-fee'], queryFn: workApi.listingFee, staleTime: 60 * 60_000 });
  const vnd = q.data?.vnd || 0;
  const label = vnd ? `${String(vnd).replace(/\B(?=(\d{3})+(?!\d))/g, '.')}đ` : '';
  return { fee: q.data, label };
}

export function WorkDisclaimer() {
  const router = useRouter();
  const { colors } = useTheme();
  const { t } = useT();
  const { label } = useWorkListingFee();
  return (
    <View style={[styles.box, { borderColor: colors.border, backgroundColor: colors.cardBackground }]}>
      {label ? <Text style={[styles.fee, { color: colors.text }]}>{t('work.fee.title', { fee: label })}</Text> : null}
      <Text style={[styles.body, { color: colors.textSecondary }]}>
        {t('work.disclaimer')}{' '}
        <Text style={{ color: colors.tint, fontWeight: '700' }} onPress={() => router.push('/(tabs)/explore')}>
          {t('work.disclaimer.link')}
        </Text>
        .
      </Text>
      <Pressable onPress={() => router.push('/hire')} hitSlop={6}>
        <Text style={{ color: colors.tint, fontSize: 12, marginTop: 6 }}>{t('hire.list.title')} →</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  box: { borderWidth: 1, borderRadius: 12, padding: 12, marginBottom: 14 },
  fee: { fontWeight: '800', marginBottom: 4 },
  body: { fontSize: 12, lineHeight: 18 },
});
