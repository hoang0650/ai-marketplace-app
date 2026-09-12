import React from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import { Image } from 'expo-image';
import { NativeMediaPlayer } from '@/components/content/NativeMediaPlayer';
import { SchemaField } from '@/components/content/SchemaField';
import { Button } from '@/components/ui/Button';
import { Chip } from '@/components/ui/Chip';
import { Input } from '@/components/ui/Input';
import { isVoiceCategory } from '@/constants/categories';
import { useTheme } from '@/hooks/useT';
import { useT } from '@/hooks/useT';
import type { PlaygroundState } from '@/hooks/usePlayground';
import { getErrorMessage } from '@/lib/errors';
import { formatMoney } from '@/utils/format';
import type { Product } from '@/api/types';

type Props = {
  product: Product;
  pg: PlaygroundState;
  isAuthenticated: boolean;
  onNeedAuth: () => void;
  onNeedWallet: () => void;
};

export function PlaygroundPanel({ product, pg, isAuthenticated, onNeedAuth, onNeedWallet }: Props) {
  const { colors } = useTheme();
  const { t, language } = useT();
  const error = pg.run.isError ? getErrorMessage(pg.run.error, language) : pg.errorText;
  const needTopup = !!error && /402|Insufficient|ví|wallet|top up/i.test(error);
  const statusLabel =
    pg.runStatus === 'idle'
      ? 'idle'
      : pg.runStatus === 'running'
        ? 'running'
        : pg.runStatus === 'done'
          ? 'COMPLETED'
          : 'FAILED';

  const onRun = () => {
    if (!isAuthenticated) {
      onNeedAuth();
      return;
    }
    if (!pg.canRun) return;
    pg.run.mutate();
  };

  return (
    <View>
      <View style={[styles.pane, { borderColor: colors.border, backgroundColor: colors.cardBackground }]}>
        <View style={styles.paneHead}>
          <Text style={[styles.paneTitle, { color: colors.text }]}>Input</Text>
          <Pressable onPress={() => pg.setLogsOpen(!pg.logsOpen)} hitSlop={8} style={{ minHeight: 44, justifyContent: 'center' }}>
            <Text style={{ color: colors.tint, fontWeight: '700', fontSize: 12 }}>Request logs</Text>
          </Pressable>
        </View>

        {pg.logsOpen ? (
          <View style={[styles.logs, { borderColor: colors.border }]}>
            {pg.logs.length ? (
              pg.logs.map((log) => (
                <Text key={log.id} style={{ color: colors.textSecondary, fontSize: 12, marginBottom: 8 }} selectable>
                  {log.status} · {log.at}
                  {'\n'}
                  {JSON.stringify(log.input)}
                </Text>
              ))
            ) : (
              <Text style={{ color: colors.textSecondary }}>No requests this session.</Text>
            )}
          </View>
        ) : null}

        <Text style={[styles.label, { color: colors.textSecondary }]}>Model</Text>
        <Text style={[styles.help, { color: colors.textSecondary }]}>Model to use</Text>
        <View style={styles.wrap}>
          {pg.modelOptions.map((opt) => (
            <Chip key={opt.value} label={opt.label} active={pg.modelVariant === opt.value} onPress={() => pg.setModelVariant(opt.value)} />
          ))}
        </View>

        {pg.chatStyle ? (
          <>
            <Text style={[styles.label, { color: colors.textSecondary }]}>Input type</Text>
            <View style={styles.wrap}>
              <Chip label="Messages" active={pg.inputMode === 'messages'} onPress={() => pg.setInputMode('messages')} />
              <Chip label="Prompt" active={pg.inputMode === 'prompt'} onPress={() => pg.setInputMode('prompt')} />
            </View>
            <View style={styles.labelRow}>
              <Text style={[styles.label, { color: colors.textSecondary }]}>Prompt</Text>
              <Text style={styles.req}>Required</Text>
            </View>
            <Input value={pg.prompt} onChangeText={pg.setPrompt} multiline placeholder="Enter a prompt" style={styles.area} />
            {pg.inputMode === 'messages' ? (
              <Input label="System prompt" value={pg.systemPrompt} onChangeText={pg.setSystemPrompt} multiline style={styles.areaSm} />
            ) : null}
          </>
        ) : null}

        {!pg.chatStyle && !pg.primaryFields.length ? (
          <>
            <View style={styles.labelRow}>
              <Text style={[styles.label, { color: colors.textSecondary }]}>
                {isVoiceCategory(product.category) ? t('playground.tts') : 'Prompt'}
              </Text>
              <Text style={styles.req}>Required</Text>
            </View>
            <Input value={pg.prompt} onChangeText={pg.setPrompt} multiline placeholder="Enter a prompt" style={styles.area} />
          </>
        ) : null}

        {pg.primaryFields.map((f) => (
          <SchemaField key={f.key} field={f} values={pg.paramValues} onChange={pg.setValue} />
        ))}

        {pg.advancedFields.length ? (
          <View style={[styles.settings, { borderColor: colors.border }]}>
            <Pressable onPress={() => pg.setSettingsOpen(!pg.settingsOpen)} style={styles.settingsHead}>
              <Text style={{ color: colors.text, fontWeight: '700' }}>Additional settings</Text>
              <Text style={{ color: colors.textSecondary }}>{pg.settingsOpen ? '▴' : '▾'}</Text>
            </Pressable>
            {pg.settingsOpen
              ? pg.advancedFields.map((f) => <SchemaField key={f.key} field={f} values={pg.paramValues} onChange={pg.setValue} />)
              : null}
          </View>
        ) : null}

        <Text style={{ color: colors.textSecondary, marginBottom: 12, lineHeight: 20 }}>
          {pg.priceHint}
          {isAuthenticated && pg.wallet.data
            ? ` · ${t('playground.balance', { amount: formatMoney(pg.wallet.data.available ?? pg.wallet.data.balance, pg.wallet.data.currency || 'USD') })}`
            : ''}
        </Text>

        <View style={styles.actions}>
          <Button title="Reset" variant="outline" onPress={pg.reset} style={{ flex: 1 }} />
          <Button
            title={pg.run.isPending ? 'Running…' : 'Run'}
            loading={pg.run.isPending}
            disabled={!pg.canRun && isAuthenticated}
            onPress={onRun}
            style={{ flex: 1 }}
          />
        </View>
        {error ? (
          <View style={{ marginTop: 12 }}>
            <Text style={{ color: colors.danger, lineHeight: 20 }}>{error}</Text>
            {needTopup ? (
              <Pressable onPress={onNeedWallet} style={{ marginTop: 8, minHeight: 44, justifyContent: 'center' }}>
                <Text style={{ color: colors.tint, fontWeight: '800' }}>{t('playground.topUp')}</Text>
              </Pressable>
            ) : null}
          </View>
        ) : null}
      </View>

      <View style={[styles.pane, { borderColor: colors.border, backgroundColor: colors.cardBackground }]}>
        <View style={styles.paneHead}>
          <Text style={[styles.paneTitle, { color: colors.text }]}>Result</Text>
          <Text style={[styles.pill, { color: colors.textSecondary, borderColor: colors.border }]}>{statusLabel}</Text>
        </View>
        <View style={styles.wrap}>
          <Chip label="Preview" active={pg.resultView === 'preview'} onPress={() => pg.setResultView('preview')} />
          <Chip label="JSON" active={pg.resultView === 'json'} onPress={() => pg.setResultView('json')} />
        </View>
        <View style={[styles.resultBody, { borderColor: colors.border }]}>
          {pg.runStatus === 'idle' ? (
            isVoiceCategory(product.category) && product.contentMeta?.voiceSampleUrl ? (
              <NativeMediaPlayer uri={String(product.contentMeta.voiceSampleUrl)} kind="audio" />
            ) : (
              <Text style={{ color: colors.textSecondary, textAlign: 'center', paddingVertical: 28 }}>Generate to see results here</Text>
            )
          ) : pg.runStatus === 'running' ? (
            <View style={styles.center}>
              <ActivityIndicator color={colors.tint} />
              <Text style={{ color: colors.textSecondary, marginTop: 8 }}>Generating…</Text>
            </View>
          ) : pg.resultView === 'json' ? (
            <Text selectable style={{ color: colors.text, fontFamily: 'monospace', fontSize: 12, lineHeight: 18 }}>
              {JSON.stringify(pg.preview?.raw || {}, null, 2)}
            </Text>
          ) : pg.preview?.kind === 'video' && pg.preview.uri ? (
            <NativeMediaPlayer key={pg.preview.uri} uri={pg.preview.uri} kind="video" />
          ) : pg.preview?.kind === 'audio' && pg.preview.uri ? (
            <NativeMediaPlayer key={pg.preview.uri} uri={pg.preview.uri} kind="audio" />
          ) : pg.preview?.kind === 'image' && pg.preview.uri ? (
            <Image source={{ uri: pg.preview.uri }} style={styles.outImage} contentFit="contain" />
          ) : (
            <Text style={{ color: colors.text, lineHeight: 22 }}>{pg.preview?.text || ''}</Text>
          )}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  pane: { borderWidth: 1, borderRadius: 16, padding: 14, marginTop: 12 },
  paneHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  paneTitle: { fontSize: 18, fontWeight: '800' },
  label: { fontSize: 12, fontWeight: '700', letterSpacing: 0.3, marginBottom: 4 },
  help: { fontSize: 12, marginBottom: 8 },
  labelRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  req: { color: '#c0392b', fontSize: 11, fontWeight: '700' },
  wrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 12 },
  area: { minHeight: 120, textAlignVertical: 'top' },
  areaSm: { minHeight: 80, textAlignVertical: 'top' },
  settings: { borderWidth: 1, borderRadius: 12, padding: 12, marginBottom: 12 },
  settingsHead: { flexDirection: 'row', justifyContent: 'space-between', minHeight: 44, alignItems: 'center', marginBottom: 8 },
  actions: { flexDirection: 'row', gap: 8 },
  logs: { borderWidth: 1, borderRadius: 10, padding: 10, marginBottom: 12, maxHeight: 160 },
  pill: { fontSize: 11, fontWeight: '800', letterSpacing: 0.4, textTransform: 'uppercase', borderWidth: 1, borderRadius: 999, paddingHorizontal: 10, paddingVertical: 4 },
  resultBody: { borderWidth: 1, borderRadius: 12, padding: 12, minHeight: 140 },
  center: { alignItems: 'center', paddingVertical: 24 },
  outImage: { width: '100%', height: 240, borderRadius: 12, backgroundColor: '#111' },
});
