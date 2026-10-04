import React from 'react';
import { ActivityIndicator, FlatList, Pressable, RefreshControl, StyleSheet, Text, View } from 'react-native';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { hireApi } from '@/api';
import type { HireProject } from '@/api/types';
import { href } from '@/lib/href';
import { useAuth } from '@/hooks/useAuth';
import { useTheme, useT } from '@/hooks/useT';
import { Screen } from '@/components/ui/Screen';
import { Chip } from '@/components/ui/Chip';
import { EmptyState } from '@/components/ui/EmptyState';
import { LoginPrompt } from '@/components/ui/LoginPrompt';
import { formatDate, formatMoney } from '@/utils/format';
import { getErrorMessage } from '@/lib/errors';
import { HIRE_REQUEST_CATEGORIES, categoryLabel, categoryMeta } from '@/constants/categories';
import { hireStatusColor } from '@/lib/hire';

type Tab = 'all' | 'buyer' | 'seller';

const TAB_LABEL: Record<Tab, string> = { all: 'hire.list.all', buyer: 'hire.list.asBuyer', seller: 'hire.list.asSeller' };

export default function HireProjectsScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ as?: string }>();
  const tab: Tab = params.as === 'buyer' || params.as === 'seller' ? params.as : 'all';
  const { colors } = useTheme();
  const { t, language } = useT();
  const { isAuthenticated } = useAuth();
  const q = useQuery({
    queryKey: ['hire', 'list', tab],
    queryFn: () => hireApi.list(tab === 'all' ? undefined : tab),
    enabled: isAuthenticated,
  });

  if (!isAuthenticated) {
    return (
      <Screen>
        <Stack.Screen options={{ title: t('hire.list.title') }} />
        <LoginPrompt />
      </Screen>
    );
  }

  const renderItem = ({ item }: { item: HireProject }) => {
    const total = item.milestones.length;
    const done = item.milestones.filter((m) => m.status === 'approved').length;
    const amount = item.quote.amount || item.budget || item.listPrice;
    const other = item.role === 'seller' ? `${t('hire.list.client')}: ${item.buyerName}` : `${t('hire.list.provider')}: ${item.sellerName}`;
    return (
      <Pressable
        onPress={() => router.push(href(`/hire/${item.id}`))}
        style={({ pressed }) => [
          styles.card,
          { backgroundColor: colors.cardBackground, borderColor: colors.border, opacity: pressed ? 0.9 : 1 },
        ]}
      >
        <View style={styles.row}>
          <Text style={[styles.cat, { color: colors.tint }]} numberOfLines={1}>
            {categoryLabel(item.category, t, item.category)}
          </Text>
          <Text style={[styles.status, { color: hireStatusColor(item.status, colors) }]}>{t(`hire.status.${item.status}`)}</Text>
        </View>
        <Text style={[styles.title, { color: colors.text }]} numberOfLines={2}>
          {item.productName}
        </Text>
        <Text style={{ color: colors.textSecondary, marginTop: 4 }} numberOfLines={1}>
          {other}
        </Text>
        <View style={[styles.row, { marginTop: 8 }]}>
          <Text style={{ color: colors.text, fontWeight: '800' }}>{amount ? formatMoney(amount, item.currency) : '—'}</Text>
          {total ? (
            <Text style={{ color: colors.textSecondary, fontSize: 12 }}>{t('hire.list.progress', { done, total })}</Text>
          ) : null}
        </View>
        <Text style={{ color: colors.textSecondary, fontSize: 11, marginTop: 6 }}>
          {t('hire.list.updated')} {formatDate(item.updatedAt, language)}
        </Text>
      </Pressable>
    );
  };

  return (
    <Screen>
      <Stack.Screen options={{ title: t('hire.list.title') }} />
      <Text style={[styles.lede, { color: colors.textSecondary }]}>{t('hire.list.lead')}</Text>
      <View style={styles.tabs}>
        {(['all', 'buyer', 'seller'] as const).map((k) => (
          <Chip key={k} label={t(TAB_LABEL[k])} active={tab === k} onPress={() => router.setParams({ as: k === 'all' ? '' : k })} />
        ))}
      </View>
      {q.isError ? <Text style={{ color: colors.danger, marginBottom: 8 }}>{getErrorMessage(q.error, language)}</Text> : null}
      {q.isLoading ? (
        <ActivityIndicator color={colors.tint} style={{ marginTop: 24 }} />
      ) : (
        <FlatList
          data={q.data || []}
          keyExtractor={(item) => item.id}
          contentContainerStyle={{ paddingBottom: 40 }}
          refreshControl={<RefreshControl refreshing={q.isRefetching} onRefresh={() => q.refetch()} tintColor={colors.tint} />}
          ListEmptyComponent={
            <View>
              <EmptyState title={t('hire.list.empty')} />
              <View style={styles.services}>
                {HIRE_REQUEST_CATEGORIES.map((id) => (
                  <Chip
                    key={id}
                    label={categoryLabel(id, t, id)}
                    onPress={() => router.push(href(categoryMeta(id)?.hubHref || `/category/${id}`))}
                  />
                ))}
              </View>
            </View>
          }
          renderItem={renderItem}
        />
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  lede: { fontSize: 14, lineHeight: 20, marginBottom: 10, marginTop: 4 },
  tabs: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 12 },
  services: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: 8 },
  card: { borderWidth: 1, borderRadius: 16, padding: 14, marginBottom: 12 },
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  cat: { fontSize: 11, fontWeight: '800', textTransform: 'uppercase', letterSpacing: 0.5, flexShrink: 1 },
  status: { fontSize: 11, fontWeight: '800', textTransform: 'uppercase' },
  title: { fontSize: 16, fontWeight: '700', marginTop: 6 },
});
