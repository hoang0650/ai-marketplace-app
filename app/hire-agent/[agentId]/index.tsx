import React, { useMemo, useState } from 'react';
import { Linking, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { href } from '@/lib/href';
import {
  agentBrand,
  agentBrandSummary,
  agentHostTemplate,
  agentNeedsPairing,
  agentSubdomain,
  agentSurfaceName,
  agentUiName,
  getAgent,
  isLaunchableAgent,
} from '@/constants/agents';
import { useAgentLaunch, useAgentSsh } from '@/hooks/useAgentGateway';
import { useTheme, useT } from '@/hooks/useT';
import { Screen } from '@/components/ui/Screen';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { AgentLogo } from '@/components/agents/AgentLogo';
import { AgentSshCard } from '@/components/agents/AgentSshCard';
import { HubBackButton } from '@/components/catalog/HubBackButton';

export default function AgentDetailScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ agentId?: string }>();
  const { colors } = useTheme();
  const { t } = useT();

  const agent = useMemo(() => getAgent(params.agentId) || null, [params.agentId]);
  const launch = useAgentLaunch(agent);
  const ssh = useAgentSsh(agent);
  const [wsUrl, setWsUrl] = useState('');
  const [token, setToken] = useState('');
  const [password, setPassword] = useState('');
  const launchable = isLaunchableAgent(agent);

  if (!agent) {
    return (
      <Screen>
        <Stack.Screen options={{ title: t('agents.detail'), headerLeft: () => <HubBackButton />, headerBackVisible: false }} />
        <Text style={{ color: colors.text }}>{t('agents.notFound')}</Text>
        <Pressable onPress={() => router.push(href('/hire-agent/marketplace'))} style={{ marginTop: 12, minHeight: 44 }}>
          <Text style={{ color: colors.tint, fontWeight: '700' }}>{t('agents.backToMarketplace')} →</Text>
        </Pressable>
      </Screen>
    );
  }

  const host = agentHostTemplate(agent);
  const manualUrl = buildManualConnectUrl(wsUrl, token, password, agentSubdomain(agent));

  return (
    <Screen padded={false}>
      <Stack.Screen
        options={{ title: agent.name, headerLeft: () => <HubBackButton />, headerBackVisible: false }}
      />
      <ScrollView contentContainerStyle={styles.scroll}>
        <View style={styles.head}>
          <AgentLogo agent={agent} size={48} />
          <View style={{ flex: 1 }}>
            <Text style={[styles.title, { color: colors.text }]}>{agent.name}</Text>
            <Text style={{ color: colors.textSecondary, fontSize: 12 }}>{[agent.version, agent.model].join(' · ')}</Text>
          </View>
        </View>

        <View style={styles.badges}>
          <Badge label={t('agents.status.running')} tone="success" />
          <Badge label={agent.version} tone="muted" />
          <Badge label={agent.model} tone="muted" />
        </View>

        <Text style={{ color: colors.textSecondary, lineHeight: 20 }}>{agent.description}</Text>

        <View style={styles.btnRow}>
          <Button
            title={t('agents.viewDocs')}
            variant="outline"
            onPress={() => void Linking.openURL(agent.docsUrl)}
          />
          {agent.hireProductSlug ? (
            <Button
              title={t('agents.hireSeat')}
              variant="outline"
              onPress={() => router.push(href(`/product/${agent.hireProductSlug}`))}
            />
          ) : null}
        </View>

        {/* Web endpoints */}
        <View style={[styles.panel, { borderColor: colors.border, backgroundColor: colors.cardBackground }]}>
          <Text style={[styles.heading, { color: colors.text }]}>{t('agents.endpoints')}</Text>
          <Text style={{ color: colors.textSecondary, fontSize: 13, lineHeight: 19 }}>{t('agents.endpointsLede')}</Text>
          {launchable ? (
            <View style={styles.btnRow}>
              <Button
                title={launch.opening ? t('agents.opening') : `${agentUiName(agent)} →`}
                loading={launch.opening}
                onPress={() => void launch.launch()}
              />
              <Button
                title={t('agents.setupWizard')}
                variant="outline"
                onPress={() => router.push(href(`/hire-agent/${agent.id}/setup`))}
              />
            </View>
          ) : (
            <Text style={{ color: colors.textSecondary, fontSize: 13 }}>{t('agents.soonHint')}</Text>
          )}

          {launch.creds ? (
            <View style={[styles.creds, { borderColor: colors.border, backgroundColor: colors.mist }]}>
              <Text style={{ color: colors.textSecondary, fontSize: 12 }}>{t('agents.credsHint')}</Text>
              <Text selectable style={[styles.code, { color: colors.text }]}>{`username: ${launch.creds.username}`}</Text>
              <Text selectable style={[styles.code, { color: colors.text }]}>{`password: ${launch.creds.password}`}</Text>
            </View>
          ) : null}

          {launch.approving ? (
            <Button title={t('agents.approving')} variant="outline" onPress={launch.retryApprove} />
          ) : agentNeedsPairing(agent) && !ssh.ssh ? (
            <Button title={t('agents.retryApprove')} variant="outline" onPress={launch.retryApprove} />
          ) : null}
        </View>

        {launchable ? (
          <>
            <AgentSshCard
              ssh={ssh.ssh}
              busy={ssh.busy}
              hostPlaceholder={host}
              onGenerate={(h) => void ssh.generate(h)}
              onRevoke={() => void ssh.revoke()}
            />
            {ssh.status ? (
              <Text style={{ color: colors.textSecondary, fontSize: 12 }}>{ssh.status}</Text>
            ) : null}

            <View style={[styles.panel, { borderColor: colors.border, backgroundColor: colors.cardBackground }]}>
              <Text style={[styles.heading, { color: colors.text }]}>{t('agents.gatewayConnect')}</Text>
              <Text style={{ color: colors.textSecondary, fontSize: 13, lineHeight: 19 }}>
                {t('agents.gatewayLede')}
              </Text>

              <Text style={[styles.label, { color: colors.textSecondary }]}>{t('agents.wsUrl')}</Text>
              <TextInput
                value={wsUrl}
                onChangeText={setWsUrl}
                autoCapitalize="none"
                autoCorrect={false}
                placeholder={`wss://${host}`}
                placeholderTextColor={colors.textSecondary}
                style={[styles.input, { color: colors.text, borderColor: colors.border, backgroundColor: colors.inputBackground }]}
              />
              <Text style={[styles.label, { color: colors.textSecondary }]}>{t('agents.gatewayToken')}</Text>
              <TextInput
                value={token}
                onChangeText={setToken}
                autoCapitalize="none"
                autoCorrect={false}
                secureTextEntry
                style={[styles.input, { color: colors.text, borderColor: colors.border, backgroundColor: colors.inputBackground }]}
              />
              <Text style={[styles.label, { color: colors.textSecondary }]}>{t('agents.passwordOptional')}</Text>
              <TextInput
                value={password}
                onChangeText={setPassword}
                secureTextEntry
                style={[styles.input, { color: colors.text, borderColor: colors.border, backgroundColor: colors.inputBackground }]}
              />
              <Button
                title={t('agents.connect')}
                disabled={!manualUrl}
                onPress={() => manualUrl && void Linking.openURL(manualUrl)}
              />
            </View>
          </>
        ) : null}

        <View style={[styles.panel, { borderColor: colors.border, backgroundColor: colors.cardBackground }]}>
          <Text style={[styles.heading, { color: colors.text }]}>{t('agents.guide')}</Text>
          <Text style={{ color: colors.textSecondary, fontSize: 13, lineHeight: 19 }}>
            {t('agents.viewingMarketplaceItem')}
          </Text>
          <Text style={[styles.guideTitle, { color: colors.text }]}>
            {t('agents.whatIs', { brand: agentBrand(agent) })}
          </Text>
          <Text style={{ color: colors.textSecondary, fontSize: 13, lineHeight: 19 }}>
            {agentBrandSummary(agent)}
          </Text>
          <Text style={[styles.guideTitle, { color: colors.text }]}>{t('agents.host')}</Text>
          <Text style={{ color: colors.textSecondary, fontSize: 13, lineHeight: 19 }}>
            {agentSurfaceName(agent)}: {host} (session market-{'{userId}'})
          </Text>
          <Text style={[styles.guideTitle, { color: colors.text }]}>{t('agents.pricing')}</Text>
          <Text style={{ color: colors.textSecondary, fontSize: 13, lineHeight: 19 }}>{t('agents.pricingBody')}</Text>
        </View>
      </ScrollView>
    </Screen>
  );
}

