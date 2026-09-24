import React, { useCallback, useRef, useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import * as Clipboard from 'expo-clipboard';
import type { AgentSshAccess } from '@/api/types';
import { useTheme, useT } from '@/hooks/useT';
import { Button } from '@/components/ui/Button';

function CopyField({
  label,
  value,
  copiedKey,
  copied,
  lines = 3,
  onCopy,
}: {
  label: string;
  value?: string;
  copiedKey: string;
  copied: string;
  lines?: number;
  onCopy: (value: string | undefined, key: string) => void;
}) {
  const { colors } = useTheme();
  const { t } = useT();
  if (!value) return null;
  return (
    <View>
      {label ? <Text style={[styles.label, { color: colors.textSecondary }]}>{label}</Text> : null}
      <View style={[styles.copyRow, { borderColor: colors.border, backgroundColor: colors.mist }]}>
        <Text selectable style={[styles.code, styles.mono, { color: colors.text }]} numberOfLines={lines}>
          {value}
        </Text>
        <Pressable onPress={() => onCopy(value, copiedKey)} hitSlop={8} style={styles.copyBtn}>
          <Text style={{ color: colors.tint, fontWeight: '700', fontSize: 12 }}>
            {copied === copiedKey ? t('agents.copied') : t('agents.copy')}
          </Text>
        </Pressable>
      </View>
    </View>
  );
}

/** True when the session authenticates with an SSH key (SpaceBot) rather than a password. */
function isKeySession(ssh: AgentSshAccess | null): boolean {
  return !!ssh && (ssh.authMethod === 'key' || !!ssh.privateKey);
}

/**
 * Temporary SSH credentials card, shared by the agent detail page and setup wizard.
 * Mirrors the web flow: separate copy buttons per field, a Windows paste tip, and
 * the `sshpass` one-liner tucked away for Linux/macOS users.
 */
export function AgentSshCard({
  ssh,
  busy,
  hostPlaceholder,
  onGenerate,
  onRevoke,
}: {
  ssh: AgentSshAccess | null;
  busy: boolean;
  hostPlaceholder: string;
  onGenerate: (host?: string) => void;
  onRevoke: () => void;
}) {
  const { colors } = useTheme();
  const { t } = useT();
  const [host, setHost] = useState('');
  const [copied, setCopied] = useState('');
  const [showSshpass, setShowSshpass] = useState(false);
  const [showKeyTip, setShowKeyTip] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const copy = useCallback(async (value: string | undefined, key: string) => {
    const text = String(value ?? '');
    if (!text) return;
    try {
      await Clipboard.setStringAsync(text);
    } catch {
      return;
    }
    setCopied(key);
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => setCopied(''), 2000);
  }, []);

  return (
    <View style={[styles.card, { borderColor: colors.border, backgroundColor: colors.cardBackground }]}>
      <Text style={[styles.heading, { color: colors.text }]}>{t('agents.sshTitle')}</Text>
      <Text style={{ color: colors.textSecondary, fontSize: 13, lineHeight: 19 }}>{t('agents.sshLede')}</Text>

      <Text style={[styles.label, { color: colors.textSecondary }]}>{t('agents.sshHost')}</Text>
      <TextInput
        value={host}
        onChangeText={setHost}
        autoCapitalize="none"
        autoCorrect={false}
        placeholder={hostPlaceholder}
        placeholderTextColor={colors.textSecondary}
        style={[styles.input, { color: colors.text, borderColor: colors.border, backgroundColor: colors.inputBackground }]}
      />
      <View style={styles.row}>
        <Button
          title={busy ? t('agents.sshGenerating') : t('agents.sshGenerate')}
          loading={busy}
          onPress={() => onGenerate(host)}
        />
        {ssh ? <Button title={t('agents.sshRevoke')} variant="outline" onPress={onRevoke} /> : null}
      </View>

      {ssh ? (
        <View style={{ gap: 12, marginTop: 4 }}>
          <CopyField label={t('agents.sshUsername')} value={ssh.username} copiedKey="user" copied={copied} onCopy={copy} />
          {isKeySession(ssh) ? (
            <>
              <CopyField
                label={ssh.keyName ? t('agents.sshPrivateKeyNamed', { name: ssh.keyName }) : t('agents.sshPrivateKey')}
                value={ssh.privateKey}
                copiedKey="key"
                copied={copied}
                lines={6}
                onCopy={copy}
              />
              {ssh.fingerprint ? (
                <Text style={[styles.code, styles.mono, { color: colors.textSecondary }]}>
                  {t('agents.sshFingerprint', { fingerprint: ssh.fingerprint })}
                </Text>
              ) : null}
            </>
          ) : (
            <CopyField label={t('agents.sshPassword')} value={ssh.password} copiedKey="pass" copied={copied} onCopy={copy} />
          )}
          <CopyField label={t('agents.sshCommand')} value={ssh.command} copiedKey="cmd" copied={copied} onCopy={copy} />

          {ssh.expiresInMinutes != null ? (
            <Text style={{ color: colors.success, fontWeight: '700', fontSize: 13 }}>
              {ssh.note} ({t('agents.sshMinutes', { minutes: ssh.expiresInMinutes })})
            </Text>
          ) : null}

          {ssh.commandWithPassword ? (
            <View>
              <Pressable onPress={() => setShowSshpass((v) => !v)} style={{ minHeight: 32, justifyContent: 'center' }}>
                <Text style={{ color: colors.tint, fontWeight: '700', fontSize: 13 }}>
                  {showSshpass ? '▾ ' : '▸ '}
                  {t('agents.sshSshpass')}
                </Text>
              </Pressable>
              {showSshpass ? (
                <View style={{ marginTop: 6 }}>
                  <CopyField label="" value={ssh.commandWithPassword} copiedKey="sshpass" copied={copied} onCopy={copy} />
                </View>
              ) : null}
            </View>
          ) : null}

          {isKeySession(ssh) ? (
            <View>
              <Pressable onPress={() => setShowKeyTip((v) => !v)} style={{ minHeight: 32, justifyContent: 'center' }}>
                <Text style={{ color: colors.tint, fontWeight: '700', fontSize: 13 }}>
                  {showKeyTip ? '▾ ' : '▸ '}
                  {t('agents.sshKeySetup')}
                </Text>
              </Pressable>
              {showKeyTip ? (
                <Text style={{ color: colors.textSecondary, fontSize: 12, lineHeight: 18, marginTop: 6 }}>
                  {t('agents.sshKeySetupHelp', { name: ssh.keyName || 'spacebot_key' })}
                </Text>
              ) : null}
            </View>
          ) : (
            <Text style={{ color: colors.textSecondary, fontSize: 12, lineHeight: 18 }}>
              <Text style={{ fontWeight: '800' }}>{t('agents.sshWindowsTipLabel')} </Text>
              {t('agents.sshWindowsTip')}
            </Text>
          )}
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  card: { borderWidth: 1, borderRadius: 16, padding: 14, gap: 10 },
  heading: { fontSize: 16, fontWeight: '800' },
  label: { fontSize: 11, fontWeight: '700', letterSpacing: 0.4, textTransform: 'uppercase' },
  input: { borderWidth: 1, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10, minHeight: 44 },
  row: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  copyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 8,
    marginTop: 4,
  },
  code: { flex: 1, fontSize: 13, lineHeight: 18 },
  mono: { fontFamily: 'monospace' },
  copyBtn: { minHeight: 32, justifyContent: 'center' },
});
