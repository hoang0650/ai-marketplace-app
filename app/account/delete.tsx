import React, { useState } from 'react';
import { ActivityIndicator, Alert, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Stack, useRouter } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { accountApi } from '@/api/account';
import { useAuth } from '@/hooks/useAuth';
import { useTheme, useT } from '@/hooks/useT';
import { Screen } from '@/components/ui/Screen';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { ApiError, getErrorMessage } from '@/lib/errors';
import { openLegal, openWeb, webUrl } from '@/lib/legalLinks';

/** Profile → Delete account. Deletes the account on the server (not just a sign-out or deactivation). */
export default function DeleteAccountScreen() {
  const router = useRouter();
  const { colors } = useTheme();
  const { t, language } = useT();
  const { isAuthenticated, logout } = useAuth();
  const [confirm, setConfirm] = useState('');
  const [password, setPassword] = useState('');
  const [reason, setReason] = useState('');
  const [busy, setBusy] = useState(false);
  const preview = useQuery({ queryKey: ['account-deletion'], queryFn: accountApi.deletionPreview, enabled: isAuthenticated });
  const muted = { color: colors.textSecondary };

  const run = async () => {
    setBusy(true);
    try {
      await accountApi.deleteAccount({ confirm, password: password || undefined, reason: reason || undefined });
      await logout();
      Alert.alert('', t('del.done'));
      router.replace('/(tabs)');
    } catch (err) {
      if (err instanceof ApiError && err.code === 'ACCOUNT_DELETION_BLOCKED') void preview.refetch();
      Alert.alert(t('del.fail'), getErrorMessage(err, language));
    } finally {
      setBusy(false);
    }
  };

  const ask = () =>
    Alert.alert(t('del.title'), t('del.confirmDialog'), [
      { text: t('common.cancel'), style: 'cancel' },
      { text: t('del.submit'), style: 'destructive', onPress: () => void run() },
    ]);

  if (!isAuthenticated) {
    return (
      <Screen>
        <Stack.Screen options={{ title: t('del.title') }} />
        <Text style={[styles.lede, { color: colors.text }]}>{t('del.signedOut')}</Text>
        <Button title={t('del.webRequest')} variant="outline" onPress={() => void openWeb(webUrl('/account/delete', language))} />
      </Screen>
    );
  }

  const p = preview.data;
  return (
    <Screen>
      <Stack.Screen options={{ title: t('del.title') }} />
      <ScrollView contentContainerStyle={{ paddingBottom: 48 }} keyboardShouldPersistTaps="handled">
        <Text style={[styles.lede, { color: colors.text }]}>{t('del.lede')}</Text>
        {preview.isLoading ? <ActivityIndicator color={colors.tint} /> : null}
        {preview.isError ? <Text style={{ color: colors.danger }}>{getErrorMessage(preview.error, language)}</Text> : null}
        {p ? (
          <>
            <View style={[styles.card, { borderColor: colors.border }]}>
              <Text style={[styles.h, { color: colors.text }]}>{t('del.deleted')}</Text>
              {p.deleted.map((s) => (
                <Text key={s} style={muted}>• {s}</Text>
              ))}
              <Text style={[styles.h, { color: colors.text, marginTop: 12 }]}>{t('del.retained')}</Text>
              {p.retained.map((s) => (
                <Text key={s} style={muted}>• {s}</Text>
              ))}
              <Pressable onPress={() => void openLegal('chinh-sach-luu-tru-va-cung-cap-du-lieu', language)} style={styles.link}>
                <Text style={{ color: colors.tint, fontWeight: '700' }}>{t('del.policy')}</Text>
              </Pressable>
            </View>
            {!p.canDelete ? (
              <View style={[styles.card, { borderColor: colors.danger }]}>
                <Text style={[styles.h, { color: colors.danger }]}>{t('del.blocked')}</Text>
                {p.blockers.map((b) => (
                  <Text key={b.code} style={{ color: colors.text }}>• {b.message}</Text>
                ))}
                <Pressable onPress={() => router.push('/wallet')} style={styles.link}>
                  <Text style={{ color: colors.tint, fontWeight: '700' }}>{t('wallet.title')}</Text>
                </Pressable>
              </View>
            ) : null}
            <Input label={t('del.confirmLabel')} value={confirm} onChangeText={setConfirm} autoCapitalize="characters" autoCorrect={false} />
            {p.requiresPassword ? (
              <Input label={t('del.password')} value={password} onChangeText={setPassword} secureTextEntry autoComplete="current-password" />
            ) : null}
            <Input label={t('del.reason')} value={reason} onChangeText={setReason} multiline />
            <Button
              title={t('del.submit')}
              variant="danger"
              loading={busy}
              disabled={!p.canDelete || !confirm.trim() || (p.requiresPassword && !password)}
              onPress={ask}
            />
          </>
        ) : null}
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  lede: { fontSize: 15, lineHeight: 22, marginBottom: 12 },
  card: { borderWidth: 1, borderRadius: 14, padding: 14, marginBottom: 14, gap: 4 },
  h: { fontWeight: '800', fontSize: 15, marginBottom: 4 },
  link: { minHeight: 44, justifyContent: 'center' },
});
