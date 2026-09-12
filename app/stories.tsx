import React from 'react';
import { ProductHub } from '@/components/catalog/ProductHub';
import { useT } from '@/hooks/useT';

export default function StoriesScreen() {
  const { t } = useT();
  return (
    <ProductHub
      title={t('cat.story-book.label')}
      subtitle={t('cat.story-book.desc')}
      categories={['story-book']}
    />
  );
}
