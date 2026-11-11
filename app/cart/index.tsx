import React from 'react';
import { FlatList, Pressable, RefreshControl, Text, View } from 'react-native';
import { Image } from 'expo-image';
import { Stack, useRouter } from 'expo-router';
import { href } from '@/lib/href';
import { useCart } from '@/hooks/useCart';
import { useTheme } from '@/hooks/useT';
import { useT } from '@/hooks/useT';
import { Screen } from '@/components/ui/Screen';
import { Button } from '@/components/ui/Button';
import { EmptyState } from '@/components/ui/EmptyState';
import { LoginPrompt } from '@/components/ui/LoginPrompt';
import { formatMoney } from '@/utils/format';
import { serverVndInteger, listedVndQuote } from '@/lib/vndDisplay';
import { usageUnitLabelText } from '@/lib/usageUnits';
import { isComputeStreamCategory } from '@/constants/categories';

export default function CartScreen() {
  const router = useRouter();
  const { colors } = useTheme();
  const { t, language } = useT();
  const { lines, setQty, remove, isAuthenticated, isLoading, isFetching, refetch } = useCart();

  if (!isAuthenticated) {
    return (
      <>
        <Stack.Screen options={{ title: t('cart.title') }} />
        <LoginPrompt />
      </>
    );
  }

  return (
    <Screen>
      <Stack.Screen options={{ title: t('cart.title') }} />
      <FlatList
        data={lines}
        keyExtractor={(item) => item.product.id}
        contentContainerStyle={{ paddingBottom: 24 }}
        refreshControl={
          <RefreshControl refreshing={isFetching && !isLoading} onRefresh={() => void refetch()} tintColor={colors.tint} />
        }
        ListEmptyComponent={
          isLoading ? undefined : (
            <EmptyState
              title={t('cart.empty')}
              cta={t('cart.explore')}
              onPress={() => router.push('/(tabs)/explore')}
            />
          )
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
              <Text style={{ color: colors.text, fontWeight: '800', marginTop: 6 }}>
                {(() => {
                  const dong = serverVndInteger(listedVndQuote(item.product));
                  const amount = language === 'vi'
                    ? (dong == null ? t('price.vndUnavailable') : formatMoney(dong, 'VND'))
                    : formatMoney(
                        item.product.pricing?.model === 'usage' ? Number(item.product.pricing?.usageRate) || 0 : Number(item.product.pricing?.price) || 0,
                        item.product.pricing?.currency || 'USD',
                      );
                  const unit = language === 'vi' && dong == null ? null : usageUnitLabelText(item.product.pricing?.usageUnitLabel, language);
                  return unit ? `${amount} / ${unit}` : amount;
                })()}
              </Text>
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
                  <Pressable onPress={() => setQty(item.product.id, item.qty + 1)} hitSlop={8} disabled={item.qty >= 99}>
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
                        : `/checkout/${item.product.id}?qty=${item.qty}`,
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
