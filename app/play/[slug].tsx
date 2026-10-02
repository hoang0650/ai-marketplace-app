import React, { useCallback, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, AppState, Linking, Pressable, StatusBar, StyleSheet, Text, View } from 'react-native';
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
import type { GameHeartbeat } from '@/api/types';

const STOP_REASONS = new Set(['idle', 'insufficient_funds', 'switched_device', 'slot_reclaimed', 'user']);
const WEB_ORIGIN = 'https://aimarkets.vn';

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
  const [terminal, setTerminal] = useState(false);
  const [error, setError] = useState('');
  const [errorCode, setErrorCode] = useState('');
  const [attempt, setAttempt] = useState(0);
  const [heartbeatMs, setHeartbeatMs] = useState(30_000);
  const [bill, setBill] = useState<GameHeartbeat | null>(null);
  const sessionRef = useRef('');

  /** Mobile stream keep-alive; paused in background so idle sessions auto-stop and stop billing. */
  useEffect(() => {
    if (!uri) return;
    let active = AppState.currentState === 'active';
    const beat = async () => {
      const id = sessionRef.current;
      if (!id || !active) return;
      try {
        setBill(await gameSessionsApi.heartbeat(id));
      } catch (e) {
        if (!(e instanceof ApiError) || (e.status !== 410 && e.status !== 404)) return;
        const reason = String(e.details?.stopReason || '');
        sessionRef.current = '';
        setUri('');
        setErrorCode('SESSION_STOPPED');
        setError(t(`compute.play.stopped.${STOP_REASONS.has(reason) ? reason : 'user'}`));
      }
    };
    void beat();
    const timer = setInterval(() => void beat(), Math.max(10_000, heartbeatMs));
    const sub = AppState.addEventListener('change', (next) => {
      active = next === 'active';
      if (active) void beat();
    });
    return () => {
      clearInterval(timer);
      sub.remove();
    };
  }, [uri, heartbeatMs, t]);

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
    if (!uri) return;
    if (terminal) void lockPortrait();
    else void lockLandscape();
    return () => {
      void lockPortrait();
    };
  }, [uri, terminal]);

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
    setTerminal(false);
    setBill(null);
    void (async () => {
      try {
        const sess = await gameSessionsApi.start(productSlug);
        if (cancelled) {
          await gameSessionsApi.stop(sess.sessionId).catch(() => {});
          return;
        }
        sessionRef.current = sess.sessionId;
        const isTerm = sess.playerMode === 'terminal' || sess.streamKind === 'terminal';
        setTerminal(isTerm);
        if (sess.heartbeatMs) setHeartbeatMs(sess.heartbeatMs);
        const token = useAuthStore.getState().token || '';
        setUri(gamePlayerUrl(sess, token));
      } catch (e) {
        if (cancelled) return;
        const code = e instanceof ApiError ? e.code : '';
        setErrorCode(code);
        if (code === 'INSUFFICIENT_BALANCE' || code === 'PAYOUT_HELD') setError(t('compute.play.needWallet'));
        else if (code === 'CLIENT_NOT_SUPPORTED') setError(t('compute.device.pcOnly'));
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
      {uri ? <GpuStreamPlayer uri={uri} terminal={terminal} onLoad={() => setReady(true)} onError={(m) => setError(m)} /> : null}
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
                {errorCode === 'INSUFFICIENT_BALANCE' || errorCode === 'PAYOUT_HELD' ? (
                  <Button title={t('playground.topUp')} onPress={() => router.push('/wallet')} />
                ) : errorCode === 'CLIENT_NOT_SUPPORTED' ? (
                  <Button
                    title={t('compute.device.openWeb')}
                    onPress={() => void Linking.openURL(`${WEB_ORIGIN}/play/${encodeURIComponent(String(slug || ''))}`)}
                  />
                ) : (
                  <Button title={t('common.retry')} onPress={() => setAttempt((n) => n + 1)} />
                )}
                <Button title={t('compute.play.backProduct')} variant="outline" onPress={leave} />
              </View>
            </View>
          ) : (
            <View style={styles.loading}>
              <ActivityIndicator color="#3dffb0" size="large" />
              <Text style={styles.hint}>{t(terminal ? 'compute.play.connectingGpu' : 'compute.play.connecting')}</Text>
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
      {ready && !error && bill && bill.ratePerHour > 0 && bill.minutesLeft !== undefined && bill.minutesLeft <= 5 ? (
        <View style={[styles.lowBalance, { top: Math.max(insets.top, 8), right: Math.max(insets.right, 12) }]} pointerEvents="none">
          <Text style={styles.lowBalanceText}>{t('compute.play.lowBalance', { minutes: bill.minutesLeft })}</Text>
        </View>
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
  lowBalance: {
    position: 'absolute',
    zIndex: 4,
    maxWidth: 280,
    backgroundColor: 'rgba(245,158,11,0.92)',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
  },
  lowBalanceText: { color: '#111', fontWeight: '700', fontSize: 12 },
  errBox: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 24 },
  errTitle: { color: '#fff', fontWeight: '800', fontSize: 16 },
  err: { color: 'rgba(255,255,255,0.82)', marginTop: 8, textAlign: 'center' },
});
