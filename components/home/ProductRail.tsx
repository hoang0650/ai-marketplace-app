import React from 'react';
import { View, Text, ScrollView, Pressable, StyleSheet } from 'react-native';
import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import { href } from '@/lib/href';
import type { Product } from '@/api/types';
import { useTheme } from '@/hooks/useT';
import { productPrice, productSale } from '@/utils/format';
import { AnalyticsService } from '@/lib/analytics';

export function ProductRail({ items }: { items: Product[] }) {
  const router = useRouter();
  const { colors } = useTheme();

  if (!items.length) return null;

  return (
    <ScrollView
      horizontal
      nestedScrollEnabled
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.rail}
    >
      {items.map((product) => {
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
              <Text style={[styles.price, { color: colors.text }]}>{productPrice(product)}</Text>
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
