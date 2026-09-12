import React, { useMemo, useState } from 'react';
import { Text, FlatList, Pressable, View } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import { href } from '@/lib/href';
import { ordersApi } from '@/api';
import { useAuth } from '@/hooks/useAuth';
import { useTheme } from '@/hooks/useT';
import { useT } from '@/hooks/useT';
import { formatDate, formatMoney } from '@/utils/format';
import { Screen } from '@/components/ui/Screen';
import { Chip } from '@/components/ui/Chip';
import { EmptyState } from '@/components/ui/EmptyState';
import { LoginPrompt } from '@/components/ui/LoginPrompt';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { ErrorState } from '@/components/ui/ErrorState';
import { getErrorMessage } from '@/lib/errors';

const FILTERS = ['all', 'active', 'completed', 'refunded', 'cancelled'] as const;

export default function OrdersScreen() {
  const router = useRouter();
  const { isAuthenticated } = useAuth();
  const { colors } = useTheme();
  const { t, language } = useT();
  const [filter, setFilter] = useState<(typeof FILTERS)[number]>('all');
  const q = useQuery({ queryKey: ['orders'], queryFn: ordersApi.list, enabled: isAuthenticated });

  const rows = useMemo(() => {
    const list = q.data || [];
    if (filter === 'all') return list;
    return list.filter((o) => {
      const s = (o.status || '').toLowerCase();
      if (filter === 'active') return ['pending', 'processing', 'paid', 'open'].some((k) => s.includes(k)) && !s.includes('refund') && !s.includes('cancel');
      return s.includes(filter);
    });
  }, [q.data, filter]);

  if (!isAuthenticated) return <LoginPrompt />;
  if (q.isError) return <Screen><ErrorState message={getErrorMessage(q.error, language)} onRetry={() => q.refetch()} /></Screen>;

  return (
    <Screen>
      <Text style={{ color: colors.text, fontSize: 24, fontWeight: '700', marginTop: 8, marginBottom: 12 }}>{t('nav.orders')}</Text>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 12 }}>
        {FILTERS.map((f) => (
          <Chip key={f} label={t(`orders.${f}`)} active={filter === f} onPress={() => setFilter(f)} />
        ))}
      </View>
      <FlatList
        data={rows}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <Pressable
            onPress={() => router.push(href(`/order/${item.id}`))}
            style={{ borderWidth: 1, borderColor: colors.border, backgroundColor: colors.cardBackground, borderRadius: 12, padding: 14, marginBottom: 10 }}
          >
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', gap: 12 }}>
              <Text style={{ color: colors.text, fontWeight: '700', flex: 1 }}>{item.productName}</Text>
              <StatusBadge status={item.status} />
            </View>
            <Text style={{ color: colors.text, fontWeight: '800', marginTop: 8 }}>{formatMoney(item.amount, item.currency)}</Text>
            <Text style={{ color: colors.textSecondary, marginTop: 4, fontSize: 12 }}>{formatDate(item.createdAt)}</Text>
          </Pressable>
        )}
        ListEmptyComponent={<EmptyState title={t('orders.empty')} cta={t('orders.emptyCta')} onPress={() => router.push('/(tabs)/explore')} />}
      />
    </Screen>
  );
}
