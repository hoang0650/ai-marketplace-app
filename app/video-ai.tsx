import React from 'react';
import { ProductHub } from '@/components/catalog/ProductHub';
import { useT } from '@/hooks/useT';

export default function VideoAiScreen() {
  const { t } = useT();
  return (
    <ProductHub
      title={t('cat.ai-film-series.label')}
      subtitle={t('cat.ai-film-series.desc')}
      categories={['ai-film-series']}
    />
  );
}
