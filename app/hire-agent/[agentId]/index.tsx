import React, { useMemo, useState } from 'react';
import { Linking, Pressable, ScrollView, StyleSheet, Switch, Text, TextInput, View } from 'react-native';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { href } from '@/lib/href';
import {
  agentBrand,
  agentBrandSummary,
  agentHostTemplate,
  agentNeedsPairing,
  agentSubdomain,
  agentSupportsSsh,
  agentSurfaceName,
  agentUiName,
  getAgent,
  isLaunchableAgent,
} from '@/constants/agents';
import { useAgentLaunch, useAgentPlan, useAgentSsh } from '@/hooks/useAgentGateway';
import { formatDate, formatMoney } from '@/utils/format';
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
  const { t, language } = useT();

  const agent = useMemo(() => getAgent(params.agentId) || null, [params.agentId]);
  const launch = useAgentLaunch(agent);
  const ssh = useAgentSsh(agent);
  const plan = useAgentPlan(agent);
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

        {launchable ? (
          <View style={[styles.panel, { borderColor: colors.border, backgroundColor: colors.cardBackground }]}>
            <Text style={[styles.heading, { color: colors.text }]}>{t('agents.plan.title')}</Text>
            {plan.pricing ? (
              <Text style={{ color: colors.text, fontSize: 13, lineHeight: 19 }}>
                {t('agents.plan.price', {
                  price: formatMoney(plan.pricing.fee.vnd, 'VND'),
                  days: plan.pricing.fee.periodDays,
                })}
              </Text>
            ) : null}
            <Text style={{ color: colors.textSecondary, fontSize: 13, lineHeight: 19 }}>
              {!plan.plan
                ? t('agents.plan.signIn')
                : plan.plan.exempt
                  ? t('agents.plan.exempt')
                  : plan.plan.active
                    ? t('agents.plan.activeUntil', {
                        date: formatDate(plan.plan.paidUntil, language),
                        days: plan.plan.daysLeft,
                      })
                    : plan.plan.purgedAt
                      ? t('agents.plan.purged', { date: formatDate(plan.plan.purgedAt, language) })
                      : plan.plan.paidUntil
                        ? [
                            t('agents.plan.expired', { date: formatDate(plan.plan.paidUntil, language) }),
                            plan.plan.purgeDueAt
                              ? t('agents.plan.retention', { date: formatDate(plan.plan.purgeDueAt, language) })
                              : '',
                          ]
                            .filter(Boolean)
                            .join(' ')
                        : t('agents.plan.none')}
            </Text>
            {plan.plan && !plan.plan.exempt ? (
              <View style={styles.btnRow}>
                <Button
                  title={
                    plan.subscribing
                      ? t('agents.plan.processing')
                      : plan.plan.active
                        ? t('agents.plan.renew')
                        : t('agents.plan.rent')
                  }
                  loading={plan.subscribing}
                  onPress={() => void plan.subscribe()}
                />
              </View>
            ) : null}
            {plan.plan && !plan.plan.exempt && plan.plan.paidUntil ? (
              <View style={styles.switchRow}>
                <Text style={{ color: colors.text, fontSize: 13, lineHeight: 19, flex: 1 }}>
                  {t('agents.plan.autoRenew')}
                </Text>
                <Switch
                  value={plan.plan.autoRenew}
                  disabled={plan.updatingAutoRenew}
                  onValueChange={(on) => plan.setAutoRenew(on)}
                  accessibilityLabel={t('agents.plan.autoRenew')}
                />
              </View>
            ) : null}
            <Text style={{ color: colors.textSecondary, fontSize: 12, lineHeight: 18 }}>
              {plan.pricing?.byokOnly
                ? t('agents.plan.byokOnly')
                : t('agents.plan.tokenNote', { pct: Math.round((plan.pricing?.tokenMarkup ?? 0.25) * 100) })}
            </Text>
          </View>
        ) : null}

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

        {agentSupportsSsh(agent) ? (
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
  switchRow: { flexDirection: 'row', alignItems: 'center', gap: 12, minHeight: 44 },
  panel: { borderWidth: 1, borderRadius: 16, padding: 14, gap: 10 },
  heading: { fontSize: 16, fontWeight: '800' },
  label: { fontSize: 11, fontWeight: '700', letterSpacing: 0.4, textTransform: 'uppercase' },
  input: { borderWidth: 1, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10, minHeight: 44 },
  code: { fontSize: 13 },
  creds: { borderWidth: 1, borderRadius: 10, padding: 10, gap: 6 },
  guideTitle: { fontWeight: '800', fontSize: 13, marginTop: 6 },
});
