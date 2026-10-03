import React from 'react';
import { Redirect } from 'expo-router';
import { ProductHub } from '@/components/catalog/ProductHub';
import { useT } from '@/hooks/useT';
import { isHiddenCategory } from '@/constants/categories';

export default function VideoAiScreen() {
  const { t } = useT();
  if (isHiddenCategory('ai-film-series')) return <Redirect href="/(tabs)/explore" />;
  return (
    <ProductHub
      title={t('cat.ai-film-series.label')}
      subtitle={t('cat.ai-film-series.desc')}
      categories={['ai-film-series']}
    />
  );
}
