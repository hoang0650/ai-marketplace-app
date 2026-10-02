import React, { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Alert, Image, Linking, Platform, Pressable, ScrollView, StyleSheet, Switch, Text, TextInput, View } from 'react-native';
import * as WebBrowser from 'expo-web-browser';
import * as ExpoLinking from 'expo-linking';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { builderApi } from '@/api';
import type { BuilderProject, BuilderProjectGit, GitPushBody, GitPushResult } from '@/api/types';
import { getErrorMessage } from '@/lib/errors';
import { useT } from '@/hooks/useT';

const BG = '#0b0f17';
const LINE = '#1c2a3a';
const ACCENT = '#3dffb0';
const TEXT = '#e5e7eb';
const MUTED = 'rgba(229,231,235,0.6)';
const TOKEN_URL = 'https://github.com/settings/tokens/new?scopes=repo&description=AI%20Markets%20Builder';

/** Connect ids already claimed (the redirect can reach both the auth session and the router). */
const claimed = new Set<string>();

function slug(name: string) {
  return (
    name
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/đ/gi, 'd')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 80) || 'aimarkets-project'
  );
}

type Props = {
  project: BuilderProject;
  busy: boolean;
  onGit: (git: BuilderProjectGit | null) => void;
  /** `git_connect` / `git_error` when the OAuth redirect opened this screen. */
  connectId?: string;
  connectError?: string;
};

