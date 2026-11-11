import React from 'react';
import { Alert, Text, View } from 'react-native';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { usageApi } from '@/api';
import { Button } from '@/components/ui/Button';
import { useTheme, useT } from '@/hooks/useT';
import { getErrorMessage } from '@/lib/errors';
import { formatDate, formatMoney } from '@/utils/format';
import { readServerVnd } from '@/lib/vndDisplay';
import type { Product } from '@/api/types';

/** Buy and show a day, week, month or year entitlement. The charge is the server usage rate. */
export function UsageAccessCard({ product }: { product: Product }) {
  const { colors } = useTheme();
  const { t, language } = useT();
  const qc = useQueryClient();
  const access = useQuery({
    queryKey: ['usage-access', product.id],
    queryFn: () => usageApi.access(product.id),
    retry: false,
  });
  const [busy, setBusy] = React.useState(false);
  const vnd = readServerVnd(product.pricingVnd?.usageRate);
  const price = language === 'vi'
    ? (vnd.ok ? formatMoney(vnd.amountVnd, 'VND') : t('price.vndUnavailable'))
    : formatMoney(Number(product.pricing?.usageRate) || 0, product.pricing?.currency || 'USD');

  const buy = async () => {
    if (language === 'vi' && !vnd.ok) {
      Alert.alert('AI Markets', t('price.vndUnavailable'));
      return;
    }
    setBusy(true);
    try {
      const row = await usageApi.buyAccess(product.id);
      await qc.invalidateQueries({ queryKey: ['usage-access', product.id] });
      Alert.alert('AI Markets', t('usage.access.bought', { date: formatDate(row.expiresAt, language) }));
    } catch (err) {
      Alert.alert('AI Markets', getErrorMessage(err, language));
    } finally {
      setBusy(false);
    }
  };

  return (
    <View style={{ marginTop: 16, gap: 8 }}>
      <Text style={{ color: colors.text, fontWeight: '800' }}>{t('usage.access.buy')}</Text>
      <Text style={{ color: colors.textSecondary }}>{price}</Text>
      <Text style={{ color: colors.textSecondary, lineHeight: 20 }}>
        {access.data?.active && access.data.expiresAt
          ? t('usage.access.until', { date: formatDate(access.data.expiresAt, language) })
          : t('usage.access.none')}
      </Text>
      <Button title={t('usage.access.buy')} loading={busy} disabled={access.data?.active === true} onPress={() => void buy()} />
    </View>
  );
}
