import React, { useCallback, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Pressable, StatusBar, StyleSheet, Text, View } from 'react-native';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { useKeepAwake } from 'expo-keep-awake';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { gameSessionsApi } from '@/api';
import { ApiError, getErrorMessage } from '@/lib/errors';
import { gamePlayerUrl } from '@/lib/stream-player';
import { href } from '@/lib/href';
import { useAuth } from '@/hooks/useAuth';
import { useT } from '@/hooks/useT';
import { useAuthStore } from '@/stores/authStore';
import { GpuStreamPlayer } from '@/components/compute/GpuStreamPlayer';
import { LoginPrompt } from '@/components/ui/LoginPrompt';
import { Button } from '@/components/ui/Button';

async function lockLandscape() {
  try {
    const SO = await import('expo-screen-orientation');
    await SO.unlockAsync();
    await SO.lockAsync(SO.OrientationLock.LANDSCAPE);
  } catch {
    /* web / missing native module */
  }
}

async function lockPortrait() {
  try {
    const SO = await import('expo-screen-orientation');
    await SO.lockAsync(SO.OrientationLock.PORTRAIT_UP);
  } catch {
    /* web / missing native module */
  }
}

export default function GpuPlayScreen() {
  useKeepAwake();
  const { slug } = useLocalSearchParams<{ slug: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { isAuthenticated, isInitialized } = useAuth();
  const { t, language } = useT();
  const [uri, setUri] = useState('');
  const [ready, setReady] = useState(false);
  const [error, setError] = useState('');
  const [errorCode, setErrorCode] = useState('');
  const [attempt, setAttempt] = useState(0);
  const sessionRef = useRef('');

  const stopSession = useCallback(async () => {
    const id = sessionRef.current;
    sessionRef.current = '';
    if (!id) return;
    try {
      await gameSessionsApi.stop(id);
    } catch {
      /* billed on server if this fails later */
    }
  }, []);

  useEffect(() => {
    void lockLandscape();
    return () => {
      void lockPortrait();
    };
  }, []);

  useEffect(() => {
    if (!isInitialized || !isAuthenticated) return;
    const productSlug = String(slug || '').trim().toLowerCase();
    if (!productSlug) {
      setError(t('compute.play.missingTarget'));
      return;
    }
    let cancelled = false;
    setError('');
    setErrorCode('');
    setReady(false);
    setUri('');
    void (async () => {
      try {
        const sess = await gameSessionsApi.start(productSlug);
        if (cancelled) {
          await gameSessionsApi.stop(sess.sessionId).catch(() => {});
          return;
        }
        sessionRef.current = sess.sessionId;
        const token = useAuthStore.getState().token || '';
        setUri(gamePlayerUrl(sess, token));
      } catch (e) {
        if (cancelled) return;
        const code = e instanceof ApiError ? e.code : '';
        setErrorCode(code);
        if (code === 'INSUFFICIENT_BALANCE') setError(t('compute.play.needWallet'));
        else if (code === 'NO_COMPUTE_NODE') setError(t('compute.play.noNode'));
        else setError(getErrorMessage(e, language) || t('compute.play.startFailed'));
      }
    })();
    return () => {
      cancelled = true;
      void stopSession();
    };
  }, [isInitialized, isAuthenticated, slug, language, stopSession, t, attempt]);

  const leave = () => {
    void stopSession();
    if (router.canGoBack()) router.back();
    else router.replace(href(`/product/${slug}`));
  };

  if (!isInitialized) {
    return (
      <View style={styles.center}>
        <Stack.Screen options={{ headerShown: false, animation: 'fade' }} />
        <ActivityIndicator color="#3dffb0" />
      </View>
    );
  }

  if (!isAuthenticated) {
    return (
      <View style={styles.bg}>
        <Stack.Screen options={{ headerShown: false }} />
        <LoginPrompt />
      </View>
    );
  }

  return (
    <View style={styles.bg}>
      <Stack.Screen options={{ headerShown: false, gestureEnabled: true, animation: 'fade' }} />
      <StatusBar hidden />
      {uri ? <GpuStreamPlayer uri={uri} onLoad={() => setReady(true)} onError={(m) => setError(m)} /> : null}
      {(!ready || error) && (
        <View style={[styles.overlay, { paddingTop: Math.max(insets.top, 12), paddingBottom: Math.max(insets.bottom, 12) }]} pointerEvents={error ? 'auto' : 'box-none'}>
          <Pressable onPress={leave} hitSlop={12} style={[styles.back, { left: Math.max(insets.left, 12) }]}>
            <Text style={styles.backText}>{t('compute.play.stop')}</Text>
          </Pressable>
          {error ? (
            <View style={styles.errBox}>
              <Text style={styles.errTitle}>{t('common.error')}</Text>
              <Text style={styles.err}>{error}</Text>
              <View style={{ flexDirection: 'row', gap: 8, marginTop: 16 }}>
                {errorCode === 'INSUFFICIENT_BALANCE' ? (
                  <Button title={t('playground.topUp')} onPress={() => router.push('/wallet')} />
                ) : (
                  <Button title={t('common.retry')} onPress={() => setAttempt((n) => n + 1)} />
                )}
                <Button title={t('compute.play.backProduct')} variant="outline" onPress={leave} />
              </View>
            </View>
          ) : (
            <View style={styles.loading}>
              <ActivityIndicator color="#3dffb0" size="large" />
              <Text style={styles.hint}>{t('compute.play.connecting')}</Text>
            </View>
          )}
        </View>
      )}
      {ready && !error ? (
        <Pressable
          onPress={leave}
          hitSlop={12}
          style={[styles.back, { top: Math.max(insets.top, 8), left: Math.max(insets.left, 12) }]}
        >
          <Text style={styles.backText}>{t('compute.play.stop')}</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  bg: { flex: 1, backgroundColor: '#000' },
  center: { flex: 1, backgroundColor: '#000', alignItems: 'center', justifyContent: 'center' },
  overlay: { ...StyleSheet.absoluteFill, backgroundColor: 'rgba(0,0,0,0.55)' },
  loading: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12 },
  hint: { color: 'rgba(255,255,255,0.82)', fontWeight: '600' },
  back: {
    position: 'absolute',
    top: 12,
    zIndex: 4,
    backgroundColor: 'rgba(0,0,0,0.55)',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.22)',
  },
  backText: { color: '#fff', fontWeight: '800', letterSpacing: 0.4, fontSize: 12, textTransform: 'uppercase' },
  errBox: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 24 },
  errTitle: { color: '#fff', fontWeight: '800', fontSize: 16 },
  err: { color: 'rgba(255,255,255,0.82)', marginTop: 8, textAlign: 'center' },
});
