import React, { useState } from 'react';
import { Text } from 'react-native';
import { useRouter } from 'expo-router';
import { Screen } from '@/components/ui/Screen';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { useTheme } from '@/hooks/useT';
import { useT } from '@/hooks/useT';
import { authApi } from '@/api/auth';
import { getErrorMessage } from '@/lib/errors';

/** Request a reset link; the API answers the same whether or not the email exists. */
export default function ForgotPasswordScreen() {
  const { colors } = useTheme();
  const { t, language } = useT();
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [sent, setSent] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const submit = async () => {
    if (busy || !email.trim()) return;
    setBusy(true);
    setError('');
    try {
      await authApi.forgotPassword(email.trim());
      setSent(true);
    } catch (e) {
      setError(getErrorMessage(e as Error, language));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Screen>
      <Text style={{ color: colors.text, fontSize: 24, fontWeight: '700', marginTop: 24 }}>{t('auth.forgotTitle')}</Text>
      <Text style={{ color: colors.textSecondary, marginTop: 12, lineHeight: 22 }}>{sent ? t('auth.forgotSent') : t('auth.forgotBody')}</Text>
      {!sent ? (
        <>
          <Input
            label={t('auth.email')}
            value={email}
            onChangeText={setEmail}
            autoCapitalize="none"
            autoComplete="email"
            keyboardType="email-address"
            error={error || undefined}
          />
          <Button title={t('auth.forgotSend')} loading={busy} onPress={() => void submit()} style={{ marginTop: 16 }} />
        </>
      ) : null}
      <Button title={t('auth.login')} variant="outline" onPress={() => router.back()} style={{ marginTop: 16 }} />
    </Screen>
  );
}
