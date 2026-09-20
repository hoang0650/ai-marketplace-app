import React, { useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Pressable,
  Share,
  Text,
  View,
  StyleSheet,
} from 'react-native';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { MessageSquare, Share2 } from 'lucide-react-native';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { chatApi, creatorsApi, productsApi, reviewsApi } from '@/api';
import type { Product, Review } from '@/api/types';
import { href } from '@/lib/href';
import { useAuth } from '@/hooks/useAuth';
import { useTheme } from '@/hooks/useT';
import { useT } from '@/hooks/useT';
import { Screen } from '@/components/ui/Screen';
import { Badge } from '@/components/ui/Badge';
import { ProductCard } from '@/components/ProductCard';
import { ErrorState } from '@/components/ui/ErrorState';
import { EmptyState } from '@/components/ui/EmptyState';
import { SearchBar } from '@/components/ui/SearchBar';
import { Chip } from '@/components/ui/Chip';
import { getErrorMessage } from '@/lib/errors';
import { categoryLabel } from '@/constants/categories';
import { formatDate } from '@/utils/format';
import { displayFont } from '@/constants/fonts';

type SortId = 'newest' | 'bestsellers' | 'rating';

function sortProducts(list: Product[], sort: SortId) {
  const rows = [...list];
  if (sort === 'bestsellers') return rows.sort((a, b) => Number(b.salesCount || 0) - Number(a.salesCount || 0));
  if (sort === 'rating') return rows.sort((a, b) => Number(b.rating || 0) - Number(a.rating || 0));
  return rows.sort((a, b) => String(b.publishedAt || '').localeCompare(String(a.publishedAt || '')));
}

