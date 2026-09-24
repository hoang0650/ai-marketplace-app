import React, { useMemo } from 'react';
import { ActivityIndicator, Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Stack, useRouter } from 'expo-router';
import type { HiredAgent, MarketplaceAgent } from '@/api/types';
import { href } from '@/lib/href';
import { getAgent, isLaunchableAgent } from '@/constants/agents';
import { useArchiveHiredAgent, useAgentLaunch, useHiredAgents } from '@/hooks/useAgentGateway';
import { useAuth } from '@/hooks/useAuth';
import { useTheme, useT } from '@/hooks/useT';
import { Screen } from '@/components/ui/Screen';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { EmptyState } from '@/components/ui/EmptyState';
import { LoginPrompt } from '@/components/ui/LoginPrompt';
import { AgentLogo } from '@/components/agents/AgentLogo';
import { HubBackButton } from '@/components/catalog/HubBackButton';

/** A hired row may exist without a current catalog entry — keep it renderable. */
function resolveAgent(row: HiredAgent): MarketplaceAgent | undefined {
  return getAgent(row.agentId) || getAgent(row.slug);
}

function HiredRow({ row }: { row: HiredAgent }) {
  const router = useRouter();
  const { colors } = useTheme();
  const { t, language } = useT();
  const agent = resolveAgent(row);
  const launch = useAgentLaunch(agent);
  const { archive, archiving } = useArchiveHiredAgent();
  const launchable = isLaunchableAgent(agent);
  const statusLabel = t(`agents.status.${row.status}`);

  return (
    <View style={[styles.card, { borderColor: colors.border, backgroundColor: colors.cardBackground }]}>
      <View style={styles.cardHead}>
        {agent ? <AgentLogo agent={agent} size={40} /> : null}
        <View style={{ flex: 1 }}>
          <Text style={[styles.name, { color: colors.text }]} numberOfLines={1}>
            {row.name}
          </Text>
          <Text style={{ color: colors.textSecondary, fontSize: 12, marginTop: 2 }}>
            {[row.version, row.model].filter(Boolean).join(' · ')}
          </Text>
        </View>
        <Badge
          label={statusLabel === `agents.status.${row.status}` ? row.status : statusLabel}
          tone={row.status === 'running' ? 'success' : 'muted'}
        />
      </View>

      <Text style={{ color: colors.textSecondary, fontSize: 12 }}>
        {t('agents.launchedAt')} {new Date(row.launchedAt).toLocaleDateString(language === 'en' ? 'en-US' : 'vi-VN')}
      </Text>

      <View style={styles.actions}>
        {launchable ? (
          <>
            <Button
              title={launch.opening ? t('agents.opening') : t('agents.launch')}
              loading={launch.opening}
              onPress={() => void launch.launch()}
            />
            <Button
              title={t('agents.setup')}
              variant="outline"
              onPress={() => router.push(href(`/hire-agent/${row.agentId}/setup`))}
            />
          </>
        ) : null}
        <Button
          title={t('agents.manage')}
          variant="outline"
          onPress={() => router.push(href(`/hire-agent/${row.agentId}`))}
        />
        {row.status !== 'archived' ? (
          <Button
            title={t('agents.archive')}
            variant="outline"
            loading={archiving}
            onPress={() => void archive(row.agentId)}
          />
        ) : null}
      </View>
    </View>
  );
}

export default function MyAgentsScreen() {
  const router = useRouter();
  const { colors } = useTheme();
  const { t } = useT();
  const { isAuthenticated } = useAuth();
  const { hired, isLoading, refetch } = useHiredAgents();
  const launchable = useMemo(() => hired.filter((h) => isLaunchableAgent(resolveAgent(h))), [hired]);

  if (!isAuthenticated) {
    return (
      <Screen>
        <Stack.Screen options={{ title: t('agents.title'), headerLeft: () => <HubBackButton />, headerBackVisible: false }} />
        <LoginPrompt />
      </Screen>
    );
  }

  return (
    <Screen padded={false}>
      <Stack.Screen options={{ title: t('agents.title'), headerLeft: () => <HubBackButton />, headerBackVisible: false }} />
      <ScrollView
        contentContainerStyle={styles.scroll}
        refreshControl={<RefreshControl refreshing={false} onRefresh={() => void refetch()} tintColor={colors.tint} />}
      >
        <View style={styles.header}>
          <Text style={[styles.title, { color: colors.text }]}>{t('agents.title')}</Text>
          <Button title={t('agents.browse')} onPress={() => router.push(href('/hire-agent/marketplace'))} />
        </View>

        <View style={[styles.banner, { borderColor: colors.border, backgroundColor: colors.mist }]}>
          <Text style={{ color: colors.text, fontWeight: '800' }}>{t('agents.betaTitle')}</Text>
          <Text style={{ color: colors.textSecondary, fontSize: 13, lineHeight: 19, marginTop: 4 }}>
            {t('agents.betaBody')}
          </Text>
        </View>

        {isLoading ? (
          <ActivityIndicator color={colors.tint} style={{ marginTop: 24 }} />
        ) : hired.length === 0 ? (
          <EmptyState
            title={t('agents.empty')}
            hint={t('agents.emptyHint')}
            cta={t('agents.browse')}
            onPress={() => router.push(href('/hire-agent/marketplace'))}
          />
        ) : (
          <View style={{ gap: 12 }}>
            {hired.map((row) => (
              <HiredRow key={row.id} row={row} />
            ))}
          </View>
        )}

        {launchable.length === 0 && hired.length > 0 ? (
          <Text style={{ color: colors.textSecondary, fontSize: 12, marginTop: 12 }}>{t('agents.noLaunchable')}</Text>
        ) : null}

        <Pressable onPress={() => router.push(href('/agents'))} style={{ marginTop: 16, minHeight: 44, justifyContent: 'center' }}>
          <Text style={{ color: colors.tint, fontWeight: '700' }}>{t('agents.catalogLink')} →</Text>
        </Pressable>
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  scroll: { paddingHorizontal: 16, paddingBottom: 40, gap: 12 },
  header: { gap: 10, marginTop: 8 },
  title: { fontSize: 26, fontWeight: '700' },
  banner: { borderWidth: 1, borderRadius: 14, padding: 12 },
  card: { borderWidth: 1, borderRadius: 16, padding: 14, gap: 10 },
  cardHead: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  name: { fontSize: 16, fontWeight: '700' },
  actions: { gap: 8, marginTop: 4 },
});
