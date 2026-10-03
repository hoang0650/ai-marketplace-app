import React, { useRef } from 'react';
import { ActivityIndicator, Linking, Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import type { TemplateBuild } from '@/api/types';
import { useT } from '@/hooks/useT';

const MONO = Platform.select({ ios: 'Menlo', default: 'monospace' });
const COLORS = { info: '#d1d5db', warn: '#fbbf24', error: '#fca5a5', success: '#4ade80' } as const;

function stamp(ms: number) {
  const m = Math.floor(ms / 60000);
  const s = Math.floor((ms % 60000) / 1000);
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}.${String(ms % 1000).padStart(3, '0')}`;
}

type Props = { build: TemplateBuild | null; building?: boolean };

/** Deployment-style log of a template build: status, repo@commit, duration, timestamped lines. */
export function BuildLog({ build, building = false }: Props) {
  const { t } = useT();
  const scroll = useRef<ScrollView>(null);
  if (!building && !build) return null;

  const status = building ? 'running' : build!.status;
  const badgeColor = status === 'success' ? '#4ade80' : status === 'failed' ? '#f87171' : '#fbbf24';
  const src = build?.source;
  const repoUrl = src ? src.repoUrl || `https://github.com/${src.repo}` : '';

  return (
    <View style={styles.box}>
      <View style={styles.bar}>
        <View style={styles.badge}>
          {building ? <ActivityIndicator size="small" color={badgeColor} /> : null}
          <Text style={[styles.badgeText, { color: badgeColor }]}>
            {building ? t('builder.build.running') : status === 'success' ? `✓ ${t('builder.build.success')}` : `✗ ${t('builder.build.failed')}`}
          </Text>
        </View>
        {!building && build ? (
          <>
            {src?.repo ? (
              <Pressable onPress={() => void Linking.openURL(src.commitSha ? `${repoUrl}/commit/${src.commitSha}` : repoUrl)}>
                <Text style={styles.meta} numberOfLines={1}>
                  {src.repo}
                  {src.branch ? ` · ${src.branch}` : ''}
                  {src.commitSha ? ` · ${src.commitSha.slice(0, 7)}` : ''}
                </Text>
              </Pressable>
            ) : null}
            <Text style={styles.meta}>{(build.durationMs / 1000).toFixed(1)}s</Text>
            {build.previewUrl ? (
              <Pressable onPress={() => void Linking.openURL(build.previewUrl)} style={{ marginLeft: 'auto' }}>
                <Text style={styles.open}>{t('builder.build.preview')} ↗</Text>
              </Pressable>
            ) : null}
          </>
        ) : null}
      </View>
      <ScrollView
        ref={scroll}
        style={styles.lines}
        contentContainerStyle={{ paddingVertical: 8 }}
        nestedScrollEnabled
        onContentSizeChange={() => scroll.current?.scrollToEnd({ animated: false })}
      >
        {building ? (
          <Line ms={0} level="info" msg={t('builder.build.fetching')} />
        ) : (
          (build?.log || []).map((l, i) => <Line key={i} ms={l.t} level={l.level} msg={l.msg} />)
        )}
      </ScrollView>
    </View>
  );
}

function Line({ ms, level, msg }: { ms: number; level: keyof typeof COLORS; msg: string }) {
  return (
    <View style={[styles.line, level === 'error' && styles.lineErr]}>
      <Text style={styles.ts}>{stamp(ms)}</Text>
      <Text selectable style={[styles.msg, { color: COLORS[level] }, level === 'success' && { fontWeight: '700' }]}>
        {msg}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  box: { borderRadius: 12, overflow: 'hidden', borderWidth: 1, borderColor: '#1f2937', backgroundColor: '#0b0f17' },
  bar: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 10, paddingHorizontal: 12, paddingVertical: 8, backgroundColor: '#111827' },
  badge: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  badgeText: { fontWeight: '800', fontSize: 13 },
  meta: { color: '#9ca3af', fontSize: 12, maxWidth: 220 },
  open: { color: '#93c5fd', fontWeight: '700', fontSize: 12 },
  lines: { maxHeight: 320 },
  line: { flexDirection: 'row', gap: 8, paddingHorizontal: 12, paddingVertical: 1 },
  lineErr: { backgroundColor: 'rgba(248,113,113,0.08)' },
  ts: { color: '#6b7280', fontFamily: MONO, fontSize: 11, width: 72 },
  msg: { flex: 1, fontFamily: MONO, fontSize: 11, lineHeight: 16 },
});
