import React from 'react';
import { FlatList, Text, View } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { sellersApi } from '@/api';
import { useTheme } from '@/hooks/useT';
import { useT } from '@/hooks/useT';
import { Screen } from '@/components/ui/Screen';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { formatMoney, formatDate } from '@/utils/format';

export default function SellerPayoutScreen() {
  const { colors } = useTheme();
  const { t } = useT();
  const me = useQuery({ queryKey: ['seller-me'], queryFn: sellersApi.me });
  const q = useQuery({ queryKey: ['seller-payouts'], queryFn: sellersApi.payouts });
  const bank = me.data?.bankAccountMetadata;
  return (
    <Screen>
      <Text style={{ color: colors.text, fontSize: 22, fontWeight: '700' }}>{t('seller.payout')}</Text>
      {bank ? (
        <View style={{ marginVertical: 16 }}>
          <Text style={{ color: colors.textSecondary }}>{bank.bankName}</Text>
          <Text style={{ color: colors.text }}>{bank.accountHolderName}</Text>
          <Text style={{ color: colors.text }}>{bank.accountNumberMasked}</Text>
        </View>
      ) : null}
      <FlatList
        data={q.data || []}
        keyExtractor={(item, i) => String(item.id || item._id || i)}
        renderItem={({ item }) => (
          <View style={{ paddingVertical: 12, borderBottomWidth: 1, borderColor: colors.border, flexDirection: 'row', justifyContent: 'space-between' }}>
            <View>
              <StatusBadge status={item.status || 'pending'} />
              <Text style={{ color: colors.textSecondary, marginTop: 4 }}>{formatDate(item.createdAt)}</Text>
            </View>
            <Text style={{ color: colors.text, fontWeight: '800' }}>{formatMoney(Number(item.amount || 0), item.currency || 'USD')}</Text>
          </View>
        )}
      />
    </Screen>
  );
}
