import React from 'react';
import { Redirect } from 'expo-router';
import { ProductHub } from '@/components/catalog/ProductHub';
import { useT } from '@/hooks/useT';
import { isHiddenCategory } from '@/constants/categories';

export default function StoriesScreen() {
  const { t } = useT();
  if (isHiddenCategory('story-book')) return <Redirect href="/(tabs)/explore" />;
  return (
    <ProductHub
      title={t('cat.story-book.label')}
      subtitle={t('cat.story-book.desc')}
      categories={['story-book']}
    />
  );
}
