import React from 'react';
import { Alert, Text } from 'react-native';
import { Stack } from 'expo-router';
import { useMutation } from '@tanstack/react-query';
import { affiliateApi } from '@/api/affiliate';
import { useAuth } from '@/hooks/useAuth';
import { useTheme, useT } from '@/hooks/useT';
import { Screen } from '@/components/ui/Screen';
import { LoginPrompt } from '@/components/ui/LoginPrompt';
import { EmptyState } from '@/components/ui/EmptyState';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { getErrorMessage } from '@/lib/errors';
import { affiliateClawbackDecision } from '@/lib/affiliateProcess';

/**
 * Admin clawback of one commission the admin already identified by order id.
 * No list of referrers or payout accounts is loaded.
 */
export default function AdminAffiliateClawbackScreen() {
  const { colors } = useTheme();
  const { t, language } = useT();
  const { isAuthenticated, isAdmin } = useAuth();
  const [orderId, setOrderId] = React.useState('');
  const [reason, setReason] = React.useState('');

  const review = useMutation({
    mutationFn: (input: { orderId: string; reason: string }) => affiliateApi.clawback(input.orderId, input.reason),
    onSuccess: () => Alert.alert('AI Markets', t('admin.affclaw.saved')),
    onError: (err) => Alert.alert('AI Markets', getErrorMessage(err, language) || t('admin.affclaw.err')),
  });

  if (!isAuthenticated) return <LoginPrompt />;
  if (!isAdmin) {
    return (
      <Screen>
        <Stack.Screen options={{ title: t('admin.affclaw.title') }} />
        <EmptyState title={t('admin.forbidden')} />
      </Screen>
    );
  }

  return (
    <Screen>
      <Stack.Screen options={{ title: t('admin.affclaw.title') }} />
      <Text style={{ color: colors.text, fontSize: 22, fontWeight: '700' }}>{t('admin.affclaw.title')}</Text>
      <Text style={{ color: colors.textSecondary, marginTop: 8, lineHeight: 20 }}>{t('admin.affclaw.lede')}</Text>
      <Input label={t('admin.affclaw.order')} value={orderId} onChangeText={setOrderId} autoCapitalize="none" />
      <Input label={t('admin.affclaw.reason')} value={reason} onChangeText={setReason} />
      <Button
        title={t('admin.affclaw.submit')}
        loading={review.isPending}
        onPress={() => {
          const decision = affiliateClawbackDecision({ actorRole: 'admin', orderId, reason });
          if (!decision.ok) {
            Alert.alert('AI Markets', t(`admin.affclaw.err.${decision.code}`));
            return;
          }
          review.mutate({ orderId: decision.orderId, reason: decision.reason });
        }}
      />
    </Screen>
  );
}
