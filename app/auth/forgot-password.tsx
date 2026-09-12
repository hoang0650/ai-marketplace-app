import React from 'react';
import { Text } from 'react-native';
import { useRouter } from 'expo-router';
import { Screen } from '@/components/ui/Screen';
import { Button } from '@/components/ui/Button';
import { useTheme } from '@/hooks/useT';
import { useT } from '@/hooks/useT';

export default function ForgotPasswordScreen() {
  const { colors } = useTheme();
  const { t } = useT();
  const router = useRouter();
  return (
    <Screen>
      <Text style={{ color: colors.text, fontSize: 24, fontWeight: '700', marginTop: 24 }}>{t('auth.forgotTitle')}</Text>
      <Text style={{ color: colors.textSecondary, marginTop: 12, lineHeight: 22 }}>{t('auth.forgotBody')}</Text>
      <Button title={t('auth.login')} onPress={() => router.back()} style={{ marginTop: 24 }} />
    </Screen>
  );
}
