import React, { useState } from 'react';
import { Alert, FlatList, Text, View } from 'react-native';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { productsApi, sellersApi, type ProductKind } from '@/api';
import { useAuth } from '@/hooks/useAuth';
import { useTheme } from '@/hooks/useT';
import { useT } from '@/hooks/useT';
import { Screen } from '@/components/ui/Screen';
import { Chip } from '@/components/ui/Chip';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { getErrorMessage } from '@/lib/errors';

const TABS = ['all', 'active', 'pending', 'draft'] as const;
const KINDS: ProductKind[] = ['DIGITAL', 'PHYSICAL'];

const pct = (n: number) => `${Math.round(n * 10000) / 100}%`;

export default function SellerProductsScreen() {
  const { user } = useAuth();
  const { colors } = useTheme();
  const { t, language } = useT();
  const qc = useQueryClient();
  const [tab, setTab] = useState<(typeof TABS)[number]>('all');
  const q = useQuery({ queryKey: ['products', 'mine'], queryFn: () => productsApi.list({ limit: 200, includeHidden: true }) });
  const rates = useQuery({ queryKey: ['sellers', 'product-kind-rates'], queryFn: () => sellersApi.productKindRates() });
  const mine = (q.data || []).filter((p) => p.creatorSlug === user?.creatorSlug || p.creatorId === user?.id);
  const rows = mine.filter((p) => tab === 'all' || (p.moderationStatus || 'active').includes(tab));

  const setKind = async (id: string, kind: ProductKind) => {
    try {
      await productsApi.update(id, { productKind: kind });
      await qc.invalidateQueries({ queryKey: ['products', 'mine'] });
    } catch (e) {
      Alert.alert(t('productKind.label'), getErrorMessage(e as Error, language));
    }
  };

  return (
    <Screen>
      <Text style={{ color: colors.text, fontSize: 22, fontWeight: '700', marginBottom: 12 }}>{t('seller.products')}</Text>
      <View style={{ flexDirection: 'row', gap: 8, marginBottom: 12, flexWrap: 'wrap' }}>
        {TABS.map((x) => <Chip key={x} label={x} active={tab === x} onPress={() => setTab(x)} />)}
      </View>
      {rates.data ? (
        <Text style={{ color: colors.textSecondary, fontSize: 12, marginBottom: 8, lineHeight: 18 }}>
          {rates.data.rates.DIGITAL.withheldByPlatform
            ? t('productKind.rates', { digital: pct(rates.data.rates.DIGITAL.total), goods: pct(rates.data.rates.PHYSICAL.total) })
            : rates.data.sellerTypeDeclared
              ? t('productKind.selfDeclare')
              : t('productKind.undeclared')}
        </Text>
      ) : null}
      <FlatList
        data={rows}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => {
          const kind: ProductKind = item.productKind || 'DIGITAL';
          return (
            <View style={{ paddingVertical: 12, borderBottomWidth: 1, borderColor: colors.border, gap: 6 }}>
              <Text style={{ color: colors.text, fontWeight: '700' }}>{item.name}</Text>
              <StatusBadge status={item.moderationStatus || 'active'} />
              <View style={{ flexDirection: 'row', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
                <Text style={{ color: colors.textSecondary, fontSize: 12 }}>{t('productKind.label')}:</Text>
                {KINDS.map((k) => (
                  <Chip
                    key={k}
                    label={`${t(`productKind.${k}`)}${rates.data ? ` · ${pct(rates.data.rates[k].total)}` : ''}`}
                    active={kind === k}
                    onPress={() => (kind === k ? undefined : void setKind(item.id, k))}
                  />
                ))}
                {item.productKindDefaultedAt ? (
                  <Text style={{ color: colors.textSecondary, fontSize: 11 }}>({t('productKind.defaulted')})</Text>
                ) : null}
              </View>
            </View>
          );
        }}
      />
    </Screen>
  );
}
