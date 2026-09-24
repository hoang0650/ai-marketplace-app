import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { ProductHub } from '@/components/catalog/ProductHub';
import { Button } from '@/components/ui/Button';
import { href } from '@/lib/href';
import { agentGatewayKey, agentNeedsPairing, listMarketplaceAgents, isLaunchableAgent } from '@/constants/agents';
import type { MarketplaceAgent } from '@/api/types';
import { useAgentLaunch } from '@/hooks/useAgentGateway';
import { useTheme, useT } from '@/hooks/useT';

/** Compact launch panel for one catalog agent (OpenClaw / Hermes / NanoClaw / SpaceBot). */
function AgentPanel({ agent, onDetails }: { agent: MarketplaceAgent; onDetails: () => void }) {
  const { colors } = useTheme();
  const { t } = useT();
  const base = agentGatewayKey(agent);
  const needsPairing = agentNeedsPairing(agent);
  const launch = useAgentLaunch(agent);

  return (
    <View style={[styles.panel, { borderColor: colors.border, backgroundColor: colors.cardBackground }]}>
      <Text style={[styles.panelTitle, { color: colors.text }]}>{t(`${base}.title`)}</Text>
      <Text style={{ color: colors.textSecondary, fontSize: 13, lineHeight: 19 }}>{t(`${base}.desc`)}</Text>
      <Button
        title={launch.opening ? t(`${base}.openingShort`) : t(`${base}.open`)}
        loading={launch.opening}
        onPress={() => void launch.launch()}
      />
      {needsPairing ? (
        <Button
          title={launch.approving ? t(`${base}.approving`) : t(`${base}.retryApprove`)}
          variant="outline"
          loading={launch.approving}
          onPress={launch.retryApprove}
        />
      ) : null}
      <Pressable onPress={onDetails} style={{ minHeight: 32, justifyContent: 'center' }}>
        <Text style={{ color: colors.tint, fontWeight: '700', fontSize: 13 }}>{t('agents.details')} →</Text>
      </Pressable>
    </View>
  );
}

export default function AgentsScreen() {
  const { t } = useT();
  const router = useRouter();
  const launchable = listMarketplaceAgents('public').filter((a) => isLaunchableAgent(a));

  return (
    <ProductHub
      title={t('cat.hire-agent.label')}
      subtitle={t('cat.hire-agent.desc')}
      categories={['hire-agent']}
      headerExtra={
        <View style={{ gap: 12, marginTop: 16 }}>
          {launchable.map((agent) => (
            <AgentPanel
              key={agent.id}
              agent={agent}
              onDetails={() => router.push(href(`/hire-agent/${agent.id}`))}
            />
          ))}
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
            <Button title={t('agents.title')} variant="outline" onPress={() => router.push(href('/hire-agent'))} />
            <Button
              title={t('agents.marketplace')}
              variant="outline"
              onPress={() => router.push(href('/hire-agent/marketplace'))}
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
