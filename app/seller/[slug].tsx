import React from 'react';
import { ActivityIndicator, FlatList, Image, Text, View } from 'react-native';
import { Stack, useLocalSearchParams } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { creatorsApi, productsApi } from '@/api';
import { useTheme } from '@/hooks/useT';
import { useT } from '@/hooks/useT';
import { Screen } from '@/components/ui/Screen';
import { Badge } from '@/components/ui/Badge';
import { ProductCard } from '@/components/ProductCard';
import { ErrorState } from '@/components/ui/ErrorState';
import { getErrorMessage } from '@/lib/errors';

export default function SellerScreen() {
  const { slug } = useLocalSearchParams<{ slug: string }>();
  const { colors } = useTheme();
  const { t, language } = useT();
  const seller = useQuery({ queryKey: ['creator', slug], queryFn: () => creatorsApi.one(String(slug)), enabled: !!slug });
  const products = useQuery({
    queryKey: ['products', 'seller', slug],
    queryFn: () => productsApi.list({ limit: 40 }),
    enabled: !!seller.data,
  });
  const mine = (products.data || []).filter((p) => p.creatorSlug === slug || p.sellerSlug === slug);

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

  return (
    <Screen padded={false}>
      <Stack.Screen options={{ title: s.name }} />
      <FlatList
        data={mine}
        numColumns={2}
        keyExtractor={(item) => item.id}
        columnWrapperStyle={{ gap: 10, paddingHorizontal: 16, marginBottom: 10 }}
        ListHeaderComponent={
          <View style={{ padding: 16 }}>
            {s.avatarUrl ? <Image source={{ uri: s.avatarUrl }} style={{ width: 64, height: 64, borderRadius: 32, marginBottom: 12 }} /> : null}
            <Text style={{ color: colors.text, fontSize: 22, fontWeight: '800' }}>{s.name}</Text>
            {s.verified ? <Badge label={t('common.verified')} /> : null}
            <Text style={{ color: colors.textSecondary, marginTop: 8 }}>{s.bio}</Text>
            <Text style={{ color: colors.textSecondary, marginTop: 8 }}>
              ★ {s.rating} · {s.productCount} · {s.totalSales}
            </Text>
          </View>
        }
        renderItem={({ item }) => <ProductCard product={item} />}
      />
    </Screen>
  );
}
