import React, { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { handoffApi, handoffError, parseHandoffCode } from '@/api/handoff';
import { href } from '@/lib/href';
import { useAuth } from '@/hooks/useAuth';
import { useT, useTheme } from '@/hooks/useT';
import { LoginPrompt } from '@/components/ui/LoginPrompt';
import { Button } from '@/components/ui/Button';
import { appPathFor } from './_shared';

/** aimarkets://handoff/<code> and https://aimarkets.vn/handoff/<code> land here. */
export default function HandoffClaimScreen() {
  const { code: raw } = useLocalSearchParams<{ code: string }>();
  const router = useRouter();
  const { isAuthenticated } = useAuth();
  const { t } = useT();
  const { colors } = useTheme();
  const [error, setError] = useState('');
  const tried = useRef(false);

  useEffect(() => {
    if (!isAuthenticated || tried.current) return;
    tried.current = true;
    const code = parseHandoffCode(String(raw || ''));
    if (!code) {
      setError(t('handoff.err.HANDOFF_CODE_INVALID'));
      return;
    }
    handoffApi
      .claim(code)
      .then((r) => router.replace(href(appPathFor(r.target))))
      .catch((e) => {
        const err = handoffError(e, t('handoff.err.generic'));
        const key = `handoff.err.${err.code}`;
        const msg = t(key as never);
        setError(msg && msg !== key ? msg : err.message);
      });
  }, [isAuthenticated, raw, router, t]);

  if (!isAuthenticated) return <LoginPrompt />;
  return (
    <View style={[styles.wrap, { backgroundColor: colors.background }]}>
      <Stack.Screen options={{ title: t('handoff.app.title') }} />
      {error ? (
        <>
          <Text style={[styles.err, { color: colors.text }]}>{error}</Text>
          <Button title={t('handoff.app.scanAgain')} onPress={() => router.replace(href('/handoff/scan'))} />
        </>
      ) : (
        <>
          <ActivityIndicator />
          <Text style={{ color: colors.textSecondary, marginTop: 12 }}>{t('handoff.app.opening')}</Text>
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24, gap: 16 },
  err: { fontSize: 16, textAlign: 'center' },
});
