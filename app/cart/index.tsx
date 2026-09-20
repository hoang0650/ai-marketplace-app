import React from 'react';
import { FlatList, Pressable, Text, View } from 'react-native';
import { Image } from 'expo-image';
import { Stack, useRouter } from 'expo-router';
import { href } from '@/lib/href';
import { useCartStore } from '@/stores/cartStore';
import { useTheme } from '@/hooks/useT';
import { useT } from '@/hooks/useT';
import { Screen } from '@/components/ui/Screen';
import { Button } from '@/components/ui/Button';
import { EmptyState } from '@/components/ui/EmptyState';
import { productPrice } from '@/utils/format';
import { isComputeStreamCategory } from '@/constants/categories';

export default function CartScreen() {
  const router = useRouter();
  const { colors } = useTheme();
  const { t } = useT();
  const lines = useCartStore((s) => s.lines);
  const setQty = useCartStore((s) => s.setQty);
  const remove = useCartStore((s) => s.remove);

  return (
    <Screen>
      <Stack.Screen options={{ title: t('cart.title') }} />
      <FlatList
        data={lines}
        keyExtractor={(item) => item.product.id}
        contentContainerStyle={{ paddingBottom: 24 }}
        ListEmptyComponent={
          <EmptyState
            title={t('cart.empty')}
            cta={t('cart.explore')}
            onPress={() => router.push('/(tabs)/explore')}
          />
        }
        renderItem={({ item }) => (
          <View
            style={{
              flexDirection: 'row',
              gap: 12,
              paddingVertical: 14,
              borderBottomWidth: 1,
              borderColor: colors.border,
            }}
          >
            {item.product.coverUrl ? (
              <Image source={{ uri: item.product.coverUrl }} style={{ width: 64, height: 64, borderRadius: 10 }} contentFit="cover" />
            ) : (
              <View style={{ width: 64, height: 64, borderRadius: 10, backgroundColor: colors.luxDark }} />
            )}
            <View style={{ flex: 1, minWidth: 0 }}>
              <Pressable onPress={() => router.push(href(`/product/${item.product.slug}`))}>
                <Text style={{ color: colors.text, fontWeight: '700' }} numberOfLines={2}>
                  {item.product.name}
                </Text>
              </Pressable>
              <Text style={{ color: colors.text, fontWeight: '800', marginTop: 6 }}>{productPrice(item.product)}</Text>
              {isComputeStreamCategory(item.product.category) ? (
                <Pressable onPress={() => remove(item.product.id)} hitSlop={8} style={{ marginTop: 10 }}>
                  <Text style={{ color: colors.danger, fontWeight: '700' }}>{t('cart.remove')}</Text>
                </Pressable>
              ) : (
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, marginTop: 10 }}>
                  <Pressable onPress={() => setQty(item.product.id, item.qty - 1)} hitSlop={8}>
                    <Text style={{ color: colors.text, fontSize: 18, fontWeight: '700' }}>−</Text>
                  </Pressable>
                  <Text style={{ color: colors.text, fontWeight: '700' }}>{item.qty}</Text>
                  <Pressable onPress={() => setQty(item.product.id, item.qty + 1)} hitSlop={8}>
                    <Text style={{ color: colors.text, fontSize: 18, fontWeight: '700' }}>+</Text>
                  </Pressable>
                  <Pressable onPress={() => remove(item.product.id)} hitSlop={8}>
                    <Text style={{ color: colors.danger, fontWeight: '700' }}>{t('cart.remove')}</Text>
                  </Pressable>
                </View>
              )}
              <Button
                title={isComputeStreamCategory(item.product.category) ? t('compute.cta.play') : t('cart.checkout')}
                onPress={() =>
                  router.push(
                    href(
                      isComputeStreamCategory(item.product.category)
                        ? `/play/${item.product.slug}`
                        : `/checkout/${item.product.id}`,
                    ),
                  )
                }
                style={{ marginTop: 12 }}
              />
            </View>
          </View>
        )}
      />
    </Screen>
  );
}
