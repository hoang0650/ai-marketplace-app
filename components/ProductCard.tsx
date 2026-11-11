import React, { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import { href } from '@/lib/href';
import type { Product } from '@/api/types';
import { useT, useTheme } from '@/hooks/useT';
import { formatMoney, productSale } from '@/utils/format';
import { listedVndQuote, readServerVnd } from '@/lib/vndDisplay';
import { usageUnitLabelText } from '@/lib/usageUnits';
import { Rating } from '@/components/ui/Rating';
import { Badge } from '@/components/ui/Badge';
import { AnalyticsService } from '@/lib/analytics';
import { categoryLabel, isContentCategory, isFilmCategory } from '@/constants/categories';
import { WishButton } from '@/components/content/WishButton';

export const ProductCard = React.memo(function ProductCard({ product }: { product: Product }) {
  const router = useRouter();
  const { colors } = useTheme();
  const { t, language } = useT();
  const [failedCoverUrl, setFailedCoverUrl] = useState('');
  const content = isContentCategory(product.category);
  const episodes = Number(product.contentMeta?.episodeCount) || 0;
  const usage = product.pricing?.model === 'usage';
  const unitLabel = usageUnitLabelText(product.pricing?.usageUnitLabel, language);
  const quoted = readServerVnd(listedVndQuote(product));
  const compareQuoted = readServerVnd(product.pricingVnd?.compareAtPrice);
  const rawAmount = usage ? Number(product.pricing?.usageRate) || 0 : Number(product.pricing?.price) || 0;
  const rawCurrency = product.pricing?.currency || 'USD';
  const baseCore = language === 'vi'
    ? (quoted.ok ? formatMoney(quoted.amountVnd, 'VND') : t(quoted.code === 'AMOUNT_BELOW_VND_PRECISION' ? 'price.belowDong' : 'price.vndUnavailable'))
    : formatMoney(rawAmount, rawCurrency);
  const basePrice = usage && unitLabel ? `${baseCore} / ${unitLabel}` : baseCore;
  const priceLabel = content ? t('license.from', { price: basePrice }) : basePrice;
  const sale = productSale(product);
  const seller = product.sellerName || product.creatorName || product.category;
  const platformDirect = product.soldByPlatform || product.ownershipType === 'PLATFORM_DIRECT';

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
      {product.coverUrl && failedCoverUrl !== product.coverUrl ? (
        <Image
          source={{ uri: product.coverUrl }}
          style={[styles.cover, content ? styles.coverPoster : null]}
          contentFit="cover"
          cachePolicy="memory-disk"
          recyclingKey={product.id}
          transition={0}
          onError={() => setFailedCoverUrl(product.coverUrl || '')}
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
          {product.sectorQualification?.status === 'draft_unverified' && product.sectorQualification.qualified === false
            ? ` · ${t('cat.draft.short')}`
            : ''}
        </Text>
        <Text style={[styles.name, { color: colors.text }]} numberOfLines={2}>
          {product.name}
        </Text>
        <Text style={[styles.meta, { color: colors.textSecondary }]} numberOfLines={1}>
          {seller}
          {episodes ? ` · ${t(isFilmCategory(product.category) ? 'license.episodes' : 'license.chapters', { n: episodes })}` : ''}
        </Text>
        <Badge label={t(platformDirect ? 'card.soldByPlatform' : 'card.soldBySeller')} tone={platformDirect ? 'gold' : 'muted'} />
        <View style={styles.stats}>
          <Rating value={product.rating} count={product.reviewCount} />
          {Number(product.salesCount) > 0 ? (
            <Text style={[styles.sales, { color: colors.textSecondary }]}>{t('card.sold', { n: product.salesCount || 0 })}</Text>
          ) : null}
        </View>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 6 }}>
          {sale.onSale ? (
            <Text style={[styles.price, { color: colors.textSecondary, textDecorationLine: 'line-through', fontWeight: '600' }]}>
              {language === 'vi'
                ? (compareQuoted.ok ? formatMoney(compareQuoted.amountVnd, 'VND') : t('price.vndUnavailable'))
                : sale.was}
            </Text>
          ) : null}
          <Text style={[styles.price, { color: colors.text }]}>{priceLabel}</Text>
        </View>
      </View>
    </Pressable>
  );
});

const styles = StyleSheet.create({
  card: { flex: 1, alignSelf: 'stretch', borderRadius: 14, borderWidth: 1, overflow: 'hidden' },
  cover: { width: '100%', height: 120 },
  coverPoster: { height: 168 },
  fallback: { alignItems: 'center', justifyContent: 'center' },
  fallbackMark: { width: 48, height: 48, borderRadius: 10 },
  body: { paddingHorizontal: 12, paddingTop: 11, paddingBottom: 14, gap: 6 },
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
  stats: { minHeight: 16, flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 5 },
  sales: { fontSize: 11, lineHeight: 16, fontWeight: '600', includeFontPadding: false },
  price: { fontWeight: '800', fontSize: 14, lineHeight: 20, marginTop: 2, includeFontPadding: false },
});
