import React from 'react';
import { Alert, Linking, Pressable, ScrollView, Text, View } from 'react-native';
import { Stack } from 'expo-router';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { sellersApi } from '@/api';
import type { SellerProfile } from '@/api/types';
import { useAuth } from '@/hooks/useAuth';
import { useTheme, useT } from '@/hooks/useT';
import { Screen } from '@/components/ui/Screen';
import { LoginPrompt } from '@/components/ui/LoginPrompt';
import { EmptyState } from '@/components/ui/EmptyState';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { getErrorMessage } from '@/lib/errors';
import { PUBLIC_TAX_LOOKUP_URL, supplierReviewDecision, supplierReviewView } from '@/lib/supplierReview';

/**
 * Admin records a manual comparison of the tax code the supplier typed.
 * The app does not call the tax site. A saved decision is not eKYC.
 */
export default function AdminSupplierReviewScreen() {
  const { colors } = useTheme();
  const { t, language } = useT();
  const { isAuthenticated, isAdmin } = useAuth();
  const qc = useQueryClient();
  const [reasons, setReasons] = React.useState<Record<string, string>>({});
  const [attested, setAttested] = React.useState<Record<string, boolean>>({});

  const q = useQuery({
    queryKey: ['admin-suppliers'],
    queryFn: () => sellersApi.adminList(),
    enabled: isAuthenticated && isAdmin,
  });
  const review = useMutation({
    mutationFn: (input: { id: string; status: 'approved' | 'rejected'; reason: string; lookupAttested: boolean }) =>
      sellersApi.manualReview(input.id, {
        status: input.status,
        reason: input.reason,
        lookupAttested: input.lookupAttested,
      }),
    onSuccess: () => {
      Alert.alert('AI Markets', t('admin.supplier.saved'));
      void qc.invalidateQueries({ queryKey: ['admin-suppliers'] });
    },
    onError: (err) => Alert.alert('AI Markets', getErrorMessage(err, language) || t('admin.supplier.err')),
  });

  if (!isAuthenticated) return <LoginPrompt />;
  if (!isAdmin) {
    return (
      <Screen>
        <Stack.Screen options={{ title: t('admin.supplier.title') }} />
        <EmptyState title={t('admin.forbidden')} />
      </Screen>
    );
  }

  const rows = Array.isArray(q.data) ? q.data : [];

  function decide(row: SellerProfile, action: 'approve' | 'reject') {
    const decision = supplierReviewDecision({
      action,
      reason: reasons[row.id] || '',
      actorRole: 'admin',
      lookupAttested: attested[row.id] === true,
    });
    if (!decision.ok) {
      Alert.alert('AI Markets', t(`admin.supplier.err.${decision.code}`));
      return;
    }
    review.mutate({ id: row.id, status: decision.status, reason: decision.reason, lookupAttested: decision.lookupAttested });
  }

  return (
    <Screen padded={false}>
      <Stack.Screen options={{ title: t('admin.supplier.title') }} />
      <ScrollView contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 40 }}>
        <Text style={{ color: colors.text, fontSize: 22, fontWeight: '700', marginTop: 8 }}>{t('admin.supplier.title')}</Text>
        <Text style={{ color: colors.textSecondary, marginTop: 8, lineHeight: 20 }}>{t('admin.supplier.lede')}</Text>
        <Pressable onPress={() => void Linking.openURL(PUBLIC_TAX_LOOKUP_URL)} style={{ marginTop: 8, minHeight: 44, justifyContent: 'center' }}>
          <Text style={{ color: colors.tint, fontWeight: '700' }}>{t('admin.supplier.lookup')}</Text>
        </Pressable>
        <Text style={{ color: colors.textSecondary, lineHeight: 20 }}>{t('admin.supplier.notEkyc')}</Text>
        {q.isError ? <Text style={{ color: colors.danger, marginTop: 12 }}>{t('admin.supplier.err')}</Text> : null}
        {!q.isLoading && rows.length === 0 ? <Text style={{ color: colors.textSecondary, marginTop: 12 }}>{t('admin.supplier.empty')}</Text> : null}
        {rows.map((row) => {
          const present = Object.prototype.hasOwnProperty.call(row, 'manualTaxReview');
          const view = supplierReviewView({
            verificationStatus: row.verificationStatus,
            manualTaxReviewFieldPresent: present,
            manualStatus: row.manualTaxReview?.status,
            electronicIdentityKnown: false,
          });
          const manual = view.manualStatusKnown ? t(`sell.review.manual.${view.manualStatus}`) : t('sell.review.manualUnknown');
          return (
            <View key={row.id} style={{ marginTop: 16, padding: 12, borderWidth: 1, borderColor: colors.border, borderRadius: 12 }}>
              <Text style={{ color: colors.text, fontWeight: '700' }}>{row.legalName || row.displayName || row.id}</Text>
              <Text style={{ color: colors.textSecondary, marginTop: 4 }}>
                {row.sellerType || '—'} · MST {row.taxCode || '—'} · {manual}
              </Text>
              <Text style={{ color: colors.textSecondary, marginTop: 4 }}>
                {t('admin.supplier.flagNote')}: {row.identityVerificationStatus || 'none'}
              </Text>
              <Input
                label={t('admin.supplier.reason')}
                value={reasons[row.id] || ''}
                onChangeText={(value) => setReasons((prev) => ({ ...prev, [row.id]: value }))}
              />
              <Pressable
                onPress={() => setAttested((prev) => ({ ...prev, [row.id]: !prev[row.id] }))}
                style={{ minHeight: 44, justifyContent: 'center', marginBottom: 8 }}
              >
                <Text style={{ color: colors.text }}>
                  {attested[row.id] ? '☑ ' : '☐ '}
                  {t('admin.supplier.attest')}
                </Text>
              </Pressable>
              <Button title={t('admin.supplier.approve')} disabled={review.isPending} onPress={() => decide(row, 'approve')} />
              <Button title={t('admin.supplier.reject')} variant="outline" disabled={review.isPending} onPress={() => decide(row, 'reject')} style={{ marginTop: 8 }} />
            </View>
          );
        })}
      </ScrollView>
    </Screen>
  );
}