export default function SellerScreen() {
  const { slug } = useLocalSearchParams<{ slug: string }>();
  const router = useRouter();
  const { colors, isDark } = useTheme();
  const { t, language } = useT();
  const { isAuthenticated, user } = useAuth();
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState('');
  const [sort, setSort] = useState<SortId>('newest');
  const [chatBusy, setChatBusy] = useState(false);

  const seller = useQuery({ queryKey: ['creator', slug], queryFn: () => creatorsApi.one(String(slug)), enabled: !!slug });
  const products = useQuery({
    queryKey: ['products', 'seller', slug],
    queryFn: () => productsApi.list({ creatorSlug: String(slug), limit: 80 }),
    enabled: !!slug,
  });
  const shopReviews = useQuery({
    queryKey: ['reviews', 'shop', slug],
    queryFn: () => reviewsApi.byShop(String(slug)),
    enabled: !!slug,
  });

  const mine = products.data || [];

  const categories = useMemo(() => [...new Set(mine.map((p) => p.category).filter(Boolean))], [mine]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    let rows = mine;
    if (category) rows = rows.filter((p) => p.category === category);
    if (q) {
      rows = rows.filter((p) => `${p.name} ${p.tagline || ''} ${(p.tags || []).join(' ')}`.toLowerCase().includes(q));
    }
    return sortProducts(rows, sort);
  }, [mine, category, query, sort]);

  const reviewRows = shopReviews.data || [];
  const reviewCount = reviewRows.length || Number(seller.data?.reviewCount) || 0;

  if (seller.isLoading) {
    return (
      <Screen>
        <Stack.Screen options={{ title: '' }} />
        <ActivityIndicator color={colors.tint} />
      </Screen>
    );
  }
  if (seller.isError || !seller.data) {
    return (
      <Screen>
        <Stack.Screen options={{ title: '' }} />
        <ErrorState message={getErrorMessage(seller.error, language)} />
      </Screen>
    );
  }

  const s = seller.data;
  const isOwner = !!user?.id && (String(user.id) === String(s.id) || user.creatorSlug === s.slug);
  const cover = s.coverUrl || mine[0]?.coverUrl || '';
  const joined = s.joinedAt ? new Date(s.joinedAt).getFullYear() : '';

  const startChat = async () => {
    if (!isAuthenticated) {
      router.push('/auth/login');
      return;
    }
    const top = [...mine].sort((a, b) => Number(b.salesCount || 0) - Number(a.salesCount || 0))[0];
    if (!top) {
      Alert.alert('', t('shop.noProducts'));
      return;
    }
    setChatBusy(true);
    try {
      const c = await chatApi.start({ productId: top.id });
      router.push(href(`/chat/${c.id}`));
    } catch (err) {
      Alert.alert('', getErrorMessage(err, language));
    } finally {
      setChatBusy(false);
    }
  };

  const shareShop = () => {
    void Share.share({
      title: s.name,
      message: `https://aimarkets.vn/store/${s.slug}`,
    }).catch(() => {});
  };

  return (
    <Screen padded={false}>
      <Stack.Screen options={{ title: s.name }} />
      <FlatList
        data={filtered}
        numColumns={2}
        keyExtractor={(item) => item.id}
        columnWrapperStyle={styles.cols}
        contentContainerStyle={{ paddingBottom: 32 }}
        ListHeaderComponent={
          <View>
            <View style={styles.hero}>
              {cover ? (
                <Image source={{ uri: cover }} style={StyleSheet.absoluteFill} contentFit="cover" />
              ) : (
                <View style={[StyleSheet.absoluteFill, { backgroundColor: colors.luxDark }]} />
              )}
              <LinearGradient
                colors={isDark ? ['transparent', 'rgba(15,15,15,0.92)'] : ['transparent', 'rgba(17,17,17,0.78)']}
                style={StyleSheet.absoluteFill}
              />
              <View style={styles.heroInner}>
                {s.avatarUrl ? (
                  <Image source={{ uri: s.avatarUrl }} style={styles.avatar} contentFit="cover" />
                ) : (
                  <View style={[styles.avatar, styles.avatarFallback, { backgroundColor: colors.tint }]}>
                    <Text style={styles.avatarLetter}>{s.name.slice(0, 1).toUpperCase()}</Text>
                  </View>
                )}
                <View style={{ flex: 1, minWidth: 0 }}>
                  <Text style={styles.heroName} numberOfLines={2}>
                    {s.name}
                  </Text>
                  {s.verified ? <Badge label={t('common.verified')} /> : null}
                </View>
              </View>
            </View>

            <View style={{ paddingHorizontal: 16, paddingTop: 14 }}>
              <Text style={{ color: colors.textSecondary, lineHeight: 21 }}>
                {s.bio?.trim() || t('shop.bioEmpty')}
              </Text>
              {joined ? (
                <Text style={{ color: colors.textSecondary, marginTop: 6, fontSize: 12 }}>
                  {t('shop.joined', { year: joined })}
                </Text>
              ) : null}

              <View style={[styles.stats, { borderColor: colors.border, backgroundColor: colors.cardBackground }]}>
                <View style={styles.stat}>
                  <Text style={[styles.statValue, { color: colors.text }]}>★ {(s.rating || 0).toFixed(1)}</Text>
                    <Text style={[styles.statLabel, { color: colors.textSecondary }]}>
                    {t('shop.reviews', { n: reviewCount })}
                  </Text>
                </View>
                <View style={[styles.statRule, { backgroundColor: colors.border }]} />
                <View style={styles.stat}>
                  <Text style={[styles.statValue, { color: colors.text }]}>{s.productCount || mine.length}</Text>
                  <Text style={[styles.statLabel, { color: colors.textSecondary }]}>{t('shop.listings')}</Text>
                </View>
                <View style={[styles.statRule, { backgroundColor: colors.border }]} />
                <View style={styles.stat}>
                  <Text style={[styles.statValue, { color: colors.text }]}>{s.productCount || mine.length}</Text>
                  <Text style={[styles.statLabel, { color: colors.textSecondary }]}>{t('shop.listings')}</Text>
                </View>
                <View style={[styles.statRule, { backgroundColor: colors.border }]} />
                <View style={styles.stat}>
                  <Text style={[styles.statValue, { color: colors.text }]}>{s.totalSales || 0}</Text>
                  <Text style={[styles.statLabel, { color: colors.textSecondary }]}>{t('shop.sold')}</Text>
                </View>
              </View>

              <View style={styles.actions}>
                {!isOwner ? (
                  <Pressable
                    onPress={startChat}
                    disabled={chatBusy}
                    accessibilityRole="button"
                    accessibilityLabel={t('shop.chat')}
                    style={[styles.actionBtn, { backgroundColor: colors.luxDark }]}
                  >
                    {chatBusy ? (
                      <ActivityIndicator color="#f2efe8" />
                    ) : (
                      <>
                        <MessageSquare size={16} color="#f2efe8" />
                        <Text style={styles.actionTxt}>{t('shop.chat')}</Text>
                      </>
                    )}
                  </Pressable>
                ) : null}
                <Pressable
                  onPress={shareShop}
                  accessibilityRole="button"
                  accessibilityLabel={t('shop.share')}
                  style={[styles.actionBtn, styles.actionGhost, { borderColor: colors.border, backgroundColor: colors.cardBackground }]}
                >
                  <Share2 size={16} color={colors.text} />
                  <Text style={[styles.actionTxt, { color: colors.text }]}>{t('shop.share')}</Text>
                </Pressable>
              </View>

              <Text style={[styles.section, { color: colors.text }]}>{t('shop.products')}</Text>
              <SearchBar placeholder={t('shop.search')} value={query} onChangeText={setQuery} />

              <View style={styles.chips}>
                <Chip label={t('shop.all')} active={!category} onPress={() => setCategory('')} />
                {categories.map((id) => (
                  <Chip
                    key={id}
                    label={categoryLabel(id, t, id)}
                    active={category === id}
                    onPress={() => setCategory(id)}
                  />
                ))}
              </View>
              <View style={styles.chips}>
                {(['newest', 'bestsellers', 'rating'] as const).map((id) => (
                  <Chip key={id} label={t(`shop.sort.${id}`)} active={sort === id} onPress={() => setSort(id)} />
                ))}
              </View>
            </View>
          </View>
        }
        renderItem={({ item }) => (
          <View style={styles.gridItem}>
            <ProductCard product={item} />
          </View>
        )}
        ListEmptyComponent={
          products.isLoading ? (
            <ActivityIndicator color={colors.tint} style={{ marginTop: 24 }} />
          ) : (
            <EmptyState title={t('shop.empty')} />
          )
        }
        ListFooterComponent={
          <ShopReviews
            reviews={reviewRows}
            rating={s.rating}
            loading={shopReviews.isLoading}
            t={t}
            language={language}
          />
        }
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  hero: { height: 196, justifyContent: 'flex-end' },
  heroInner: { flexDirection: 'row', alignItems: 'flex-end', gap: 12, padding: 16 },
  avatar: { width: 72, height: 72, borderRadius: 36, borderWidth: 2, borderColor: '#fff' },
  avatarFallback: { alignItems: 'center', justifyContent: 'center' },
  avatarLetter: { color: '#111', fontSize: 28, fontWeight: '800', fontFamily: displayFont },
  heroName: { color: '#fff', fontSize: 22, fontWeight: '800', fontFamily: displayFont, marginBottom: 6 },
  stats: {
    marginTop: 16,
    borderWidth: 1,
    borderRadius: 14,
    paddingVertical: 14,
    flexDirection: 'row',
    alignItems: 'center',
  },
  stat: { flex: 1, alignItems: 'center', gap: 2 },
  statValue: { fontSize: 16, fontWeight: '800' },
  statLabel: { fontSize: 11, fontWeight: '600' },
  statRule: { width: 1, height: 28 },
  actions: { flexDirection: 'row', gap: 8, marginTop: 14 },
  actionBtn: {
    flex: 1,
    minHeight: 48,
    borderRadius: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  actionGhost: { borderWidth: 1 },
  actionTxt: { color: '#f2efe8', fontWeight: '800', fontSize: 12, letterSpacing: 0.3, textTransform: 'uppercase' },
  section: { fontSize: 16, fontWeight: '800', marginTop: 22, marginBottom: 10 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 10 },
  cols: { gap: 10, paddingHorizontal: 16, marginBottom: 10 },
  gridItem: { flex: 1, maxWidth: '50%' },
});

