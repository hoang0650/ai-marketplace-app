import React, { useCallback, useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import * as Clipboard from 'expo-clipboard';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { href } from '@/lib/href';
import {
  agentBrand,
  agentHostTemplate,
  agentUiName,
  getAgent,
  isLaunchableAgent,
} from '@/constants/agents';
import { AGENT_SETUP_PROFILES, OPENCLAW_CHANNELS, SPACEBOT_CHANNELS, type ChannelGuide } from '@/constants/agentSetup';
import { gatewayApiFor, useAgentLaunch, useAgentSsh } from '@/hooks/useAgentGateway';
import { useTheme, useT } from '@/hooks/useT';
import { Screen } from '@/components/ui/Screen';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { AgentLogo } from '@/components/agents/AgentLogo';
import { AgentSshCard } from '@/components/agents/AgentSshCard';
import { HubBackButton } from '@/components/catalog/HubBackButton';

export default function AgentSetupScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ agentId?: string }>();
  const { colors } = useTheme();
  const { t } = useT();

  const agent = useMemo(() => getAgent(params.agentId) || getAgent('openclaw') || null, [params.agentId]);
  const profile = agent ? AGENT_SETUP_PROFILES[agentGatewayProfileId(agent)] : AGENT_SETUP_PROFILES.openclaw;
  const launch = useAgentLaunch(agent);
  const ssh = useAgentSsh(agent);
  const launchable = isLaunchableAgent(agent);

  const [channel, setChannel] = useState<ChannelGuide | null>(null);
  const [pairingCode, setPairingCode] = useState('');
  const [pairingBusy, setPairingBusy] = useState(false);
  const [status, setStatus] = useState('');
  const [copied, setCopied] = useState('');

  const copy = useCallback(async (value: string | undefined, key: string) => {
    const text = String(value ?? '');
    if (!text) return;
    try {
      await Clipboard.setStringAsync(text);
    } catch {
      return;
    }
    setCopied(key);
    setTimeout(() => setCopied((c) => (c === key ? '' : c)), 2000);
  }, []);

  const approvePairing = useCallback(
    async (code?: string) => {
      if (!agent || pairingBusy) return;
      setPairingBusy(true);
      setStatus(t('agents.pairingApproving'));
      try {
        const res = await gatewayApiFor(agent).approvePairing(code?.trim() || null);
        setStatus(res?.success ? res.message || t('agents.pairingApproved') : res?.message || t('agents.pairingFailed'));
        if (res?.success) setPairingCode('');
      } catch {
        setStatus(t('agents.pairingFailed'));
      } finally {
        setPairingBusy(false);
      }
    },
    [agent, pairingBusy, t],
  );

  if (!agent) {
    return (
      <Screen>
        <Stack.Screen options={{ title: t('agents.setup'), headerLeft: () => <HubBackButton />, headerBackVisible: false }} />
        <Text style={{ color: colors.text }}>{t('agents.notFound')}</Text>
      </Screen>
    );
  }

  const host = agentHostTemplate(agent);
  const channelStep = profile.channels ? 2 : 1;
  const sshStep = profile.pairing ? 4 : profile.channels ? 3 : 2;
  const configStep = sshStep + 1;
  const channels = profile.channelSet === 'spacebot' ? SPACEBOT_CHANNELS : OPENCLAW_CHANNELS;

  return (
    <Screen padded={false}>
      <Stack.Screen
        options={{ title: `${profile.brand} ${t('agents.setup')}`, headerLeft: () => <HubBackButton />, headerBackVisible: false }}
      />
      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
        <View style={styles.head}>
          <AgentLogo agent={agent} size={40} />
          <View style={{ flex: 1 }}>
            <Text style={[styles.title, { color: colors.text }]}>
              {profile.brand} {t('agents.setup')}
            </Text>
            <Text style={{ color: colors.textSecondary, fontSize: 12 }}>{host}</Text>
          </View>
          <Badge label={launchable ? t('agents.ready') : t('agents.soon')} tone={launchable ? 'success' : 'muted'} />
        </View>

        {!launchable ? (
          <View style={[styles.panel, { borderColor: colors.border, backgroundColor: colors.cardBackground }]}>
            <Text style={{ color: colors.text }}>{t('agents.soonHint')}</Text>
            <Button title={`${t('agents.openSetup')} OpenClaw`} onPress={() => router.push(href('/hire-agent/openclaw/setup'))} />
            <Button
              title={`${t('agents.openSetup')} Hermes`}
              variant="outline"
              onPress={() => router.push(href('/hire-agent/hermes/setup'))}
            />
          </View>
        ) : (
          <>
            <Text style={{ color: colors.textSecondary, lineHeight: 20 }}>{t(`agents.setupLead.${profile.id}`)}</Text>

            {/* 1 — Launch */}
            <View style={[styles.panel, { borderColor: colors.border, backgroundColor: colors.cardBackground }]}>
              <Text style={[styles.stepTitle, { color: colors.text }]}>
                <Text style={{ color: colors.tint }}>1 </Text>
                {t('agents.stepLaunch', { brand: profile.brand })}
              </Text>
              <Text style={{ color: colors.textSecondary, fontSize: 13, lineHeight: 19 }}>
                {t(`agents.launchBlurb.${profile.id}`)}
              </Text>
              <Text style={{ color: colors.textSecondary, fontSize: 12 }}>
                {t('agents.hostLabel')} <Text style={{ color: colors.text }}>{host}</Text>
              </Text>
              <Button
                title={launch.opening ? t('agents.opening') : `${agentUiName(agent)} →`}
                loading={launch.opening}
                onPress={() => void launch.launch()}
              />
              {launch.creds ? (
                <View style={[styles.creds, { borderColor: colors.border, backgroundColor: colors.mist }]}>
                  <Text style={{ color: colors.textSecondary, fontSize: 12 }}>{t('agents.credsHint')}</Text>
                  <Text selectable style={[styles.code, { color: colors.text }]}>{`username: ${launch.creds.username}`}</Text>
                  <Text selectable style={[styles.code, { color: colors.text }]}>{`password: ${launch.creds.password}`}</Text>
                  <Pressable
                    onPress={() =>
                      void copy(
                        `username: ${launch.creds?.username}\npassword: ${launch.creds?.password}`,
                        'creds',
                      )
                    }
                    style={{ minHeight: 32, justifyContent: 'center' }}
                  >
                    <Text style={{ color: colors.tint, fontWeight: '700', fontSize: 12 }}>
                      {copied === 'creds' ? t('agents.copied') : t('agents.copyCreds')}
                    </Text>
                  </Pressable>
                </View>
              ) : null}
            </View>

            {/* 2 — Messaging channels (OpenClaw / SpaceBot) */}
            {profile.channels ? (
              channel ? (
                <View style={{ gap: 12 }}>
                  <Pressable onPress={() => setChannel(null)} style={{ minHeight: 32, justifyContent: 'center' }}>
                    <Text style={{ color: colors.tint, fontWeight: '700' }}>← {t('agents.allChannels')}</Text>
                  </Pressable>
                  <Text style={[styles.title, { color: colors.text }]}>
                    {channel.label} {t('agents.channel')}
                  </Text>

                  <View style={[styles.panel, { borderColor: colors.border, backgroundColor: colors.cardBackground }]}>
                    <Text style={[styles.stepTitle, { color: colors.text }]}>
                      <Text style={{ color: colors.tint }}>1 </Text>
                      {t('agents.steps')}
                    </Text>
                    {channel.steps.map((line, i) => (
                      <Text key={line} style={{ color: colors.textSecondary, fontSize: 13, lineHeight: 19 }}>
                        {i + 1}. {line}
                      </Text>
                    ))}
                  </View>

                  <View style={[styles.panel, { borderColor: colors.border, backgroundColor: colors.cardBackground }]}>
                    <Text style={[styles.stepTitle, { color: colors.text }]}>
                      <Text style={{ color: colors.tint }}>2 </Text>
                      {t('agents.command')}
                    </Text>
                    <Text style={{ color: colors.textSecondary, fontSize: 13 }}>
                      {profile.channelSet === 'spacebot' ? t('agents.openDashboard') : t('agents.runInside', { brand: profile.brand })}
                    </Text>
                    <Text selectable style={[styles.code, { color: colors.text }]}>
                      {channel.cli}
                    </Text>
                    <View style={styles.btnRow}>
                      <Button
                        title={copied === 'cli' ? t('agents.copied') : t('agents.copyCommand')}
                        variant="outline"
                        onPress={() => void copy(channel.cli, 'cli')}
                      />
                      <Button
                        title={profile.channelSet === 'spacebot' ? t('agents.openUiDashboard') : t('agents.openUi')}
                        loading={launch.opening}
                        onPress={() => void launch.launch()}
                      />                    </View>
                    {channel.envVars.length ? (
                      <>
                        <Text style={{ color: colors.textSecondary, fontSize: 12 }}>{t('agents.envVars')}</Text>
                        <Text selectable style={[styles.code, { color: colors.text }]}>
                          {channel.envVars.join('\n')}
                        </Text>
                      </>
                    ) : null}
                  </View>
                </View>
              ) : (
                <View style={[styles.panel, { borderColor: colors.border, backgroundColor: colors.cardBackground }]}>
                  <Text style={[styles.stepTitle, { color: colors.text }]}>
                    <Text style={{ color: colors.tint }}>{channelStep} </Text>
                    {t('agents.messagingChannels')}
                  </Text>
                  <Text style={{ color: colors.textSecondary, fontSize: 13, lineHeight: 19 }}>
                    {profile.channelSet === 'spacebot' ? t('agents.channelsLede.spacebot') : t('agents.channelsLede')}
                  </Text>
                  <View style={styles.grid}>
                    {channels.map((ch) => (
                      <Pressable
                        key={ch.id}
                        onPress={() => setChannel(ch)}
                        style={[styles.channel, { borderColor: colors.border, backgroundColor: colors.mist }]}
                      >
                        <Text style={{ color: colors.text, fontWeight: '700', fontSize: 13 }}>{ch.label}</Text>
                      </Pressable>
                    ))}
                  </View>
                </View>
              )
            ) : null}

            {/* Pairing (OpenClaw only) */}
            {profile.pairing ? (
              <View style={[styles.panel, { borderColor: colors.border, backgroundColor: colors.cardBackground }]}>
                <Text style={[styles.stepTitle, { color: colors.text }]}>
                  <Text style={{ color: colors.tint }}>3 </Text>
                  {t('agents.pairingTitle')}
                </Text>
                <Text style={{ color: colors.textSecondary, fontSize: 13, lineHeight: 19 }}>{t('agents.pairingLede')}</Text>
                <TextInput
                  value={pairingCode}
                  onChangeText={setPairingCode}
                  autoCapitalize="none"
                  autoCorrect={false}
                  placeholder={t('agents.pairingPh')}
                  placeholderTextColor={colors.textSecondary}
                  style={[styles.input, { color: colors.text, borderColor: colors.border, backgroundColor: colors.inputBackground }]}
                />
                <View style={styles.btnRow}>
                  <Button
                    title={t('agents.approve')}
                    loading={pairingBusy}
                    onPress={() => void approvePairing(pairingCode)}
                  />
                  <Button
                    title={t('agents.checkPending')}
                    variant="outline"
                    onPress={() => void approvePairing()}
                  />
                </View>
              </View>
            ) : null}

            {/* SSH */}
            <View>
              <Text style={[styles.stepTitle, { color: colors.text, marginBottom: 6 }]}>
                <Text style={{ color: colors.tint }}>{sshStep} </Text>
                {t('agents.sshTitle')}
              </Text>
              <AgentSshCard
                ssh={ssh.ssh}
                busy={ssh.busy}
                hostPlaceholder={host}
                onGenerate={(h) => void ssh.generate(h)}
                onRevoke={() => void ssh.revoke()}
              />
              {ssh.status ? (
                <Text style={{ color: colors.textSecondary, fontSize: 12, marginTop: 6 }}>{ssh.status}</Text>
              ) : null}
            </View>

            {/* Config / about */}
            <View style={[styles.panel, { borderColor: colors.border, backgroundColor: colors.cardBackground }]}>
              <Text style={[styles.stepTitle, { color: colors.text }]}>
                <Text style={{ color: colors.tint }}>{configStep} </Text>
                {t('agents.configuration')}
              </Text>
              <Text style={{ color: colors.textSecondary, fontSize: 13, lineHeight: 19 }}>
                {t(`agents.configNote.${profile.id}`)}
              </Text>
              <Pressable
                onPress={() => router.push(href(`/hire-agent/${agent.id}`))}
                style={{ minHeight: 32, justifyContent: 'center' }}
              >
                <Text style={{ color: colors.tint, fontWeight: '700' }}>{t('agents.details')} →</Text>
              </Pressable>
            </View>
          </>
        )}

        {status ? <Text style={{ color: colors.textSecondary, fontSize: 12 }}>{status}</Text> : null}
        <Text style={{ color: colors.textSecondary, fontSize: 11, marginTop: 8 }}>
          {t('agents.footerNote')}
        </Text>
      </ScrollView>
    </Screen>
  );
}

