import React from 'react';
import { Redirect, useLocalSearchParams } from 'expo-router';
import { ProductHub } from '@/components/catalog/ProductHub';
import { useT } from '@/hooks/useT';
import { categoryLabel, isHiddenCategory, isSectorDraftCategory } from '@/constants/categories';

export default function CategoryHubScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { t } = useT();
  const category = String(id || '');
  if (isHiddenCategory(category)) return <Redirect href="/(tabs)/explore" />;
  const title = categoryLabel(category, t, category, 'label');
  const descKey = `cat.${category}.desc`;
  const base = t(descKey) === descKey ? t('hub.subtitle', { title }) : t(descKey);
  const subtitle = isSectorDraftCategory(category) ? `${base} ${t('cat.draft.sector')}` : base;
  return <ProductHub title={title} subtitle={subtitle} categories={category ? [category] : []} />;
}
