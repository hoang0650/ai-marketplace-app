import React, { useCallback, useMemo, useState } from 'react';
import { View, Text, FlatList, Pressable, ScrollView, StyleSheet } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { productsApi } from '@/api';
import { useTheme } from '@/hooks/useT';
import { useT } from '@/hooks/useT';
import { useDebouncedValue } from '@/hooks/useDebouncedValue';
import { useRecentStore } from '@/stores/recentStore';
import { Screen } from '@/components/ui/Screen';
import { SearchBar } from '@/components/ui/SearchBar';
import { Chip } from '@/components/ui/Chip';
import { ProductCard } from '@/components/ProductCard';
import { EmptyState } from '@/components/ui/EmptyState';
import { ProductSkeleton } from '@/components/ui/Skeleton';
import { PRODUCT_LIST_PERF } from '@/constants/list';
import { AnalyticsService } from '@/lib/analytics';
import { NAV_GROUP_ORDER, NAV_GROUP_TITLE, categoriesByNavGroup, categoryLabel, type NavGroup } from '@/constants/categories';
import type { Product } from '@/api/types';

type Sort = 'recommended' | 'popular' | 'rating' | 'newest' | 'priceAsc' | 'priceDesc';
type GroupTab = 'all' | NavGroup;

const SORTS: Sort[] = ['recommended', 'popular', 'rating', 'newest', 'priceAsc', 'priceDesc'];

function sortProducts(list: Product[], sort: Sort) {
  const rows = [...list];
  if (sort === 'popular') return rows.sort((a, b) => (b.salesCount || 0) - (a.salesCount || 0));
  if (sort === 'rating') return rows.sort((a, b) => (b.rating || 0) - (a.rating || 0));
  if (sort === 'newest') return rows.sort((a, b) => String(b.publishedAt).localeCompare(String(a.publishedAt)));
  if (sort === 'priceAsc') return rows.sort((a, b) => (a.pricing?.price || 0) - (b.pricing?.price || 0));
  if (sort === 'priceDesc') return rows.sort((a, b) => (b.pricing?.price || 0) - (a.pricing?.price || 0));
  return rows.sort((a, b) => Number(b.featured) - Number(a.featured));
}

export default function ExploreScreen() {
  const { colors } = useTheme();
  const { t } = useT();
  const [q, setQ] = useState('');
  const [group, setGroup] = useState<GroupTab>('all');
  const [category, setCategory] = useState('');
  const [sort, setSort] = useState<Sort>('recommended');
  const debounced = useDebouncedValue(q, 400);
  const addSearch = useRecentStore((s) => s.addSearch);
  const recent = useRecentStore((s) => s.searches);

  const results = useQuery({
    queryKey: ['search', debounced, category],
    queryFn: () => {
      if (debounced.trim().length >= 2) addSearch(debounced);
      AnalyticsService.track('search', { q: debounced });
      return productsApi.list({ q: debounced.trim() || undefined, category: category || undefined, limit: 24 });
    },
  });

  const groupChips = useMemo(() => {
    if (group === 'all') return [];
    return categoriesByNavGroup(group).map((c) => ({ id: c.id, label: categoryLabel(c.id, t, c.id, 'short') }));
  }, [group, t]);

  const data = sortProducts(results.data || [], sort);
  const renderItem = useCallback(({ item }: { item: Product }) => <ProductCard product={item} />, []);

  const onGroup = (next: GroupTab) => {
    setGroup(next);
    setCategory('');
  };

  const listHeader = (
    <View style={{ paddingTop: 8, paddingBottom: 4 }}>
      <ScrollView horizontal nestedScrollEnabled showsHorizontalScrollIndicator={false} contentContainerStyle={styles.tabs}>
        <GroupTabChip label={t('cat.all')} active={group === 'all'} onPress={() => onGroup('all')} />
        {NAV_GROUP_ORDER.map((id) => (
          <GroupTabChip
            key={id}
            label={t(NAV_GROUP_TITLE[id])}
            active={group === id}
            onPress={() => onGroup(id)}
          />
        ))}
      </ScrollView>

      {groupChips.length ? (
        <ScrollView horizontal nestedScrollEnabled showsHorizontalScrollIndicator={false} contentContainerStyle={styles.rail}>
          {groupChips.map((item) => (
            <Chip
              key={item.id}
              label={item.label}
              active={item.id === category}
              onPress={() => setCategory(item.id === category ? '' : item.id)}
            />
          ))}
        </ScrollView>
      ) : null}

      <Text style={[styles.sortLabel, { color: colors.textSecondary }]}>{t('explore.sort')}</Text>
      <ScrollView horizontal nestedScrollEnabled showsHorizontalScrollIndicator={false} contentContainerStyle={styles.rail}>
        {SORTS.map((s) => (
          <Chip key={s} label={t(`explore.sort.${s}`)} active={sort === s} onPress={() => setSort(s)} />
        ))}
      </ScrollView>

      {q.length === 0 && recent.length > 0 ? (
        <ScrollView horizontal nestedScrollEnabled showsHorizontalScrollIndicator={false} contentContainerStyle={[styles.rail, { marginTop: 4 }]}>
          {recent.slice(0, 6).map((term) => (
            <Chip key={term} label={term} onPress={() => setQ(term)} />
          ))}
        </ScrollView>
      ) : null}
    </View>
  );

  return (
    <Screen>
      <Text style={[styles.title, { color: colors.text }]}>{t('explore.title')}</Text>
      <SearchBar placeholder={t('home.searchPh')} value={q} onChangeText={setQ} />
      <FlatList
        style={{ flex: 1 }}
        data={results.isLoading ? [] : data}
        keyExtractor={(item) => item.id}
        {...PRODUCT_LIST_PERF}
        numColumns={2}
        columnWrapperStyle={styles.row}
        contentContainerStyle={styles.list}
        renderItem={renderItem}
        ListHeaderComponent={listHeader}
        ListEmptyComponent={
          results.isLoading ? (
            <View style={{ flexDirection: 'row', gap: 10, marginTop: 8 }}>
              <ProductSkeleton />
              <ProductSkeleton />
            </View>
          ) : (
            <EmptyState title={t('common.empty')} />
          )
        }
      />
    </Screen>
  );
}

function GroupTabChip({ label, active, onPress }: { label: string; active: boolean; onPress: () => void }) {
  const { colors } = useTheme();
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityState={{ selected: active }}
      style={[
        styles.groupTab,
        {
          backgroundColor: active ? colors.luxDark : colors.cardBackground,
          borderColor: active ? colors.luxDark : colors.border,
        },
      ]}
    >
      <Text style={{ color: active ? '#f2efe8' : colors.text, fontWeight: '800', fontSize: 13 }} numberOfLines={1}>
        {label}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  title: { fontSize: 24, fontWeight: '700', marginTop: 8, marginBottom: 10 },
  tabs: { gap: 8, paddingBottom: 10 },
  rail: { gap: 8, paddingBottom: 10 },
  groupTab: {
    borderWidth: 1,
    borderRadius: 22,
    paddingHorizontal: 14,
    minHeight: 40,
    justifyContent: 'center',
  },
  sortLabel: {
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
    marginBottom: 8,
    marginTop: 2,
  },
  row: { gap: 10, marginBottom: 12, alignItems: 'stretch' },
  list: { paddingBottom: 24 },
});