export function GitPanel({ project, busy, onGit, connectId, connectError }: Props) {
  const { t, language } = useT();
  const qc = useQueryClient();
  const status = useQuery({ queryKey: ['builder-git'], queryFn: builderApi.gitStatus });
  const conn = status.data?.connections.find((c) => c.provider === 'github') || null;
  const connected = conn?.status === 'active';
  const oauth = !!status.data?.providers.find((p) => p.id === 'github')?.oauth;

  const [working, setWorking] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [token, setToken] = useState('');
  const [mode, setMode] = useState<'new' | 'existing'>('new');
  const [repoName, setRepoName] = useState(() => slug(project.name));
  const [isPrivate, setIsPrivate] = useState(true);
  const [repoFull, setRepoFull] = useState('');
  const [branch, setBranch] = useState('');
  const [message, setMessage] = useState('');
  const [result, setResult] = useState<GitPushResult | null>(null);
  const handled = useRef('');

  const repos = useQuery({
    queryKey: ['builder-git-repos'],
    queryFn: builderApi.gitRepos,
    enabled: connected && mode === 'existing' && !project.git,
  });

  const canPush =
    (project.files?.length || project.fileCount) > 0 && (project.version > 0 || !!project.lastGeneratedAt || !!project.template);
  const pending = !!project.git && project.version > (project.git.lastPushedVersion || 0);

  const fail = (e: unknown) => setError(getErrorMessage(e, language));
  const errText = (code: string) => {
    const key = `builder.git.err.${code}`;
    const text = t(key);
    return text && text !== key ? text : t('builder.git.err.GIT_ERROR');
  };

  const claim = async (id: string) => {
    if (!id || claimed.has(id)) return;
    claimed.add(id);
    try {
      await builderApi.gitOAuthComplete(id);
      setNotice(t('builder.git.connectedOk'));
      setError('');
    } catch (e) {
      fail(e);
    } finally {
      void qc.invalidateQueries({ queryKey: ['builder-git'] });
    }
  };

  useEffect(() => {
    const key = `${connectId || ''}|${connectError || ''}`;
    if (key === '|' || handled.current === key) return;
    handled.current = key;
    if (connectId) void claim(connectId);
    else if (connectError) setError(errText(connectError));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [connectId, connectError]);

  const connectOAuth = async () => {
    setWorking(true);
    setError('');
    try {
      const returnTo = ExpoLinking.createURL(`/builder/${project.id}`);
      const { url } = await builderApi.gitOAuthStart(returnTo);
      const res = await WebBrowser.openAuthSessionAsync(url, returnTo);
      if (res.type === 'success' && res.url) {
        const params = ExpoLinking.parse(res.url).queryParams || {};
        const id = typeof params.git_connect === 'string' ? params.git_connect : '';
        const err = typeof params.git_error === 'string' ? params.git_error : '';
        if (id) await claim(id);
        else if (err) setError(errText(err));
      }
    } catch (e) {
      fail(e);
    } finally {
      setWorking(false);
    }
  };

  const connectToken = async () => {
    const value = token.trim();
    if (!value) return;
    setWorking(true);
    setError('');
    try {
      await builderApi.gitConnectToken(value);
      setToken('');
      setNotice(t('builder.git.connectedOk'));
      void qc.invalidateQueries({ queryKey: ['builder-git'] });
    } catch (e) {
      fail(e);
    } finally {
      setWorking(false);
    }
  };

  const disconnect = () => {
    Alert.alert('', t('builder.git.confirmDisconnect'), [
      { text: t('common.cancel'), style: 'cancel' },
      {
        text: t('builder.git.disconnect'),
        style: 'destructive',
        onPress: async () => {
          try {
            await builderApi.gitDisconnect();
            setResult(null);
            setNotice('');
            qc.removeQueries({ queryKey: ['builder-git-repos'] });
            void qc.invalidateQueries({ queryKey: ['builder-git'] });
          } catch (e) {
            fail(e);
          }
        },
      },
    ]);
  };

  const unlink = () => {
    Alert.alert('', t('builder.git.confirmUnlink'), [
      { text: t('common.cancel'), style: 'cancel' },
      {
        text: t('builder.git.changeRepo'),
        onPress: async () => {
          try {
            await builderApi.gitUnlink(project.id);
            setResult(null);
            onGit(null);
          } catch (e) {
            fail(e);
          }
        },
      },
    ]);
  };

  const push = async (body: GitPushBody) => {
    if (working) return;
    setWorking(true);
    setError('');
    setNotice('');
    setResult(null);
    try {
      const r = await builderApi.gitPush(project.id, { ...body, message: message.trim() || undefined });
      setMessage('');
      setResult(r);
      onGit(r.git);
    } catch (e) {
      fail(e);
      void qc.invalidateQueries({ queryKey: ['builder-git'] });
    } finally {
      setWorking(false);
    }
  };

  const pushFirst = () => {
    if (mode === 'new') void push({ create: { name: repoName.trim(), private: isPrivate } });
    else if (repoFull) void push({ repo: repoFull, branch: branch.trim() || undefined });
  };

  const disabled = working || busy;
  const picked = repos.data?.repos.find((r) => r.fullName === repoFull);

  return (
    <ScrollView contentContainerStyle={{ padding: 12, gap: 12 }} keyboardShouldPersistTaps="handled">
      <Text style={styles.title}>{t('builder.git.title')}</Text>
      <Text style={styles.muted}>{t('builder.git.hint')}</Text>
      {error ? <Text style={styles.err}>{error}</Text> : null}
      {notice ? <Text style={styles.ok}>{notice}</Text> : null}

      {status.isLoading ? (
        <ActivityIndicator color={ACCENT} />
      ) : !connected ? (
        <View style={{ gap: 12 }}>
          {conn?.status === 'invalid' ? <Text style={styles.warn}>{t('builder.git.invalid')}</Text> : null}
          {oauth ? (
            <Pressable disabled={disabled} onPress={() => void connectOAuth()} style={[styles.primary, disabled && styles.off]}>
              <Text style={styles.primaryText}>{working ? t('builder.git.connecting') : t('builder.git.connect')}</Text>
            </Pressable>
          ) : (
            <Text style={styles.muted}>{t('builder.git.oauthOff')}</Text>
          )}
          <View style={styles.card}>
            <Text style={styles.label}>{t('builder.git.tokenTitle')}</Text>
            <TextInput
              value={token}
              onChangeText={setToken}
              secureTextEntry
              autoCapitalize="none"
              autoCorrect={false}
              placeholder="ghp_… / github_pat_…"
              placeholderTextColor={MUTED}
              style={styles.input}
            />
            <Text style={[styles.muted, { fontSize: 11 }]}>{t('builder.git.tokenNote')}</Text>
            <View style={styles.row}>
              <Pressable disabled={disabled || !token.trim()} onPress={() => void connectToken()} style={[styles.secondary, (disabled || !token.trim()) && styles.off]}>
                <Text style={styles.secondaryText}>{t('builder.git.tokenSave')}</Text>
              </Pressable>
              <Pressable onPress={() => void Linking.openURL(TOKEN_URL)}>
                <Text style={styles.link}>{t('builder.git.tokenCreate')}</Text>
              </Pressable>
            </View>
          </View>
        </View>
      ) : (
        <View style={{ gap: 12 }}>
          <View style={styles.row}>
            {conn?.avatarUrl ? <Image source={{ uri: conn.avatarUrl }} style={{ width: 22, height: 22, borderRadius: 11 }} /> : null}
            <Text style={{ color: TEXT, flex: 1 }}>{t('builder.git.connectedAs', { login: conn?.login || '' })}</Text>
            <Pressable onPress={disconnect} hitSlop={8}>
              <Text style={{ color: '#fca5a5' }}>{t('builder.git.disconnect')}</Text>
            </Pressable>
          </View>

          {!canPush ? (
            <Text style={styles.warn}>{t('builder.git.needBuild')}</Text>
          ) : project.git ? (
            <View style={{ gap: 10 }}>
              <View style={styles.card}>
                <Pressable onPress={() => void Linking.openURL(project.git!.repoUrl)}>
                  <Text style={[styles.mono, styles.link]}>{project.git.fullName}</Text>
                </Pressable>
                <Text style={styles.muted}>
                  {t(project.git.private ? 'builder.git.private' : 'builder.git.public')} · {project.git.branch}
                </Text>
                {project.git.lastCommitSha ? (
                  <Pressable onPress={() => void Linking.openURL(project.git!.lastCommitUrl)}>
                    <Text style={styles.muted}>
                      {t('builder.git.lastPush', { version: project.git.lastPushedVersion })}{' '}
                      <Text style={[styles.mono, styles.link]}>{project.git.lastCommitSha.slice(0, 7)}</Text>
                    </Text>
                  </Pressable>
                ) : null}
                <Text style={pending ? styles.warn : styles.muted}>
                  {t(pending ? 'builder.git.pending' : 'builder.git.upToDate', { version: project.version })}
                </Text>
              </View>
              <TextInput
                value={message}
                onChangeText={setMessage}
                maxLength={200}
                placeholder={t('builder.git.messagePh')}
                placeholderTextColor={MUTED}
                style={styles.input}
              />
              <Pressable disabled={disabled} onPress={() => void push({})} style={[styles.primary, disabled && styles.off]}>
                <Text style={styles.primaryText}>{working ? t('builder.git.pushing') : t('builder.git.pushVersion', { version: project.version })}</Text>
              </Pressable>
              <Pressable disabled={working} onPress={unlink}>
                <Text style={[styles.link, { textAlign: 'center' }]}>{t('builder.git.changeRepo')}</Text>
              </Pressable>
            </View>
          ) : (
            <View style={{ gap: 10 }}>
              <View style={styles.tabs}>
                {(['new', 'existing'] as const).map((m) => (
                  <Pressable key={m} onPress={() => setMode(m)} style={[styles.tab, mode === m && styles.tabOn]}>
                    <Text style={{ color: mode === m ? BG : TEXT, fontWeight: '700', fontSize: 12 }}>{t(`builder.git.mode.${m}`)}</Text>
                  </Pressable>
                ))}
              </View>
              {mode === 'new' ? (
                <>
                  <Text style={styles.label}>{t('builder.git.repoName')}</Text>
                  <TextInput value={repoName} onChangeText={setRepoName} autoCapitalize="none" autoCorrect={false} maxLength={100} style={[styles.input, styles.mono]} />
                  <View style={styles.row}>
                    <Switch value={isPrivate} onValueChange={setIsPrivate} />
                    <Text style={{ color: TEXT }}>{t('builder.git.makePrivate')}</Text>
                  </View>
                </>
              ) : (
                <>
                  <Text style={styles.label}>{t('builder.git.pickRepo')}</Text>
                  {repos.isLoading ? (
                    <ActivityIndicator color={ACCENT} />
                  ) : repos.data?.repos.length ? (
                    <View style={{ gap: 6 }}>
                      {repos.data.repos.slice(0, 50).map((r) => (
                        <Pressable
                          key={r.fullName}
                          onPress={() => {
                            setRepoFull(r.fullName);
                            setBranch('');
                          }}
                          style={[styles.repo, repoFull === r.fullName && { borderColor: ACCENT }]}
                        >
                          <Text style={[styles.mono, { color: TEXT }]} numberOfLines={1}>
                            {r.fullName}
                            {r.private ? ' 🔒' : ''}
                          </Text>
                        </Pressable>
                      ))}
                    </View>
                  ) : (
                    <Text style={styles.muted}>{repos.isError ? getErrorMessage(repos.error, language) : t('builder.git.noRepos')}</Text>
                  )}
                  <Text style={styles.label}>{t('builder.git.branch')}</Text>
                  <TextInput
                    value={branch}
                    onChangeText={setBranch}
                    autoCapitalize="none"
                    autoCorrect={false}
                    maxLength={100}
                    placeholder={picked?.defaultBranch || 'main'}
                    placeholderTextColor={MUTED}
                    style={[styles.input, styles.mono]}
                  />
                  <Text style={[styles.muted, { fontSize: 11 }]}>{t('builder.git.existingNote')}</Text>
                </>
              )}
              <TextInput
                value={message}
                onChangeText={setMessage}
                maxLength={200}
                placeholder={t('builder.git.messagePh')}
                placeholderTextColor={MUTED}
                style={styles.input}
              />
              {(() => {
                const off = disabled || (mode === 'new' ? !repoName.trim() : !repoFull);
                return (
                  <Pressable disabled={off} onPress={pushFirst} style={[styles.primary, off && styles.off]}>
                    <Text style={styles.primaryText}>{working ? t('builder.git.pushing') : t('builder.git.push')}</Text>
                  </Pressable>
                );
              })()}
            </View>
          )}

          {result ? (
            <Pressable onPress={() => void Linking.openURL(result.commit.unchanged ? result.repo.url : result.commit.url)}>
              <Text style={styles.ok}>
                {t(result.commit.unchanged ? 'builder.git.unchanged' : result.repo.created ? 'builder.git.created' : 'builder.git.pushed', {
                  repo: result.repo.fullName,
                })}{' '}
                <Text style={styles.link}>{t(result.commit.unchanged ? 'builder.git.openRepo' : 'builder.git.openCommit')}</Text>
              </Text>
            </Pressable>
          ) : null}
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  title: { color: TEXT, fontWeight: '800', fontSize: 16 },
  muted: { color: MUTED, lineHeight: 19 },
  label: { color: TEXT, fontWeight: '700', fontSize: 13 },
  err: { color: '#fca5a5', lineHeight: 19 },
  ok: { color: '#86efac', lineHeight: 19 },
  warn: { color: '#fcd34d', lineHeight: 19 },
  link: { color: ACCENT, fontWeight: '700' },
  mono: { fontFamily: Platform.select({ ios: 'Menlo', default: 'monospace' }), fontSize: 12 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  card: { gap: 8, padding: 12, borderRadius: 12, borderWidth: 1, borderColor: LINE },
  input: { borderWidth: 1, borderColor: LINE, borderRadius: 12, paddingHorizontal: 12, paddingVertical: 10, color: TEXT },
  primary: { backgroundColor: ACCENT, borderRadius: 12, paddingVertical: 12, alignItems: 'center' },
  primaryText: { color: BG, fontWeight: '800' },
  secondary: { borderWidth: 1, borderColor: ACCENT, borderRadius: 12, paddingVertical: 10, paddingHorizontal: 14 },
  secondaryText: { color: ACCENT, fontWeight: '700' },
  off: { opacity: 0.4 },
  tabs: { flexDirection: 'row', gap: 6 },
  tab: { flex: 1, alignItems: 'center', paddingVertical: 8, borderRadius: 10, borderWidth: 1, borderColor: LINE },
  tabOn: { backgroundColor: ACCENT, borderColor: ACCENT },
  repo: { paddingVertical: 10, paddingHorizontal: 12, borderRadius: 10, borderWidth: 1, borderColor: LINE },
});
