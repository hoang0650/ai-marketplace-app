import React, { useMemo } from 'react';
import { ActivityIndicator, FlatList, Pressable, RefreshControl, Text, View } from 'react-native';
import { Stack, router } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { walletApi } from '@/api';
import { useAuth } from '@/hooks/useAuth';
import { useT, useTheme } from '@/hooks/useT';
import { Screen } from '@/components/ui/Screen';
import { EmptyState } from '@/components/ui/EmptyState';
import { LoginPrompt } from '@/components/ui/LoginPrompt';
import { formatDate } from '@/utils/format';

const REFUND = /(^|\s)(hoàn (tiền|phí)|refund)/i;

/** Refunds = wallet credits that are refunds; the wallet ledger is the source of truth. */
export default function RefundsScreen() {
  const { isAuthenticated } = useAuth();
  const { colors } = useTheme();
  const { t } = useT();
  const q = useQuery({ queryKey: ['wallet'], queryFn: walletApi.list, enabled: isAuthenticated });
  const rows = useMemo(() => (q.data || []).filter((x) => x.type === 'credit' && REFUND.test(x.note || '')), [q.data]);
  const title = <Stack.Screen options={{ title: t('bhub.refunds') }} />;
  if (!isAuthenticated) return <Screen>{title}<LoginPrompt /></Screen>;
  return (
    <Screen>
      {title}
      <Text style={{ color: colors.textSecondary, marginBottom: 8 }}>{t('bhub.refunds.note')}</Text>
      <Pressable onPress={() => router.push('/wallet')}><Text style={{ color: colors.tint, fontWeight: '700', marginBottom: 12 }}>{t('bhub.refunds.ledger')} ›</Text></Pressable>
      {q.isLoading ? <ActivityIndicator color={colors.tint} /> : (
        <FlatList
          data={rows}
          keyExtractor={(r) => r.id}
          refreshControl={<RefreshControl refreshing={q.isRefetching} onRefresh={() => q.refetch()} />}
          ListEmptyComponent={<EmptyState title={t('bhub.refunds.empty')} />}
          renderItem={({ item: r }) => (
            <View style={{ paddingVertical: 12, borderBottomWidth: 1, borderColor: colors.border }}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                <Text style={{ color: colors.text, flex: 1, paddingRight: 8 }}>{r.note}</Text>
                <Text style={{ color: '#11683a', fontWeight: '700' }}>+{r.amount} {r.currency}</Text>
              </View>
              <Text style={{ color: colors.textSecondary, marginTop: 4 }}>{formatDate(r.createdAt)}</Text>
            </View>
          )}
        />
      )}
    </Screen>
  );
}