function stars(n: number) {
  const v = Math.max(0, Math.min(5, Math.round(n)));
  return '★★★★★'.slice(0, v) + '☆☆☆☆☆'.slice(0, 5 - v);
}

function ShopReviews({
  reviews,
  rating,
  loading,
  t,
  language,
}: {
  reviews: Review[];
  rating: number;
  loading: boolean;
  t: (k: string, vars?: Record<string, string | number>) => string;
  language: 'vi' | 'en';
}) {
  const router = useRouter();
  const { colors } = useTheme();
  const bars = [5, 4, 3, 2, 1].map((star) => {
    const count = reviews.filter((r) => Math.round(r.rating) === star).length;
    const pct = reviews.length ? Math.round((count / reviews.length) * 100) : 0;
    return { star, count, pct };
  });

  return (
    <View style={{ paddingHorizontal: 16, paddingTop: 8, paddingBottom: 28 }}>
      <Text style={{ color: colors.text, fontSize: 16, fontWeight: '800', marginBottom: 10 }}>{t('shop.reviewsTitle')}</Text>
      <View style={{ borderWidth: 1, borderColor: colors.border, backgroundColor: colors.cardBackground, borderRadius: 14, padding: 14, marginBottom: 12 }}>
        <Text style={{ color: colors.text, fontSize: 22, fontWeight: '800' }}>★ {(rating || 0).toFixed(1)}</Text>
        <Text style={{ color: colors.textSecondary, marginTop: 2, fontSize: 12 }}>{t('shop.reviews', { n: reviews.length })}</Text>
        {bars.map((b) => (
          <View key={b.star} style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 6 }}>
            <Text style={{ color: colors.textSecondary, width: 22, fontSize: 11 }}>{b.star}★</Text>
            <View style={{ flex: 1, height: 6, borderRadius: 99, backgroundColor: colors.mist, overflow: 'hidden' }}>
              <View style={{ width: `${b.pct}%`, height: '100%', backgroundColor: colors.tint }} />
            </View>
            <Text style={{ color: colors.textSecondary, width: 20, fontSize: 11, textAlign: 'right' }}>{b.count}</Text>
          </View>
        ))}
      </View>
      {loading ? <ActivityIndicator color={colors.tint} /> : null}
      {!loading && !reviews.length ? <Text style={{ color: colors.textSecondary }}>{t('shop.reviewsEmpty')}</Text> : null}
      {reviews.map((r) => (
        <View key={r.id} style={{ borderWidth: 1, borderColor: colors.border, backgroundColor: colors.cardBackground, borderRadius: 12, padding: 12, marginBottom: 10 }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', gap: 8 }}>
            <Text style={{ color: colors.text, fontWeight: '700', flex: 1 }}>{r.userName}</Text>
            <Text style={{ color: colors.textSecondary, fontSize: 11 }}>{formatDate(r.createdAt, language)}</Text>
          </View>
          <Text style={{ color: colors.tint, marginTop: 4 }}>{stars(r.rating)}</Text>
          {r.productSlug ? (
            <Pressable onPress={() => router.push(href(`/product/${r.productSlug}`))}>
              <Text style={{ color: colors.tint, fontWeight: '700', marginTop: 6, fontSize: 12 }}>{r.productName || t('shop.reviewProduct')}</Text>
            </Pressable>
          ) : null}
          {r.title ? <Text style={{ color: colors.text, fontWeight: '700', marginTop: 6 }}>{r.title}</Text> : null}
          {r.body ? <Text style={{ color: colors.textSecondary, marginTop: 4, lineHeight: 20 }}>{r.body}</Text> : null}
        </View>
      ))}
    </View>
  );
}
