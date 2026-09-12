import React from 'react';
import { Text, View } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { sellersApi } from '@/api';
import { useTheme } from '@/hooks/useT';
import { useT } from '@/hooks/useT';
import { Screen } from '@/components/ui/Screen';
import { formatMoney } from '@/utils/format';

export default function SellerRevenueScreen() {
  const { colors } = useTheme();
  const { t } = useT();
  const q = useQuery({ queryKey: ['seller-earnings'], queryFn: sellersApi.earnings });
  const e = q.data;
  if (!e) return <Screen><Text style={{ color: colors.textSecondary }}>{t('common.loading')}</Text></Screen>;
  const cur = e.currency;
  const lines = [
    [t('seller.gross'), e.grossSales],
    [`${t('seller.fee')} 20%`, -e.platformFee],
    [t('seller.taxLine'), -e.taxWithholding],
    [t('seller.paymentFee'), -e.paymentFees],
    [t('seller.refunds'), -e.refunds],
    [t('seller.chargebacks'), -e.chargebacks],
  ];
  return (
    <Screen>
      <Text style={{ color: colors.text, fontSize: 22, fontWeight: '700', marginBottom: 16 }}>{t('seller.revenue')}</Text>
      {lines.map(([label, amount]) => (
        <View key={String(label)} style={{ flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 10, borderBottomWidth: 1, borderColor: colors.border }}>
          <Text style={{ color: colors.text }}>{label}</Text>
          <Text style={{ color: colors.text, fontWeight: '700' }}>{formatMoney(Number(amount), cur)}</Text>
        </View>
      ))}
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 16 }}>
        <Text style={{ color: colors.text, fontWeight: '800' }}>{t('seller.net')}</Text>
        <Text style={{ color: colors.tint, fontWeight: '800' }}>{formatMoney(e.netPayable, cur)}</Text>
      </View>
    </Screen>
  );
}
