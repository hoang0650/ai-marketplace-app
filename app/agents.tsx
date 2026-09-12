import React from 'react';
import { ProductHub } from '@/components/catalog/ProductHub';
import { useT } from '@/hooks/useT';

export default function AgentsScreen() {
  const { t } = useT();
  return (
    <ProductHub
      title={t('cat.hire-agent.label')}
      subtitle={t('cat.hire-agent.desc')}
      categories={['hire-agent']}
    />
  );
}
