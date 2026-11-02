import React, { useState } from 'react';
import { ActivityIndicator, Keyboard, Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Stack, useRouter } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { accountApi, type DeletionBlocker } from '@/api/account';
import { useAuth } from '@/hooks/useAuth';
import { useTheme, useT } from '@/hooks/useT';
import { Screen } from '@/components/ui/Screen';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { ApiError, getErrorMessage } from '@/lib/errors';
import { isDeletionConfirm, normalizeDeletionConfirm } from '@/lib/accountDeletion';
import { openLegal, openWeb, webUrl } from '@/lib/legalLinks';
import { useToastStore } from '@/stores/toastStore';

function blockerLine(blocker: DeletionBlocker, t: (key: string) => string) {
  const key = `del.block.${blocker.code}`;
  const translated = t(key);
  return translated === key ? blocker.message : translated;
}

function deletionError(err: unknown, t: (key: string) => string, language: 'vi' | 'en' | 'zh') {
  if (err instanceof ApiError) {
    if (err.code === 'CONFIRM_REQUIRED') return t('del.mismatch');
    if (err.code === 'INVALID_PASSWORD') return t('del.badPassword');
    if (err.code === 'ADMIN_CANNOT_SELF_DELETE') return t('del.admin');
    if (err.code === 'ACCOUNT_DELETION_BLOCKED') {
      const blockers = Array.isArray(err.details?.blockers) ? (err.details?.blockers as DeletionBlocker[]) : [];
      if (blockers.length) return blockers.map((blocker) => blockerLine(blocker, t)).join('\n');
      return t('del.blocked');
    }
  }
  return getErrorMessage(err, language);
}

/** Profile → Settings → Delete account. The confirm step is an in-app modal, not Alert (iOS drops Alert button callbacks while the keyboard is up). */
export default function DeleteAccountScreen() {
  const router = useRouter();
  const { colors } = useTheme();
  const { t, language } = useT();
  const { isAuthenticated, logout } = useAuth();
  const [confirm, setConfirm] = useState('');
  const [password, setPassword] = useState('');
  const [reason, setReason] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [confirmOpen, setConfirmOpen] = useState(false);
  const preview = useQuery({ queryKey: ['account-deletion'], queryFn: accountApi.deletionPreview, enabled: isAuthenticated });
  const muted = { color: colors.textSecondary };

  const run = async () => {
    if (busy) return;
    setBusy(true);
    setError('');
    try {
      await accountApi.deleteAccount({
        confirm: normalizeDeletionConfirm(confirm),
        password: password || undefined,
        reason: reason || undefined,
      });
      setConfirmOpen(false);
      await logout();
      useToastStore.getState().show(t('del.done'));
      router.replace('/auth/login');
    } catch (err) {
      if (err instanceof ApiError && err.code === 'ACCOUNT_DELETION_BLOCKED') void preview.refetch();
      setConfirmOpen(false);
      setError(deletionError(err, t, language));
    } finally {
      setBusy(false);
    }
  };

  const ask = () => {
    Keyboard.dismiss();
    const data = preview.data;
    if (!data) {
      setError(getErrorMessage(preview.error, language));
      return;
    }
    if (!data.canDelete) {
      setError(data.blockers.map((blocker) => blockerLine(blocker, t)).join('\n') || t('del.blocked'));
      return;
    }
    if (!isDeletionConfirm(confirm)) {
      setError(t('del.mismatch'));
      return;
    }
    if (data.requiresPassword && !password.trim()) {
      setError(t('del.needPassword'));
      return;
    }
    setError('');
    setConfirmOpen(true);
  };

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
        {preview.isError ? (
          <View style={{ gap: 8, marginBottom: 12 }}>
            <Text style={{ color: colors.danger }}>{getErrorMessage(preview.error, language)}</Text>
            <Button title={t('common.retry')} variant="outline" onPress={() => void preview.refetch()} />
          </View>
        ) : null}
        {p ? (
          <>
            <View style={[styles.card, { borderColor: colors.border }]}>
              <Text style={[styles.h, { color: colors.text }]}>{t('del.deleted')}</Text>
              {p.deleted.map((item) => (
                <Text key={item} style={muted}>• {item}</Text>
              ))}
              <Text style={[styles.h, { color: colors.text, marginTop: 12 }]}>{t('del.retained')}</Text>
              {p.retained.map((item) => (
                <Text key={item} style={muted}>• {item}</Text>
              ))}
              <Pressable onPress={() => void openLegal('chinh-sach-luu-tru-va-cung-cap-du-lieu', language)} style={styles.link}>
                <Text style={{ color: colors.tint, fontWeight: '700' }}>{t('del.policy')}</Text>
              </Pressable>
            </View>
            {!p.canDelete ? (
              <View style={[styles.card, { borderColor: colors.danger }]}>
                <Text style={[styles.h, { color: colors.danger }]}>{t('del.blocked')}</Text>
                {p.blockers.map((blocker) => (
                  <Text key={blocker.code} style={{ color: colors.text }}>• {blockerLine(blocker, t)}</Text>
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
            {error ? <Text style={{ color: colors.danger, marginBottom: 12, lineHeight: 20 }}>{error}</Text> : null}
            <Button title={t('del.submit')} variant="danger" loading={busy} onPress={ask} />
          </>
        ) : null}
      </ScrollView>
      <Modal visible={confirmOpen} transparent animationType="fade" onRequestClose={() => { if (!busy) setConfirmOpen(false); }}>
        <View style={[styles.modalBackdrop, { backgroundColor: colors.overlay }]}>
          <View style={[styles.modalCard, { backgroundColor: colors.surface }]}>
            <Text style={[styles.h, { color: colors.text }]}>{t('del.title')}</Text>
            <Text style={{ color: colors.text, lineHeight: 22, marginBottom: 16 }}>{t('del.confirmDialog')}</Text>
            <Button title={t('del.submit')} variant="danger" loading={busy} onPress={() => void run()} />
            <Pressable
              onPress={() => setConfirmOpen(false)}
              disabled={busy}
              accessibilityRole="button"
              style={styles.link}
            >
              <Text style={{ color: colors.textSecondary, fontWeight: '700', textAlign: 'center' }}>{t('common.cancel')}</Text>
            </Pressable>
          </View>
        </View>
      </Modal>
    </Screen>
  );
}

const styles = StyleSheet.create({
  lede: { fontSize: 15, lineHeight: 22, marginBottom: 12 },
  card: { borderWidth: 1, borderRadius: 14, padding: 14, marginBottom: 14, gap: 4 },
  h: { fontWeight: '800', fontSize: 15, marginBottom: 4 },
  link: { minHeight: 44, justifyContent: 'center' },
  modalBackdrop: { flex: 1, justifyContent: 'center', padding: 24 },
  modalCard: { borderRadius: 16, padding: 18 },
});
