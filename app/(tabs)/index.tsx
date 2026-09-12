import React, { useCallback, useMemo } from 'react';
import { View, Text, FlatList, Pressable, RefreshControl, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Bell } from 'lucide-react-native';
import { useQuery } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import { href } from '@/lib/href';
import { productsApi } from '@/api';
import type { Product } from '@/api/types';
import { useTheme } from '@/hooks/useT';
import { useT } from '@/hooks/useT';
import { useAuthStore } from '@/stores/authStore';
import { BrandMark } from '@/components/BrandMark';
import { ProductCard } from '@/components/ProductCard';
import { SearchBar } from '@/components/ui/SearchBar';
import { EmptyState } from '@/components/ui/EmptyState';
import { ProductSkeleton } from '@/components/ui/Skeleton';
import { Screen } from '@/components/ui/Screen';
import { IconHit } from '@/components/ui/LoginPrompt';
import { HubRow } from '@/components/catalog/HubRow';
import { SectionHeader } from '@/components/ui/SectionHeader';
import { PRODUCT_LIST_PERF } from '@/constants/list';
import { greetingHour } from '@/utils/format';

export default function HomeScreen() {
  const router = useRouter();
  const { colors } = useTheme();
  const { t, language } = useT();
  const user = useAuthStore((s) => s.user);

  const q = useQuery({
    queryKey: ['products', 'home'],
    queryFn: () => productsApi.list({ limit: 24 }),
  });

  const products = useMemo(() => {
    const rows = [...(q.data || [])];
    return rows.sort((a, b) => Number(b.featured) - Number(a.featured));
  }, [q.data]);

  const renderItem = useCallback(({ item }: { item: Product }) => <ProductCard product={item} />, []);
  const greeting = `${greetingHour(language)}${user?.name ? `, ${user.name}` : ''}`;

  const listHeader = useMemo(
    () => (
      <View>
        <HubRow />
        <Pressable onPress={() => router.push('/(tabs)/explore')} style={styles.heroWrap}>
          <LinearGradient colors={['#111111', '#2a2520']} style={styles.hero}>
            <Text style={styles.heroTitle}>{t('home.heroTitle')}</Text>
            <Text style={styles.heroBody}>{t('home.heroBody')}</Text>
          </LinearGradient>
        </Pressable>
        <SectionHeader title={t('home.recommended')} action={t('common.seeAll')} onPress={() => router.push('/(tabs)/explore')} />
      </View>
    ),
    [router, t],
  );

  return (
    <Screen>
      <View style={styles.header}>
        <View style={{ flex: 1, paddingRight: 12 }}>
          <BrandMark color={colors.text} size={32} compact />
          <Text style={[styles.hi, { color: colors.text }]} numberOfLines={1}>
            {greeting}
          </Text>
          <Text style={{ color: colors.textSecondary, marginTop: 2 }}>{t('home.prompt')}</Text>
        </View>
        <IconHit label="notifications" onPress={() => router.push(href('/notifications'))}>
          <Bell size={22} color={colors.text} />
        </IconHit>
      </View>
      <SearchBar placeholder={t('home.searchPh')} editable={false} onPress={() => router.push('/(tabs)/explore')} />

      <FlatList
        style={{ flex: 1 }}
        data={q.isLoading ? [] : products}
        keyExtractor={(item) => item.id}
        {...PRODUCT_LIST_PERF}
        numColumns={2}
        columnWrapperStyle={styles.row}
        contentContainerStyle={styles.list}
        renderItem={renderItem}
        refreshControl={
          <RefreshControl
            refreshing={q.isRefetching}
            onRefresh={() => {
              void q.refetch();
            }}
            tintColor={colors.tint}
          />
        }
        ListHeaderComponent={listHeader}
        ListEmptyComponent={
          q.isLoading ? (
            <View style={{ flexDirection: 'row', gap: 10 }}>
              <ProductSkeleton />
              <ProductSkeleton />
            </View>
          ) : (
            <EmptyState title={t('common.empty')} hint={t('home.emptyHint')} />
          )
        }
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'flex-start', marginTop: 4, marginBottom: 10 },
  hi: { fontSize: 22, fontWeight: '700', marginTop: 6 },
  heroWrap: { marginTop: 4, marginBottom: 4 },
  hero: { borderRadius: 14, paddingHorizontal: 16, paddingVertical: 14 },
  heroTitle: { color: '#f2efe8', fontSize: 17, fontWeight: '700' },
  heroBody: { color: 'rgba(245,240,232,0.72)', marginTop: 4, fontSize: 13, lineHeight: 18 },
  row: { gap: 10, marginBottom: 12, alignItems: 'stretch' },
  list: { paddingBottom: 24, paddingTop: 8 },
});
