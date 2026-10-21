import React, { useState } from 'react';
import { Alert, Text } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Screen } from '@/components/ui/Screen';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { useT, useTheme } from '@/hooks/useT';
import { authApi } from '@/api/auth';
import { getErrorMessage } from '@/lib/errors';

/** Universal link target for https://aimarkets.vn/reset-password?token=… (opens in the app when installed). */
export default function ResetPasswordScreen() {
  const { colors } = useTheme();
  const { t, language } = useT();
  const router = useRouter();
  const { token } = useLocalSearchParams<{ token?: string }>();
  const [pw, setPw] = useState('');
  const [pw2, setPw2] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const submit = async () => {
    setError('');
    if (pw.length < 8 || pw.length > 128) return setError(t('auth.pwLength'));
    if (pw !== pw2) return setError(t('auth.pwMismatch'));
    setBusy(true);
    try {
      await authApi.resetPassword(String(token || ''), pw);
      Alert.alert(t('auth.resetTitle'), t('auth.resetDone'));
      router.replace('/auth/login');
    } catch (e) {
      setError(getErrorMessage(e as Error, language));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Screen>
      <Text style={{ color: colors.text, fontSize: 24, fontWeight: '700', marginTop: 24 }}>{t('auth.resetTitle')}</Text>
      {!token ? (
        <>
          <Text style={{ color: colors.textSecondary, marginTop: 12 }}>{t('auth.resetInvalid')}</Text>
          <Button title={t('auth.forgot')} onPress={() => router.replace('/auth/forgot-password')} style={{ marginTop: 16 }} />
        </>
      ) : (
        <>
          <Input label={t('auth.newPassword')} value={pw} onChangeText={setPw} secureTextEntry autoComplete="new-password" />
          <Input label={t('auth.confirmPasswordNew')} value={pw2} onChangeText={setPw2} secureTextEntry autoComplete="new-password" error={error || undefined} />
          <Button title={t('auth.resetSubmit')} loading={busy} onPress={() => void submit()} style={{ marginTop: 16 }} />
        </>
      )}
    </Screen>
  );
}
