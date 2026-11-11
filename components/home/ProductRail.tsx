import React from 'react';
import { View, Text, ScrollView, Pressable, StyleSheet } from 'react-native';
import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import { href } from '@/lib/href';
import type { Product } from '@/api/types';
import { useTheme, useT } from '@/hooks/useT';
import { formatMoney, productSale } from '@/utils/format';
import { listedVndQuote, serverVndInteger } from '@/lib/vndDisplay';
import { AnalyticsService } from '@/lib/analytics';
import { isBlockedProduct, useBlockStore } from '@/stores/blockStore';

export function ProductRail({ items }: { items: Product[] }) {
  const router = useRouter();
  const { colors } = useTheme();
  const { t, language } = useT();
  const blockedEntries = useBlockStore((s) => s.entries);
  const visible = items.filter((product) => !isBlockedProduct(product, blockedEntries));

  if (!visible.length) return null;

  return (
    <ScrollView
      horizontal
      nestedScrollEnabled
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.rail}
    >
      {visible.map((product) => {
        const sale = productSale(product);
        return (
          <Pressable
            key={product.id}
            accessibilityRole="button"
            accessibilityLabel={product.name}
            onPress={() => {
              AnalyticsService.track('product_view', { slug: product.slug });
              router.push(href(`/product/${product.slug}`));
            }}
            style={({ pressed }) => [
              styles.card,
              {
                backgroundColor: colors.cardBackground,
                borderColor: colors.border,
                opacity: pressed ? 0.9 : 1,
              },
            ]}
          >
            {product.coverUrl ? (
              <Image source={{ uri: product.coverUrl }} style={styles.cover} contentFit="cover" transition={0} />
            ) : (
              <View style={[styles.cover, { backgroundColor: colors.luxDark }]} />
            )}
            <View style={styles.body}>
              <Text style={[styles.name, { color: colors.text }]} numberOfLines={2}>
                {product.name}
              </Text>
              <Text style={[styles.price, { color: colors.text }]}>
                {language === 'vi'
                  ? (serverVndInteger(listedVndQuote(product)) == null
                    ? t('price.vndUnavailable')
                    : formatMoney(serverVndInteger(listedVndQuote(product)) as number, 'VND'))
                  : formatMoney(Number(product.pricing?.price) || 0, product.pricing?.currency || 'USD')}
              </Text>
              {sale.onSale ? (
                <Text style={{ color: colors.textSecondary, fontSize: 11, textDecorationLine: 'line-through' }}>{sale.was}</Text>
              ) : null}
            </View>
          </Pressable>
        );
      })}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  rail: { gap: 10, paddingRight: 8 },
  card: { width: 148, borderRadius: 12, borderWidth: 1, overflow: 'hidden' },
  cover: { width: '100%', height: 110 },
  body: { paddingHorizontal: 10, paddingVertical: 10, gap: 4 },
  name: { fontSize: 13, fontWeight: '700', minHeight: 34 },
  price: { fontSize: 13, fontWeight: '700' },
});
