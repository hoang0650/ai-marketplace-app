import React from 'react';
import { Redirect, useLocalSearchParams } from 'expo-router';
import { ProductHub } from '@/components/catalog/ProductHub';
import { useT } from '@/hooks/useT';
import { categoryLabel, isHiddenCategory } from '@/constants/categories';

export default function CategoryHubScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { t } = useT();
  const category = String(id || '');
  if (isHiddenCategory(category)) return <Redirect href="/(tabs)/explore" />;
  const title = categoryLabel(category, t, category, 'label');
  const descKey = `cat.${category}.desc`;
  const subtitle = t(descKey) === descKey ? t('hub.subtitle', { title }) : t(descKey);
  return <ProductHub title={title} subtitle={subtitle} categories={category ? [category] : []} />;
}
