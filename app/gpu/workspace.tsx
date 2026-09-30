import React, { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { WebView } from 'react-native-webview';
import { useKeepAwake } from 'expo-keep-awake';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { gpuRentalApi } from '@/api';
import { API_CONFIG } from '@/api/client';
import { ApiError, getErrorMessage } from '@/lib/errors';
import { href } from '@/lib/href';
import { useAuth } from '@/hooks/useAuth';
import { useT } from '@/hooks/useT';
import { LoginPrompt } from '@/components/ui/LoginPrompt';
import { Button } from '@/components/ui/Button';

function apiOrigin(): string {
  const m = API_CONFIG.BASE_URL.match(/^(https?:\/\/[^/]+)/i);
  return m ? m[1] : API_CONFIG.BASE_URL;
}

export default function GpuWorkspaceScreen() {
  useKeepAwake();
  const { id, target } = useLocalSearchParams<{ id: string; target?: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { isAuthenticated } = useAuth();
  const { t, language } = useT();
  const [uri, setUri] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const mode: 'lab' | 'terminal' = target === 'terminal' ? 'terminal' : 'lab';

  const connect = useCallback(async () => {
    setError('');
    setLoading(true);
    setUri('');
    try {
      const res = await gpuRentalApi.open(String(id || ''), mode);
      setUri(`${apiOrigin()}${res.path}`);
    } catch (e) {
      const code = e instanceof ApiError ? e.code : '';
      const key = `gpu.err.${code}`;
      const msg = code ? t(key) : '';
      setError(msg && msg !== key ? msg : getErrorMessage(e, language));
      setLoading(false);
    }
  }, [id, mode, t, language]);

  useEffect(() => {
    if (isAuthenticated) void connect();
  }, [isAuthenticated, connect]);

  const leave = () => {
    if (router.canGoBack()) router.back();
    else router.replace(href('/gpu'));
  };

  if (!isAuthenticated) return <LoginPrompt />;

  return (
    <View style={styles.bg}>
      <Stack.Screen options={{ headerShown: false }} />
      <View style={[styles.bar, { paddingTop: Math.max(insets.top, 8) }]}>
        <Pressable onPress={leave} hitSlop={12}>
          <Text style={styles.barBtn}>← {t('common.back')}</Text>
        </Pressable>
        <Text style={styles.barTitle}>{mode === 'terminal' ? 'Terminal' : 'JupyterLab'}</Text>
        <Pressable onPress={() => void connect()} hitSlop={12}>
          <Text style={styles.barBtn}>{t('common.retry')}</Text>
        </Pressable>
      </View>
      {uri ? (
        <WebView
          source={{ uri }}
          style={styles.fill}
          originWhitelist={['https://*', 'http://*']}
          javaScriptEnabled
          domStorageEnabled
          sharedCookiesEnabled
          thirdPartyCookiesEnabled
          setSupportMultipleWindows={false}
          allowsBackForwardNavigationGestures={false}
          keyboardDisplayRequiresUserAction={false}
          hideKeyboardAccessoryView={false}
          onLoadEnd={() => setLoading(false)}
          onError={(e) => {
            setLoading(false);
            setError(e.nativeEvent.description || t('gpu.err.PROVIDER_ERROR'));
          }}
        />
      ) : null}
      {loading && !error ? (
        <View style={styles.overlay} pointerEvents="none">
          <ActivityIndicator color="#3dffb0" size="large" />
          <Text style={styles.hint}>{t('gpu.rent.connecting')}</Text>
        </View>
      ) : null}
      {error ? (
        <View style={[styles.overlay, { backgroundColor: '#0b0f17' }]}>
          <Text style={styles.err}>{error}</Text>
          <View style={{ flexDirection: 'row', gap: 8, marginTop: 16 }}>
            <Button title={t('common.retry')} onPress={() => void connect()} />
            <Button title={t('common.back')} variant="outline" onPress={leave} />
          </View>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  bg: { flex: 1, backgroundColor: '#0b0f17' },
  fill: { flex: 1, backgroundColor: '#0b0f17' },
  bar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 14,
    paddingBottom: 10,
    backgroundColor: '#0c121c',
    borderBottomWidth: 1,
    borderBottomColor: '#1c2a3a',
  },
  barBtn: { color: '#3dffb0', fontWeight: '700', fontSize: 14 },
  barTitle: { color: '#e5e7eb', fontWeight: '800', fontSize: 15 },
  overlay: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    top: 56,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
    gap: 12,
  },
  hint: { color: 'rgba(255,255,255,0.82)', fontWeight: '600' },
  err: { color: 'rgba(255,255,255,0.9)', textAlign: 'center', lineHeight: 21 },
});
