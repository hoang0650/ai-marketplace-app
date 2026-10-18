import React, { useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, Keyboard, KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { WebView } from 'react-native-webview';
import { useKeepAwake } from 'expo-keep-awake';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { builderApi } from '@/api';
import type { BuilderProject } from '@/api/types';
import { ApiError, getErrorMessage } from '@/lib/errors';
import { href } from '@/lib/href';
import { useAuth } from '@/hooks/useAuth';
import { useT } from '@/hooks/useT';
import { LoginPrompt } from '@/components/ui/LoginPrompt';
import { GitPanel } from '@/components/builder/GitPanel';
import { useSync } from '@/hooks/useSync';
import { CodeEditorView } from '@/components/builder/CodeEditorView';

const BG = '#0b0f17';
const BAR = '#0c121c';
const LINE = '#1c2a3a';
const ACCENT = '#3dffb0';
const TEXT = '#e5e7eb';
const MUTED = 'rgba(229,231,235,0.6)';

type Tab = 'preview' | 'chat' | 'code' | 'files' | 'git';
const BOTTOM_TABS: { id: Tab; icon: string; label: string }[] = [
  { id: 'chat', icon: '✦', label: 'builder.m.tab.chat' },
  { id: 'code', icon: '</>', label: 'builder.tab.code' },
  { id: 'preview', icon: '▶', label: 'builder.tab.preview' },
  { id: 'files', icon: '🗂', label: 'builder.m.tab.files' },
];

export default function BuilderStudioScreen() {
  useKeepAwake();
  const {
    id,
    prompt: initialPrompt,
    git_connect: gitConnect,
    git_error: gitError,
  } = useLocalSearchParams<{ id: string; prompt?: string; git_connect?: string; git_error?: string }>();
  const router = useRouter();
  const qc = useQueryClient();
  const insets = useSafeAreaInsets();
  const { isAuthenticated } = useAuth();
  const { t, language } = useT();
  const [tab, setTab] = useState<Tab>(gitConnect || gitError ? 'git' : initialPrompt ? 'chat' : 'preview');
  const [project, setProject] = useState<BuilderProject | null>(null);
  const [prompt, setPrompt] = useState('');
  const [busy, setBusy] = useState(false);
  const [pending, setPending] = useState('');
  const [error, setError] = useState('');
  const [previewError, setPreviewError] = useState('');
  const [provider, setProvider] = useState('');
  const [nonce, setNonce] = useState(0);
  const [openFile, setOpenFile] = useState('');
  const [expanded, setExpanded] = useState(false);
  const [codeDirty, setCodeDirty] = useState(false);
  const [kbVisible, setKbVisible] = useState(false);
  const started = useRef(false);

  useEffect(() => {
    const show = Keyboard.addListener(Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow', () => setKbVisible(true));
    const hide = Keyboard.addListener(Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide', () => setKbVisible(false));
    return () => { show.remove(); hide.remove(); };
  }, []);

  useEffect(() => {
    if (tab !== 'code' || openFile || !project?.files?.length) return;
    const first = project.files.find((f) => /(^|\/)(App|index)\.(tsx|jsx|html)$/.test(f.path)) || project.files[0];
    setOpenFile(first.path);
  }, [tab, openFile, project?.files]);

  const saveFile = async (path: string, content: string) => {
    if (!project || busy) return;
    try {
      const res = await builderApi.saveFile(project.id, path, content);
      setProject(res.project);
      qc.setQueryData(['builder-project', id], { project: res.project });
      setNonce((n) => n + 1);
    } catch (e) {
      setError(getErrorMessage(e, language));
    }
  };
  const chatRef = useRef<ScrollView>(null);

  const providers = useQuery({ queryKey: ['builder-providers'], queryFn: builderApi.providers, enabled: isAuthenticated });
  const detail = useQuery({ queryKey: ['builder-project', id], queryFn: () => builderApi.one(String(id || '')), enabled: isAuthenticated && !!id });
  const activeKeys = useMemo(() => (providers.data?.keys || []).filter((k) => k.status === 'active'), [providers.data]);

  useEffect(() => {
    if (detail.data?.project) setProject(detail.data.project);
  }, [detail.data]);

  useEffect(() => {
    if (!project || !providers.data) return;
    if (!provider) setProvider(activeKeys.some((k) => k.provider === project.provider) ? project.provider : activeKeys[0]?.provider || '');
  }, [project, providers.data, activeKeys, provider]);

  const canBuild = activeKeys.some((k) => k.provider === provider);

  // Cross-device sync: the server is the source of truth; refetch when another device changes this project.
  const [remoteGenerating, setRemoteGenerating] = useState(false);
  useSync((e) => {
    if (e.self) return;
    if (e.type === 'project.generating' && e.data?.id === String(id)) setRemoteGenerating(e.data?.state === 'start');
    const changed = e.type === 'project.updated' && e.data?.id === String(id) && e.data?.version !== project?.version;
    if ((changed || e.type === 'reset') && !busy) {
      if (changed) setRemoteGenerating(false);
      void qc.invalidateQueries({ queryKey: ['builder-project', id] });
    }
  });

  const run = async (text: string, fixError = '') => {
    if (!project || busy || !canBuild) return;
    setBusy(true);
    setError('');
    setPreviewError('');
    setPending(text || t('builder.fixing'));
    setTab('chat');
    try {
      const res = await builderApi.generate(project.id, { prompt: text, previewError: fixError || undefined, provider });
      setProject(res.project);
      qc.setQueryData(['builder-project', id], { project: res.project });
      void qc.invalidateQueries({ queryKey: ['builder-projects'] });
      if (res.truncated) setError(t('builder.err.truncated'));
      setNonce((n) => n + 1);
      setTab('preview');
    } catch (e) {
      const code = e instanceof ApiError ? e.code : '';
      const key = `builder.err.${code}`;
      const msg = code ? t(key) : '';
      setError(msg && msg !== key ? msg : getErrorMessage(e, language));
      if (text) setPrompt((p) => p || text);
      else if (fixError) setPreviewError(fixError);
    } finally {
      setBusy(false);
      setPending('');
    }
  };

  useEffect(() => {
    const text = String(initialPrompt || '').trim();
    if (!text || started.current || !project || !canBuild) return;
    started.current = true;
    void run(text);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialPrompt, project, canBuild]);

  useEffect(() => {
    setTimeout(() => chatRef.current?.scrollToEnd({ animated: true }), 50);
  }, [project?.messages?.length, pending]);

  const leave = () => {
    if (router.canGoBack()) router.back();
    else router.replace(href('/builder'));
  };

  if (!isAuthenticated) return <LoginPrompt />;

  const uri = project ? `${project.previewUrl}?v=${project.version}-${nonce}` : '';
  const editorFiles = useMemo(() => (project?.files || []).map((f) => ({ path: f.path, content: f.content })), [project?.files]);
  const editorLabels = useMemo(
    () => ({ saved: t('builder.m.saved'), unsaved: t('builder.m.unsaved'), ai: t('builder.m.aiWriting'), explorer: t('builder.m.explorer'), pick: t('builder.m.pickFile') }),
    [t],
  );
  const full = expanded && tab === 'preview' && !!project;

  return (
    <KeyboardAvoidingView style={styles.bg} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <Stack.Screen options={{ headerShown: false }} />
      {full ? (
        <View style={[styles.fullBar, { top: Math.max(insets.top, 8) }]}>
          <Pressable onPress={() => setNonce((n) => n + 1)} hitSlop={10} style={styles.fullBtn}>
            <Text style={styles.fullBtnText}>↻</Text>
          </Pressable>
          <Pressable onPress={() => setExpanded(false)} hitSlop={10} style={styles.fullBtn}>
            <Text style={styles.fullBtnText}>{t('builder.collapse')}</Text>
          </Pressable>
        </View>
      ) : (
        <>
      <View style={[styles.bar, { paddingTop: Math.max(insets.top, 8) }]}>
        <Pressable onPress={leave} hitSlop={8} style={styles.barHit}>
          <Text style={styles.barBtn}>← {t('common.back')}</Text>
        </Pressable>
        <Text style={styles.barTitle} numberOfLines={1}>
          {project?.name || t('builder.title')}
        </Text>
        {tab === 'preview' && project ? (
          <Pressable onPress={() => setExpanded(true)} hitSlop={8} style={styles.barHit}>
            <Text style={styles.barBtn}>{t('builder.expand')}</Text>
          </Pressable>
        ) : null}
        <Pressable onPress={() => setTab(tab === 'git' ? 'chat' : 'git')} hitSlop={8} style={styles.barHit} accessibilityLabel={t('builder.tab.git')}>
          <Text style={[styles.barBtn, tab === 'git' && { color: TEXT }]}>⎇</Text>
        </Pressable>
        <Pressable onPress={() => setNonce((n) => n + 1)} hitSlop={8} style={styles.barHit}>
          <Text style={styles.barBtn}>↻</Text>
        </Pressable>
      </View>

      {providers.isSuccess && !activeKeys.length ? (
        <Pressable onPress={() => router.push(href('/builder'))} style={styles.keyBanner}>
          <Text style={{ color: '#fcd34d', flex: 1, lineHeight: 19 }}>{t('builder.needKey.short')}</Text>
          <Text style={{ color: BG, backgroundColor: ACCENT, fontWeight: '800', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8, overflow: 'hidden' }}>
            {t('builder.keys.setup')}
          </Text>
        </Pressable>
      ) : null}


      {remoteGenerating && !busy ? <Text style={styles.remote}>{t('handoff.app.remoteGenerating')}</Text> : null}
      {error ? <Text style={styles.err}>{error}</Text> : null}
      {previewError && tab !== 'code' && tab !== 'files' ? (
        <View style={styles.previewErr}>
          <Text style={{ color: '#fecaca', fontWeight: '700' }}>{t('builder.previewError')}</Text>
          <Text style={styles.mono} numberOfLines={4}>
            {previewError}
          </Text>
          <View style={{ flexDirection: 'row', gap: 12, marginTop: 6 }}>
            <Pressable disabled={busy || !canBuild} onPress={() => void run('', previewError)}>
              <Text style={{ color: ACCENT, fontWeight: '700' }}>{t('builder.fixWithAi')}</Text>
            </Pressable>
            <Pressable onPress={() => setPreviewError('')}>
              <Text style={{ color: MUTED }}>{t('builder.dismiss')}</Text>
            </Pressable>
          </View>
        </View>
      ) : null}
        </>
      )}

      {!project ? (
        <View style={styles.center}>
          {detail.isError ? <Text style={styles.err}>{getErrorMessage(detail.error, language)}</Text> : <ActivityIndicator color={ACCENT} />}
        </View>
      ) : tab === 'preview' ? (
        <View style={styles.fill}>
        {Platform.OS === 'web' ? (
          React.createElement('iframe', { key: uri, src: uri, title: project.name, sandbox: 'allow-scripts allow-forms allow-modals allow-popups', style: { border: 0, width: '100%', height: '100%', background: '#fff' } })
        ) : (
        <WebView
          key={uri}
          source={{ uri }}
          style={[styles.fill, full && { marginTop: insets.top, marginBottom: insets.bottom }]}
          originWhitelist={['*']}
          javaScriptEnabled
          domStorageEnabled
          setSupportMultipleWindows={false}
          onMessage={(e) => {
            try {
              const data = JSON.parse(e.nativeEvent.data) as { source?: string; type?: string; message?: string };
              if (data.source === 'aim-preview' && data.type === 'error' && data.message) setPreviewError(data.message);
            } catch {
              /* not ours */
            }
          }}
        />
        )}
          {!full ? (
            <Pressable onPress={() => setTab('code')} style={styles.fab} accessibilityRole="button" testID="app-fab-code">
              <Text style={{ color: '#fff', fontWeight: '700' }}>{'</>'} {t('builder.tab.code')}</Text>
            </Pressable>
          ) : null}
        </View>
      ) : tab === 'chat' ? (
        <View style={styles.fill}>
          <ScrollView ref={chatRef} contentContainerStyle={{ padding: 12, gap: 10 }}>
            {(project.messages || []).length === 0 && !pending ? <Text style={{ color: MUTED, lineHeight: 20 }}>{t(`builder.chatEmpty.${project.kind}`)}</Text> : null}
            {(project.messages || []).map((m) => (
              <View key={m.id} style={[styles.bubble, m.role === 'user' ? styles.bubbleUser : styles.bubbleAi]}>
                <Text style={{ color: TEXT, lineHeight: 20 }}>{m.content}</Text>
                {m.files.length ? (
                  <Text style={[styles.mono, { marginTop: 6 }]} numberOfLines={3}>
                    {m.files.join(' · ')}
                  </Text>
                ) : null}
              </View>
            ))}
            {pending ? (
              <View style={[styles.bubble, styles.bubbleUser]}>
                <Text style={{ color: TEXT, lineHeight: 20 }}>{pending}</Text>
              </View>
            ) : null}
            {busy ? (
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <ActivityIndicator color={ACCENT} />
                <Text style={{ color: MUTED }}>{t('builder.buildingMobile')}</Text>
              </View>
            ) : null}
          </ScrollView>
          {activeKeys.length ? (
            <ScrollView horizontal contentContainerStyle={{ gap: 8, paddingHorizontal: 12, paddingBottom: 6, alignItems: 'center' }} showsHorizontalScrollIndicator={false}>
              <Text style={{ color: MUTED, fontSize: 12 }}>{t('builder.provider')}</Text>
              {activeKeys.map((k) => (
                <Pressable
                  key={k.provider}
                  onPress={() => {
                    setProvider(k.provider);
                    void builderApi.update(project.id, { provider: k.provider, model: '' }).catch(() => undefined);
                  }}
                  style={[styles.chip, provider === k.provider && { borderColor: ACCENT }]}
                >
                  <Text style={{ color: TEXT, fontSize: 12 }}>{providers.data?.providers.find((p) => p.id === k.provider)?.label || k.provider}</Text>
                </Pressable>
              ))}
            </ScrollView>
          ) : null}
          <View style={[styles.composer, { paddingBottom: 10 }]}>
            <TextInput
              value={prompt}
              onChangeText={setPrompt}
              multiline
              maxLength={8000}
              editable={!busy}
              placeholder={canBuild ? t('builder.followUpPhMobile') : t('builder.needKey.short')}
              placeholderTextColor={MUTED}
              style={styles.input}
            />
            <Pressable
              disabled={busy || !prompt.trim() || !canBuild}
              onPress={() => {
                const text = prompt.trim();
                setPrompt('');
                void run(text);
              }}
              style={[styles.send, (busy || !prompt.trim() || !canBuild) && { opacity: 0.4 }]}
            >
              <Text style={{ color: BG, fontWeight: '800' }}>{t('builder.send')}</Text>
            </Pressable>
          </View>
        </View>
      ) : tab === 'git' ? (
        <GitPanel
          project={project}
          busy={busy}
          connectId={gitConnect}
          connectError={gitError}
          onGit={(git) => {
            const next = { ...project, git };
            setProject(next);
            qc.setQueryData(['builder-project', id], { project: next });
          }}
        />
      ) : tab === 'files' ? (
        <ScrollView style={{ backgroundColor: '#181818' }} contentContainerStyle={{ paddingVertical: 6 }} testID="app-files">
          <Text style={styles.explorerHead}>{t('builder.m.explorer')} · {(project.files || []).length}</Text>
          {[...(project.files || [])]
            .sort((a, b) => a.path.localeCompare(b.path))
            .map((f) => {
              const depth = f.path.split('/').length - 1;
              return (
                <Pressable
                  key={f.path}
                  onPress={() => { setOpenFile(f.path); setTab('code'); }}
                  style={[styles.fileRow, { paddingLeft: 14 + depth * 14 }, openFile === f.path && { backgroundColor: '#37373d' }]}
                >
                  <Text style={[styles.mono, { color: '#519aba', width: 22 }]}>{fileIcon(f.path)}</Text>
                  <Text style={{ color: MUTED, fontSize: 12 }} numberOfLines={1}>{depth ? f.path.split('/').slice(0, -1).join('/') + '/' : ''}</Text>
                  <Text style={{ color: TEXT, fontSize: 14, flexShrink: 1 }} numberOfLines={1}>{f.path.split('/').pop()}</Text>
                </Pressable>
              );
            })}
        </ScrollView>
      ) : (
        <CodeEditorView
          files={editorFiles}
          path={openFile}
          version={project.version}
          generating={busy}
          labels={editorLabels}
          onSave={(p, c) => void saveFile(p, c)}
          onDirty={setCodeDirty}
          onPreview={() => setTab('preview')}
        />
      )}

      {!full && !kbVisible ? (
        <View style={[styles.bottomTabs, { paddingBottom: insets.bottom }]} accessibilityRole="tablist">
          {BOTTOM_TABS.map((b) => {
            const on = tab === b.id;
            return (
              <Pressable key={b.id} onPress={() => setTab(b.id)} style={styles.bottomTab} accessibilityRole="tab" accessibilityState={{ selected: on }} testID={`app-tab-${b.id}`}>
                {on ? <View style={styles.bottomTabLine} /> : null}
                <Text style={[styles.bottomIcon, on && { color: ACCENT }]}>{b.icon}</Text>
                <Text style={[styles.bottomLabel, on && { color: ACCENT }]}>{t(b.label)}</Text>
                {(b.id === 'chat' && busy && !on) || (b.id === 'code' && codeDirty && !on) ? <View style={styles.badge} /> : null}
              </Pressable>
            );
          })}
        </View>
      ) : null}
    </KeyboardAvoidingView>
  );
}

function fileIcon(path: string): string {
  const e = (path.split('.').pop() || '').toLowerCase();
  return ({ tsx: '⚛', jsx: '⚛', ts: 'TS', js: 'JS', json: '{}', html: '<>', css: '#', md: 'M↓' } as Record<string, string>)[e] || '·';
}

const styles = StyleSheet.create({
  barHit: { minWidth: 44, minHeight: 44, alignItems: 'center', justifyContent: 'center' },
  bottomTabs: { flexDirection: 'row', backgroundColor: BAR, borderTopWidth: 1, borderTopColor: LINE },
  bottomTab: { flex: 1, minHeight: 56, alignItems: 'center', justifyContent: 'center', gap: 2 },
  bottomTabLine: { position: 'absolute', top: 0, left: '25%', right: '25%', height: 2, borderRadius: 2, backgroundColor: ACCENT },
  bottomIcon: { color: MUTED, fontSize: 17, fontWeight: '700' },
  bottomLabel: { color: MUTED, fontSize: 11, fontWeight: '700' },
  badge: { position: 'absolute', top: 9, left: '58%', width: 8, height: 8, borderRadius: 4, backgroundColor: '#3b82f6' },
  fab: { position: 'absolute', right: 14, bottom: 14, minHeight: 44, paddingHorizontal: 16, borderRadius: 999, backgroundColor: '#0e639c', alignItems: 'center', justifyContent: 'center' },
  explorerHead: { color: '#bbbbbb', fontSize: 11, fontWeight: '800', letterSpacing: 1, textTransform: 'uppercase', paddingHorizontal: 14, paddingVertical: 12 },
  remote: { color: ACCENT, fontSize: 12, paddingHorizontal: 12, paddingVertical: 6, backgroundColor: 'rgba(61,255,176,0.08)' },
  bg: { flex: 1, backgroundColor: BG },
  fill: { flex: 1, backgroundColor: BG },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 },
  bar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
    paddingHorizontal: 14,
    paddingBottom: 10,
    backgroundColor: BAR,
    borderBottomWidth: 1,
    borderBottomColor: LINE,
  },
  barBtn: { color: ACCENT, fontWeight: '700', fontSize: 14 },
  barTitle: { color: TEXT, fontWeight: '800', fontSize: 15, flex: 1, textAlign: 'center' },
  tabs: { flexDirection: 'row', gap: 6, padding: 8, backgroundColor: BAR },
  keyBanner: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 14, paddingVertical: 10, backgroundColor: 'rgba(251,191,36,0.1)', borderBottomWidth: 1, borderBottomColor: LINE },
  fullBar: { position: 'absolute', right: 10, zIndex: 10, flexDirection: 'row', gap: 8 },
  fullBtn: { backgroundColor: 'rgba(12,18,28,0.85)', borderWidth: 1, borderColor: LINE, borderRadius: 999, paddingHorizontal: 12, paddingVertical: 7 },
  fullBtnText: { color: TEXT, fontWeight: '700', fontSize: 12 },
  tab: { flex: 1, alignItems: 'center', paddingVertical: 8, borderRadius: 10, borderWidth: 1, borderColor: LINE },
  tabOn: { backgroundColor: ACCENT, borderColor: ACCENT },
  tabText: { color: TEXT, fontWeight: '700', fontSize: 13 },
  err: { color: '#fca5a5', paddingHorizontal: 14, paddingVertical: 8, lineHeight: 19 },
  previewErr: { margin: 8, padding: 10, borderRadius: 10, backgroundColor: 'rgba(127,29,29,0.5)' },
  mono: { fontFamily: Platform.select({ ios: 'Menlo', default: 'monospace' }), fontSize: 11, color: '#fecaca' },
  bubble: { borderRadius: 12, padding: 10, maxWidth: '92%' },
  bubbleUser: { alignSelf: 'flex-end', backgroundColor: 'rgba(99,102,241,0.25)' },
  bubbleAi: { alignSelf: 'flex-start', borderWidth: 1, borderColor: LINE },
  chip: { borderWidth: 1, borderColor: LINE, borderRadius: 999, paddingHorizontal: 12, minHeight: 40, justifyContent: 'center' },
  composer: { flexDirection: 'row', alignItems: 'flex-end', gap: 8, paddingHorizontal: 12, paddingTop: 8, borderTopWidth: 1, borderTopColor: LINE, backgroundColor: BAR },
  input: { flex: 1, minHeight: 44, maxHeight: 140, borderWidth: 1, borderColor: LINE, borderRadius: 12, paddingHorizontal: 12, paddingVertical: 10, color: TEXT },
  send: { backgroundColor: ACCENT, borderRadius: 12, paddingHorizontal: 16, paddingVertical: 12 },
  fileRow: { flexDirection: 'row', alignItems: 'center', gap: 2, minHeight: 44, paddingRight: 14 },
});
