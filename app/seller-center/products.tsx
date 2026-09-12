import React, { useState } from 'react';
import { FlatList, Text, View } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { productsApi } from '@/api';
import { useAuth } from '@/hooks/useAuth';
import { useTheme } from '@/hooks/useT';
import { useT } from '@/hooks/useT';
import { Screen } from '@/components/ui/Screen';
import { Chip } from '@/components/ui/Chip';
import { StatusBadge } from '@/components/ui/StatusBadge';

const TABS = ['all', 'active', 'pending', 'draft'] as const;

export default function SellerProductsScreen() {
  const { user } = useAuth();
  const { colors } = useTheme();
  const { t } = useT();
  const [tab, setTab] = useState<(typeof TABS)[number]>('all');
  const q = useQuery({ queryKey: ['products', 'mine'], queryFn: () => productsApi.list({ limit: 200 }) });
  const mine = (q.data || []).filter((p) => p.creatorSlug === user?.creatorSlug || p.creatorId === user?.id);
  const rows = mine.filter((p) => tab === 'all' || (p.moderationStatus || 'active').includes(tab));
  return (
    <Screen>
      <Text style={{ color: colors.text, fontSize: 22, fontWeight: '700', marginBottom: 12 }}>{t('seller.products')}</Text>
      <View style={{ flexDirection: 'row', gap: 8, marginBottom: 12, flexWrap: 'wrap' }}>
        {TABS.map((x) => <Chip key={x} label={x} active={tab === x} onPress={() => setTab(x)} />)}
      </View>
      <FlatList
        data={rows}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <View style={{ paddingVertical: 12, borderBottomWidth: 1, borderColor: colors.border }}>
            <Text style={{ color: colors.text, fontWeight: '700' }}>{item.name}</Text>
            <StatusBadge status={item.moderationStatus || 'active'} />
          </View>
        )}
      />
    </Screen>
  );
}
