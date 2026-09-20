import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { ProductHub } from '@/components/catalog/ProductHub';
import { Button } from '@/components/ui/Button';
import { useOpenClawLaunch } from '@/hooks/useOpenClawLaunch';
import { useHermesLaunch } from '@/hooks/useHermesLaunch';
import { useTheme } from '@/hooks/useT';
import { useT } from '@/hooks/useT';

export default function AgentsScreen() {
  const { t } = useT();
  const { colors } = useTheme();
  const openclaw = useOpenClawLaunch();
  const hermes = useHermesLaunch();

  return (
    <ProductHub
      title={t('cat.hire-agent.label')}
      subtitle={t('cat.hire-agent.desc')}
      categories={['hire-agent']}
      headerExtra={
        <View style={{ gap: 12, marginTop: 16 }}>
          <View style={[styles.panel, { borderColor: colors.border, backgroundColor: colors.cardBackground }]}>
            <Text style={[styles.panelTitle, { color: colors.text }]}>{t('openclaw.title')}</Text>
            <Text style={{ color: colors.textSecondary, fontSize: 13, lineHeight: 19 }}>{t('openclaw.desc')}</Text>
            <Button
              title={openclaw.opening ? t('openclaw.openingShort') : t('openclaw.open')}
              loading={openclaw.opening}
              onPress={() => void openclaw.launch()}
            />
            <Button
              title={openclaw.approving ? t('openclaw.approving') : t('openclaw.retryApprove')}
              variant="outline"
              loading={openclaw.approving}
              onPress={openclaw.retryApprove}
            />
          </View>

          <View style={[styles.panel, { borderColor: colors.border, backgroundColor: colors.cardBackground }]}>
            <Text style={[styles.panelTitle, { color: colors.text }]}>{t('hermes.title')}</Text>
            <Text style={{ color: colors.textSecondary, fontSize: 13, lineHeight: 19 }}>{t('hermes.desc')}</Text>
            <Button
              title={hermes.opening ? t('hermes.openingShort') : t('hermes.open')}
              loading={hermes.opening}
              onPress={() => void hermes.launch()}
            />
            <Button
              title={hermes.approving ? t('hermes.approving') : t('hermes.retryApprove')}
              variant="outline"
              loading={hermes.approving}
              onPress={hermes.retryApprove}
            />
          </View>
        </View>
      }
    />
  );
}

const styles = StyleSheet.create({
  panel: {
    padding: 14,
    borderWidth: 1,
    borderRadius: 14,
    gap: 10,
  },
  panelTitle: { fontSize: 16, fontWeight: '800' },
});