function agentGatewayProfileId(agent: Parameters<typeof agentBrand>[0]) {
  // Reuse the shared resolver so `nano-claw` maps to the `nanoclaw` profile.
  const brand = agentBrand(agent);
  if (brand === 'Hermes') return 'hermes' as const;
  if (brand === 'NanoClaw') return 'nanoclaw' as const;
  if (brand === 'SpaceBot') return 'spacebot' as const;
  return 'openclaw' as const;
}

const styles = StyleSheet.create({
  scroll: { paddingHorizontal: 16, paddingBottom: 40, gap: 12 },
  head: { flexDirection: 'row', alignItems: 'center', gap: 12, marginTop: 8 },
  title: { fontSize: 20, fontWeight: '700' },
  panel: { borderWidth: 1, borderRadius: 16, padding: 14, gap: 10 },
  stepTitle: { fontSize: 15, fontWeight: '800' },
  btnRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  input: { borderWidth: 1, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10, minHeight: 44 },
  code: { fontSize: 13, fontFamily: 'monospace', lineHeight: 19 },
  creds: { borderWidth: 1, borderRadius: 10, padding: 10, gap: 6 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  channel: {
    borderWidth: 1,
    borderRadius: 12,
    paddingVertical: 10,
    paddingHorizontal: 14,
    minHeight: 44,
    justifyContent: 'center',
  },
});
