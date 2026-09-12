import React from 'react';
import { FlatList, RefreshControl, Text } from 'react-native';
import { useAuth } from '@/hooks/useAuth';
import { useWishlist } from '@/hooks/useWishlist';
import { useTheme } from '@/hooks/useT';
import { useT } from '@/hooks/useT';
import { Screen } from '@/components/ui/Screen';
import { LoginPrompt } from '@/components/ui/LoginPrompt';
import { ProductCard } from '@/components/ProductCard';
import { EmptyState } from '@/components/ui/EmptyState';

export default function FavoritesScreen() {
  const { isAuthenticated } = useAuth();
  const { colors } = useTheme();
  const { t } = useT();
  const q = useWishlist();
  if (!isAuthenticated) return <LoginPrompt />;
  return (
    <Screen>
      <Text style={{ color: colors.text, fontSize: 24, fontWeight: '700', marginBottom: 12 }}>{t('favorites.title')}</Text>
      <FlatList
        data={q.items}
        numColumns={2}
        keyExtractor={(item) => item.id}
        columnWrapperStyle={{ gap: 10, marginBottom: 10 }}
        renderItem={({ item }) => <ProductCard product={item} />}
        refreshControl={
          <RefreshControl refreshing={q.isFetching && !q.isLoading} onRefresh={() => void q.refetch()} tintColor={colors.tint} />
        }
        ListEmptyComponent={q.isLoading ? null : <EmptyState title={t('favorites.empty')} />}
      />
    </Screen>
  );
}
