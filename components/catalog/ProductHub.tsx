import React, { useCallback } from 'react';
import { ActivityIndicator, FlatList, RefreshControl, StyleSheet, Text, View } from 'react-native';
import { Stack } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { productsApi } from '@/api';
import type { Product } from '@/api/types';
import { useTheme } from '@/hooks/useT';
import { useT } from '@/hooks/useT';
import { Screen } from '@/components/ui/Screen';
import { ProductCard } from '@/components/ProductCard';
import { EmptyState } from '@/components/ui/EmptyState';
import { getErrorMessage } from '@/lib/errors';
import { ErrorState } from '@/components/ui/ErrorState';
import { PRODUCT_LIST_PERF } from '@/constants/list';
import { HubBackButton } from '@/components/catalog/HubBackButton';

export function ProductHub({
  title,
  subtitle,
  categories,
  headerExtra,
}: {
  title: string;
  subtitle: string;
  categories: string[];
  headerExtra?: React.ReactNode;
}) {
  const { colors } = useTheme();
  const { t, language } = useT();
  const q = useQuery({
    queryKey: ['products', 'hub', ...categories],
    queryFn: () => productsApi.listMany(categories, 24),
    enabled: categories.length > 0,
  });
  const renderItem = useCallback(({ item }: { item: Product }) => <ProductCard product={item} />, []);

  return (
    <Screen>
      <Stack.Screen options={{ title, headerLeft: () => <HubBackButton />, headerBackVisible: false }} />
      {q.isLoading ? (
        <View style={styles.center}>
          <ActivityIndicator color={colors.tint} />
        </View>
      ) : q.isError ? (
        <ErrorState message={getErrorMessage(q.error, language)} onRetry={() => q.refetch()} />
      ) : (
        <FlatList
          data={q.data || []}
          keyExtractor={(item) => item.id}
          {...PRODUCT_LIST_PERF}
          numColumns={2}
          columnWrapperStyle={styles.row}
          contentContainerStyle={styles.content}
          renderItem={renderItem}
          refreshControl={<RefreshControl refreshing={q.isRefetching} onRefresh={() => q.refetch()} tintColor={colors.tint} />}
          ListHeaderComponent={
            <View style={{ marginBottom: 16 }}>
              <Text style={[styles.title, { color: colors.text }]}>{title}</Text>
              {subtitle ? <Text style={[styles.sub, { color: colors.textSecondary }]}>{subtitle}</Text> : null}
              {headerExtra}
            </View>
          }
          ListEmptyComponent={<EmptyState title={t('common.empty')} hint={t('home.emptyHint')} />}
        />
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  title: { fontSize: 24, fontWeight: '700', lineHeight: 30 },
  sub: { fontSize: 14, lineHeight: 20, marginTop: 8 },
  row: { gap: 10, marginBottom: 12, alignItems: 'stretch' },
  content: { paddingBottom: 32 },
});
