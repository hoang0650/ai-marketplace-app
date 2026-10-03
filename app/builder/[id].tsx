import React, { useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
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

const BG = '#0b0f17';
const BAR = '#0c121c';
const LINE = '#1c2a3a';
const ACCENT = '#3dffb0';
const TEXT = '#e5e7eb';
const MUTED = 'rgba(229,231,235,0.6)';

type Tab = 'preview' | 'chat' | 'code' | 'git';

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
  const started = useRef(false);
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
  const file = project?.files?.find((f) => f.path === openFile);
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
        <Pressable onPress={leave} hitSlop={12}>
          <Text style={styles.barBtn}>← {t('common.back')}</Text>
        </Pressable>
        <Text style={styles.barTitle} numberOfLines={1}>
          {project?.name || t('builder.title')}
        </Text>
        {tab === 'preview' && project ? (
          <Pressable onPress={() => setExpanded(true)} hitSlop={12}>
            <Text style={styles.barBtn}>{t('builder.expand')}</Text>
          </Pressable>
        ) : null}
        <Pressable onPress={() => setNonce((n) => n + 1)} hitSlop={12}>
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

      <View style={styles.tabs}>
        {(['preview', 'chat', 'code', 'git'] as Tab[]).map((k) => (
          <Pressable key={k} onPress={() => setTab(k)} style={[styles.tab, tab === k && styles.tabOn]}>
            <Text style={[styles.tabText, tab === k && { color: BG }]}>{t(`builder.tab.${k}`)}</Text>
          </Pressable>
        ))}
      </View>

      {error ? <Text style={styles.err}>{error}</Text> : null}
      {previewError && tab !== 'code' ? (
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
          <View style={[styles.composer, { paddingBottom: Math.max(insets.bottom, 10) }]}>
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
      ) : (
        <ScrollView contentContainerStyle={{ padding: 12, gap: 6 }}>
          {(project.files || []).map((f) => (
            <View key={f.path}>
              <Pressable onPress={() => setOpenFile(openFile === f.path ? '' : f.path)} style={styles.fileRow}>
                <Text style={[styles.mono, { color: TEXT }]}>{f.path}</Text>
                <Text style={{ color: MUTED, fontSize: 12 }}>{openFile === f.path ? '▾' : '▸'}</Text>
              </Pressable>
              {file && openFile === f.path ? (
                <ScrollView horizontal style={styles.code}>
                  <Text selectable style={[styles.mono, { color: TEXT }]}>
                    {file.content}
                  </Text>
                </ScrollView>
              ) : null}
            </View>
          ))}
          <Text style={{ color: MUTED, fontSize: 12, marginTop: 8, lineHeight: 18 }}>{t('builder.codeMobileHint')}</Text>
        </ScrollView>
      )}
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
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
  chip: { borderWidth: 1, borderColor: LINE, borderRadius: 999, paddingHorizontal: 10, paddingVertical: 5 },
  composer: { flexDirection: 'row', alignItems: 'flex-end', gap: 8, paddingHorizontal: 12, paddingTop: 8, borderTopWidth: 1, borderTopColor: LINE, backgroundColor: BAR },
  input: { flex: 1, minHeight: 44, maxHeight: 140, borderWidth: 1, borderColor: LINE, borderRadius: 12, paddingHorizontal: 12, paddingVertical: 10, color: TEXT },
  send: { backgroundColor: ACCENT, borderRadius: 12, paddingHorizontal: 16, paddingVertical: 12 },
  fileRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 10, paddingHorizontal: 10, borderWidth: 1, borderColor: LINE, borderRadius: 10 },
  code: { marginTop: 6, padding: 10, borderRadius: 10, backgroundColor: 'rgba(0,0,0,0.4)', maxHeight: 420 },
});
