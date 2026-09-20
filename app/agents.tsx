import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { ProductHub } from '@/components/catalog/ProductHub';
import { Button } from '@/components/ui/Button';
import { useOpenClawLaunch } from '@/hooks/useOpenClawLaunch';
import { useTheme } from '@/hooks/useT';
import { useT } from '@/hooks/useT';

export default function AgentsScreen() {
  const { t } = useT();
  const { colors } = useTheme();
  const { opening, approving, launch, retryApprove } = useOpenClawLaunch();

  return (
    <ProductHub
      title={t('cat.hire-agent.label')}
      subtitle={t('cat.hire-agent.desc')}
      categories={['hire-agent']}
      headerExtra={
        <View style={[styles.panel, { borderColor: colors.border, backgroundColor: colors.cardBackground }]}>
          <Text style={[styles.panelTitle, { color: colors.text }]}>{t('openclaw.title')}</Text>
          <Text style={{ color: colors.textSecondary, fontSize: 13, lineHeight: 19 }}>{t('openclaw.desc')}</Text>
          <Button
            title={opening ? t('openclaw.openingShort') : t('openclaw.open')}
            loading={opening}
            onPress={() => void launch()}
          />
          <Button
            title={approving ? t('openclaw.approving') : t('openclaw.retryApprove')}
            variant="outline"
            loading={approving}
            onPress={retryApprove}
          />
        </View>
      }
    />
  );
}

const styles = StyleSheet.create({
  panel: {
    marginTop: 16,
    padding: 14,
    borderWidth: 1,
    borderRadius: 14,
    gap: 10,
  },
  panelTitle: { fontSize: 16, fontWeight: '800' },
});
