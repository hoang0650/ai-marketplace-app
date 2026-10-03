import React, { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Alert, Image, Linking, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import * as WebBrowser from 'expo-web-browser';
import * as ExpoLinking from 'expo-linking';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { builderApi } from '@/api';
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

/** GitHub connection shared by project push and template import (one per user). */
export function useGitConnection() {
  const status = useQuery({ queryKey: ['builder-git'], queryFn: builderApi.gitStatus });
  const conn = status.data?.connections.find((c) => c.provider === 'github') || null;
  return {
    status,
    conn,
    connected: conn?.status === 'active',
    oauth: !!status.data?.providers.find((p) => p.id === 'github')?.oauth,
  };
}

type Props = {
  /** App route GitHub OAuth returns to, e.g. `/builder/123`. */
  returnPath: string;
  /** `git_connect` / `git_error` when the OAuth redirect opened the screen. */
  connectId?: string;
  connectError?: string;
  disabled?: boolean;
  onError: (message: string) => void;
  onNotice: (message: string) => void;
  onDisconnected?: () => void;
};

/** "Connect GitHub" (OAuth or personal access token) or "Connected as @login · Disconnect". */
export function GitConnect({ returnPath, connectId, connectError, disabled = false, onError, onNotice, onDisconnected }: Props) {
  const { t, language } = useT();
  const qc = useQueryClient();
  const { status, conn, connected, oauth } = useGitConnection();
  const [working, setWorking] = useState(false);
  const [token, setToken] = useState('');
  const handled = useRef('');

  const fail = (e: unknown) => onError(getErrorMessage(e, language));
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
      onError('');
      onNotice(t('builder.git.connectedOk'));
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
    else if (connectError) onError(errText(connectError));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [connectId, connectError]);

  const connectOAuth = async () => {
    setWorking(true);
    onError('');
    try {
      const returnTo = ExpoLinking.createURL(returnPath);
      const { url } = await builderApi.gitOAuthStart(returnTo);
      const res = await WebBrowser.openAuthSessionAsync(url, returnTo);
      if (res.type === 'success' && res.url) {
        const params = ExpoLinking.parse(res.url).queryParams || {};
        const id = typeof params.git_connect === 'string' ? params.git_connect : '';
        const err = typeof params.git_error === 'string' ? params.git_error : '';
        if (id) await claim(id);
        else if (err) onError(errText(err));
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
    onError('');
    try {
      await builderApi.gitConnectToken(value);
      setToken('');
      onNotice(t('builder.git.connectedOk'));
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
            onNotice('');
            onDisconnected?.();
            qc.removeQueries({ queryKey: ['builder-git-repos'] });
            void qc.invalidateQueries({ queryKey: ['builder-git'] });
          } catch (e) {
            fail(e);
          }
        },
      },
    ]);
  };

  const off = working || disabled;

  if (status.isLoading) return <ActivityIndicator color={ACCENT} />;

  if (connected) {
    return (
      <View style={styles.row}>
        {conn?.avatarUrl ? <Image source={{ uri: conn.avatarUrl }} style={{ width: 22, height: 22, borderRadius: 11 }} /> : null}
        <Text style={{ color: TEXT, flex: 1 }}>{t('builder.git.connectedAs', { login: conn?.login || '' })}</Text>
        <Pressable onPress={disconnect} hitSlop={8}>
          <Text style={{ color: '#fca5a5' }}>{t('builder.git.disconnect')}</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <View style={{ gap: 12 }}>
      {conn?.status === 'invalid' ? <Text style={styles.warn}>{t('builder.git.invalid')}</Text> : null}
      {oauth ? (
        <Pressable disabled={off} onPress={() => void connectOAuth()} style={[styles.primary, off && styles.off]}>
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
          <Pressable disabled={off || !token.trim()} onPress={() => void connectToken()} style={[styles.secondary, (off || !token.trim()) && styles.off]}>
            <Text style={styles.secondaryText}>{t('builder.git.tokenSave')}</Text>
          </Pressable>
          <Pressable onPress={() => void Linking.openURL(TOKEN_URL)}>
            <Text style={styles.link}>{t('builder.git.tokenCreate')}</Text>
          </Pressable>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  muted: { color: MUTED, lineHeight: 19 },
  label: { color: TEXT, fontWeight: '700', fontSize: 13 },
  warn: { color: '#fcd34d', lineHeight: 19 },
  link: { color: ACCENT, fontWeight: '700' },
  row: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  card: { gap: 8, padding: 12, borderRadius: 12, borderWidth: 1, borderColor: LINE },
  input: { borderWidth: 1, borderColor: LINE, borderRadius: 12, paddingHorizontal: 12, paddingVertical: 10, color: TEXT },
  primary: { backgroundColor: ACCENT, borderRadius: 12, paddingVertical: 12, alignItems: 'center' },
  primaryText: { color: BG, fontWeight: '800' },
  secondary: { borderWidth: 1, borderColor: ACCENT, borderRadius: 12, paddingVertical: 10, paddingHorizontal: 14 },
  secondaryText: { color: ACCENT, fontWeight: '700' },
  off: { opacity: 0.4 },
});
