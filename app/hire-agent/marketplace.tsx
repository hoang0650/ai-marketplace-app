import React, { useMemo, useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';import { Stack, useRouter } from 'expo-router';
import type { MarketplaceAgent } from '@/api/types';
import { href } from '@/lib/href';
import {
  agentHostTemplate,
  agentUiName,
  isLaunchableAgent,
  listMarketplaceAgents,
} from '@/constants/agents';
import { useAgentLaunch } from '@/hooks/useAgentGateway';
import { useTheme, useT } from '@/hooks/useT';
import { Screen } from '@/components/ui/Screen';
import { Button } from '@/components/ui/Button';
import { Chip } from '@/components/ui/Chip';
import { AgentLogo } from '@/components/agents/AgentLogo';
import { HubBackButton } from '@/components/catalog/HubBackButton';

function AgentCard({ agent }: { agent: MarketplaceAgent }) {
  const router = useRouter();
  const { colors } = useTheme();
  const { t } = useT();
  const launch = useAgentLaunch(agent);
  const launchable = isLaunchableAgent(agent);

  return (
    <View style={[styles.card, { borderColor: colors.border, backgroundColor: colors.cardBackground }]}>
      <View style={styles.cardHead}>
        <AgentLogo agent={agent} size={40} />
        <Text style={[styles.name, { color: colors.text }]} numberOfLines={1}>
          {agent.name}
        </Text>
      </View>
      <Text style={{ color: colors.textSecondary, fontSize: 13, lineHeight: 19 }}>{agent.description}</Text>

      <View style={styles.actions}>
        <Button
          title={launchable ? (launch.opening ? t('agents.opening') : t('agents.launch')) : t('agents.soon')}
          disabled={!launchable}
          loading={launch.opening}
          onPress={() => void launch.launch()}
        />
        <Button
          title={t('agents.details')}
          variant="outline"
          onPress={() => router.push(href(`/hire-agent/${agent.id}`))}
        />
      </View>

      <Text style={{ color: colors.textSecondary, fontSize: 11 }}>
        {launchable ? `${agentUiName(agent)} · ${agentHostTemplate(agent)}` : t('agents.soonHint')}
      </Text>
    </View>
  );
}

export default function AgentMarketplaceScreen() {
  const { colors } = useTheme();
  const { t } = useT();
  const [tab, setTab] = useState<'public' | 'internal'>('public');
  const publicCount = useMemo(() => listMarketplaceAgents('public').length, []);
  const internalCount = useMemo(() => listMarketplaceAgents('internal').length, []);
  const agents = useMemo(() => listMarketplaceAgents(tab), [tab]);

  return (
    <Screen>
      <Stack.Screen options={{ title: t('agents.marketplace'), headerLeft: () => <HubBackButton />, headerBackVisible: false }} />
      <ScrollView contentContainerStyle={styles.scroll}>
        <Text style={[styles.title, { color: colors.text }]}>{t('agents.marketplace')}</Text>

        <View style={styles.tabs}>
          <Chip
            label={`${t('agents.tabPublic')} (${publicCount})`}
            active={tab === 'public'}
            onPress={() => setTab('public')}
          />
          <Chip
            label={`${t('agents.tabInternal')} (${internalCount})`}
            active={tab === 'internal'}
            onPress={() => setTab('internal')}
          />
        </View>

        {agents.length === 0 ? (
          <Text style={{ color: colors.textSecondary, marginTop: 12 }}>{t('agents.emptyTab')}</Text>
        ) : (
          <View style={{ gap: 12 }}>
            {agents.map((agent) => (
              <AgentCard key={agent.id} agent={agent} />
            ))}
          </View>
        )}
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  scroll: { paddingBottom: 40, gap: 12 },
  title: { fontSize: 24, fontWeight: '700', marginTop: 4 },
  tabs: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  card: { borderWidth: 1, borderRadius: 16, padding: 14, gap: 10 },
  cardHead: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  name: { fontSize: 16, fontWeight: '800', flex: 1 },
  actions: { gap: 8, marginTop: 2 },
});
