import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import { href } from '@/lib/href';
import type { Product } from '@/api/types';
import { useTheme } from '@/hooks/useT';
import { useT } from '@/hooks/useT';
import { productPrice, productSale } from '@/utils/format';
import { Rating } from '@/components/ui/Rating';
import { Badge } from '@/components/ui/Badge';
import { AnalyticsService } from '@/lib/analytics';
import { categoryLabel, isContentCategory, isFilmCategory } from '@/constants/categories';
import { WishButton } from '@/components/content/WishButton';

export const ProductCard = React.memo(function ProductCard({ product }: { product: Product }) {
  const router = useRouter();
  const { colors } = useTheme();
  const { t } = useT();
  const content = isContentCategory(product.category);
  const episodes = Number(product.contentMeta?.episodeCount) || 0;
  const priceLabel = content ? t('license.from', { price: productPrice(product) }) : productPrice(product);
  const sale = productSale(product);
  const seller = product.sellerName || product.creatorName || product.category;
  const verified = product.ownershipType === 'PLATFORM_DIRECT';

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={product.name}
      onPress={() => {
        AnalyticsService.track('product_view', { slug: product.slug });
        router.push(href(`/product/${product.slug}`));
      }}
      style={({ pressed }) => [
        styles.card,
        { backgroundColor: colors.cardBackground, borderColor: colors.border, opacity: pressed ? 0.9 : 1 },
      ]}
    >
      {product.coverUrl ? (
        <Image
          source={{ uri: product.coverUrl }}
          style={[styles.cover, content ? styles.coverPoster : null]}
          contentFit="cover"
          cachePolicy="memory-disk"
          recyclingKey={product.id}
          transition={0}
        />
      ) : (
        <View style={[styles.cover, content ? styles.coverPoster : null, styles.fallback, { backgroundColor: colors.luxDark }]}>
          <Image source={require('@/assets/images/mark.png')} style={styles.fallbackMark} cachePolicy="memory" recyclingKey="mark" />
        </View>
      )}
      <WishButton productId={product.id} />
      <View style={styles.body}>
        <Text style={[styles.cat, { color: colors.tint }]} numberOfLines={1}>
          {categoryLabel(product.category, t, product.category)}
        </Text>
        <Text style={[styles.name, { color: colors.text }]} numberOfLines={2}>
          {product.name}
        </Text>
        <Text style={[styles.meta, { color: colors.textSecondary }]} numberOfLines={1}>
          {seller}
          {episodes ? ` · ${t(isFilmCategory(product.category) ? 'license.episodes' : 'license.chapters', { n: episodes })}` : ''}
        </Text>
        {verified ? <Badge label={t('common.verified')} /> : null}
        <Rating value={product.rating} count={product.reviewCount} />
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 6 }}>
          {sale.onSale ? (
            <Text style={[styles.price, { color: colors.textSecondary, textDecorationLine: 'line-through', fontWeight: '600' }]}>{sale.was}</Text>
          ) : null}
          <Text style={[styles.price, { color: colors.text }]}>{priceLabel}</Text>
        </View>
      </View>
    </Pressable>
  );
});

const styles = StyleSheet.create({
  card: { flex: 1, alignSelf: 'stretch', borderRadius: 12, borderWidth: 1, overflow: 'hidden' },
  cover: { width: '100%', height: 112 },
  coverPoster: { height: 168 },
  fallback: { alignItems: 'center', justifyContent: 'center' },
  fallbackMark: { width: 48, height: 48, borderRadius: 10 },
  body: { paddingHorizontal: 12, paddingTop: 10, paddingBottom: 14, gap: 5 },
  cat: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.6,
    textTransform: 'uppercase',
    lineHeight: 14,
    includeFontPadding: false,
  },
  name: { fontWeight: '700', fontSize: 13, lineHeight: 18, minHeight: 36, includeFontPadding: false },
  meta: { fontSize: 12, lineHeight: 16, includeFontPadding: false },
  price: { fontWeight: '800', fontSize: 14, lineHeight: 20, marginTop: 2, includeFontPadding: false },
});
