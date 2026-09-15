import React, { useMemo } from 'react';
import { View, Text, ScrollView, Pressable, RefreshControl, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Image } from 'expo-image';
import { Bell } from 'lucide-react-native';
import { useQuery } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import { href } from '@/lib/href';
import { productsApi } from '@/api';
import type { Creator, HomeFeed, Product } from '@/api/types';
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
import { formatMoney, greetingHour } from '@/utils/format';

function homeFromCatalog(items: Product[]): HomeFeed {
  const byNew = [...items].sort(
    (a, b) => new Date(b.publishedAt || 0).getTime() - new Date(a.publishedAt || 0).getTime(),
  );
  const bySales = [...items].sort((a, b) => Number(b.salesCount || 0) - Number(a.salesCount || 0));
  const shops = new Map<string, Creator>();
  for (const p of items) {
    const slug = p.creatorSlug || p.sellerSlug || '';
    if (!slug) continue;
    const cur = shops.get(slug) || {
      id: p.creatorId || slug,
      slug,
      name: p.creatorName || p.sellerName || slug,
      bio: '',
      avatarUrl: '',
      coverUrl: p.coverUrl || '',
      verified: p.ownershipType === 'PLATFORM_DIRECT',
      productCount: 0,
      rating: 0,
      totalSales: 0,
      revenue: 0,
    };
    cur.productCount += 1;
    cur.totalSales += Number(p.salesCount) || 0;
    shops.set(slug, cur);
  }
  return {
    shops: [...shops.values()].sort((a, b) => (b.totalSales || 0) - (a.totalSales || 0)).slice(0, 8),
    newArrivals: byNew.slice(0, 8),
    promoted: items.filter((p) => p.featured).slice(0, 8),
    bestsellers: bySales.slice(0, 8),
  };
}

function ProductGrid({ items }: { items: Product[] }) {
  return (
    <View style={styles.grid}>
      {items.map((item) => (
        <View key={item.id} style={styles.gridItem}>
          <ProductCard product={item} />
        </View>
      ))}
    </View>
  );
}

function ShopRail({ shops, t }: { shops: Creator[]; t: (k: string, vars?: Record<string, string | number>) => string }) {
  const router = useRouter();
  const { colors } = useTheme();
  return (
    <ScrollView horizontal nestedScrollEnabled showsHorizontalScrollIndicator={false} contentContainerStyle={styles.shopRail}>
      {shops.map((shop) => (
        <Pressable
          key={shop.id}
          onPress={() => router.push(href(`/seller/${shop.slug}`))}
          style={({ pressed }) => [
            styles.shop,
            { backgroundColor: colors.cardBackground, borderColor: colors.border, opacity: pressed ? 0.88 : 1 },
          ]}
        >
          {shop.coverUrl ? (
            <Image source={{ uri: shop.coverUrl }} style={styles.shopCover} contentFit="cover" />
          ) : (
            <View style={[styles.shopCover, { backgroundColor: colors.luxDark }]} />
          )}
          <View style={styles.shopBody}>
            <Text style={[styles.shopName, { color: colors.text }]} numberOfLines={1}>
              {shop.name}
              {shop.verified ? ' ✓' : ''}
            </Text>
            <Text style={{ color: colors.textSecondary, fontSize: 12 }}>
              {t('home.shopListings', { n: shop.productCount })}
            </Text>
            <Text style={[styles.shopRev, { color: colors.text }]}>
              {t('home.shopRevenue', { amount: formatMoney(Number(shop.revenue) || 0) })}
            </Text>
          </View>
        </Pressable>
      ))}
    </ScrollView>
  );
}

export default function HomeScreen() {
  const router = useRouter();
  const { colors } = useTheme();
  const { t, language } = useT();
  const user = useAuthStore((s) => s.user);

  const q = useQuery({
    queryKey: ['home', 'feed'],
    queryFn: async () => {
      try {
        return await productsApi.home();
      } catch {
        const rows = await productsApi.list({ limit: 48 });
        return homeFromCatalog(rows);
      }
    },
  });

  const feed = q.data;
  const greeting = `${greetingHour(language)}${user?.name ? `, ${user.name}` : ''}`;
  const empty = useMemo(() => {
    if (!feed) return true;
    return !(feed.shops.length || feed.newArrivals.length || feed.promoted.length || feed.bestsellers.length);
  }, [feed]);

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

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={styles.list}
        refreshControl={
          <RefreshControl
            refreshing={q.isRefetching}
            onRefresh={() => {
              void q.refetch();
            }}
            tintColor={colors.tint}
          />
        }
      >
        <HubRow />
        <Pressable onPress={() => router.push('/(tabs)/explore')} style={styles.heroWrap}>
          <LinearGradient colors={['#111111', '#2a2520']} style={styles.hero}>
            <Text style={styles.heroTitle}>{t('home.heroTitle')}</Text>
            <Text style={styles.heroBody}>{t('home.heroBody')}</Text>
          </LinearGradient>
        </Pressable>

        {q.isLoading ? (
          <View style={{ flexDirection: 'row', gap: 10, marginTop: 12 }}>
            <ProductSkeleton />
            <ProductSkeleton />
          </View>
        ) : empty ? (
          <EmptyState title={t('common.empty')} hint={t('home.emptyHint')} />
        ) : (
          <>
            {feed?.shops.length ? (
              <View style={styles.section}>
                <SectionHeader title={t('home.shops')} action={t('common.seeAll')} onPress={() => router.push('/(tabs)/explore')} />
                <ShopRail shops={feed.shops} t={t} />
              </View>
            ) : null}
            {feed?.newArrivals.length ? (
              <View style={styles.section}>
                <SectionHeader title={t('home.new')} action={t('common.seeAll')} onPress={() => router.push('/(tabs)/explore')} />
                <ProductGrid items={feed.newArrivals} />
              </View>
            ) : null}
            {feed?.promoted.length ? (
              <View style={styles.section}>
                <SectionHeader title={t('home.promoted')} action={t('common.seeAll')} onPress={() => router.push('/(tabs)/explore')} />
                <ProductGrid items={feed.promoted} />
              </View>
            ) : null}
            {feed?.bestsellers.length ? (
              <View style={styles.section}>
                <SectionHeader title={t('home.bestsellers')} action={t('common.seeAll')} onPress={() => router.push('/(tabs)/explore')} />
                <ProductGrid items={feed.bestsellers} />
              </View>
            ) : null}
          </>
        )}
      </ScrollView>
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
  list: { paddingBottom: 24, paddingTop: 8 },
  section: { marginTop: 14 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  gridItem: { width: '48%', flexGrow: 1 },
  shopRail: { gap: 10, paddingRight: 8 },
  shop: { width: 168, borderRadius: 12, borderWidth: 1, overflow: 'hidden' },
  shopCover: { width: '100%', height: 72 },
  shopBody: { paddingHorizontal: 10, paddingVertical: 10, gap: 2 },
  shopName: { fontSize: 14, fontWeight: '700' },
  shopRev: { fontSize: 12, fontWeight: '700', marginTop: 2 },
});
