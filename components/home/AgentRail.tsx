import React from 'react';
import { Pressable, ScrollView, StyleSheet, Text } from 'react-native';
import { useRouter } from 'expo-router';
import type { MarketplaceAgent } from '@/api/types';
import { href } from '@/lib/href';
import { useTheme } from '@/hooks/useT';
import { useT } from '@/hooks/useT';
import { agentBrand, isLaunchableAgent, listMarketplaceAgents } from '@/constants/agents';
import { AgentLogo } from '@/components/agents/AgentLogo';

/**
 * Agents are not shop categories — they get their own rail on the home screen,
 * below "Suggested for you" (matches the web landing, where /hire-agent is separate).
 */
export function AgentRail({ items }: { items?: MarketplaceAgent[] }) {
  const router = useRouter();
  const { colors } = useTheme();
  const { t } = useT();
  const agents = items ?? listMarketplaceAgents('public').filter((a) => isLaunchableAgent(a));

  if (!agents.length) return null;

  return (
    <ScrollView horizontal nestedScrollEnabled showsHorizontalScrollIndicator={false} contentContainerStyle={styles.rail}>
      {agents.map((agent) => (
        <Pressable
          key={agent.id}
          accessibilityRole="button"
          accessibilityLabel={agent.name}
          onPress={() => router.push(href(`/hire-agent/${agent.id}`))}
          style={({ pressed }) => [
            styles.card,
            { backgroundColor: colors.cardBackground, borderColor: colors.border, opacity: pressed ? 0.9 : 1 },
          ]}
        >
          <AgentLogo agent={agent} size={44} />
          <Text style={[styles.name, { color: colors.text }]} numberOfLines={1}>
            {agent.name}
          </Text>
          <Text style={[styles.meta, { color: colors.textSecondary }]} numberOfLines={2}>
            {agentBrand(agent)} · {agent.version}
          </Text>
          <Text style={[styles.hint, { color: colors.tint }]} numberOfLines={1}>
            {t('home.agentsOpen')}
          </Text>
        </Pressable>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  rail: { gap: 10, paddingRight: 8 },
  card: {
    width: 148,
    borderWidth: 1,
    borderRadius: 14,
    padding: 12,
    gap: 6,
  },
  name: { fontSize: 14, fontWeight: '700', marginTop: 2 },
  meta: { fontSize: 12, minHeight: 32 },
  hint: { fontSize: 12, fontWeight: '700', marginTop: 2 },
});