/** Hash URL mirroring the web `buildManualConnectUrl` (auto-connect + auto-approve). */
function buildManualConnectUrl(gatewayUrl: string, token: string, password: string, subdomain: string): string {
  if (!gatewayUrl.trim() || !token.trim()) return '';
  const base = gatewayUrl.replace(/^wss:/i, 'https:').replace(/^ws:/i, 'http:').replace(/\/$/, '');
  const hash = new URLSearchParams({
    gatewayUrl,
    token,
    gatewayToken: token,
    password: password || '',
    autoConnect: 'true',
    autoApprove: 'true',
    audience: 'aimarkets',
  });
  void subdomain;
  return `${base}/#${hash.toString()}`;
}

const styles = StyleSheet.create({
  scroll: { paddingHorizontal: 16, paddingBottom: 40, gap: 12 },
  head: { flexDirection: 'row', alignItems: 'center', gap: 12, marginTop: 8 },
  title: { fontSize: 22, fontWeight: '700' },
  badges: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  btnRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  panel: { borderWidth: 1, borderRadius: 16, padding: 14, gap: 10 },
  heading: { fontSize: 16, fontWeight: '800' },
  label: { fontSize: 11, fontWeight: '700', letterSpacing: 0.4, textTransform: 'uppercase' },
  input: { borderWidth: 1, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10, minHeight: 44 },
  code: { fontSize: 13 },
  creds: { borderWidth: 1, borderRadius: 10, padding: 10, gap: 6 },
  guideTitle: { fontWeight: '800', fontSize: 13, marginTop: 6 },
});
