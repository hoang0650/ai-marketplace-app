import React, { useState } from 'react';
import { Alert, ScrollView, Text } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { href } from '@/lib/href';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Controller, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { complaintSchema } from '@/schemas/auth';
import { complaintsApi } from '@/api';
import { useAuth } from '@/hooks/useAuth';
import { useTheme } from '@/hooks/useT';
import { useT } from '@/hooks/useT';
import { Screen } from '@/components/ui/Screen';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { Chip } from '@/components/ui/Chip';
import { LoginPrompt } from '@/components/ui/LoginPrompt';
import { getErrorMessage } from '@/lib/errors';
import { AnalyticsService } from '@/lib/analytics';

const KINDS = ['buyer_seller', 'buyer_platform', 'seller_platform'] as const;

export default function CreateComplaintScreen() {
  const { orderId } = useLocalSearchParams<{ orderId?: string }>();
  const router = useRouter();
  const qc = useQueryClient();
  const { isAuthenticated } = useAuth();
  const { colors } = useTheme();
  const { t, language } = useT();
  const [kind, setKind] = useState<(typeof KINDS)[number]>(orderId ? 'buyer_seller' : 'buyer_platform');
  const form = useForm({ resolver: zodResolver(complaintSchema), defaultValues: { kind: 'buyer_platform', body: '', orderId: orderId || '', evidence: '' } });
  const create = useMutation({
    mutationFn: (vals: { body: string; evidence?: string }) =>
      complaintsApi.create({
        kind,
        body: vals.body,
        orderId: orderId || undefined,
        evidenceUrls: (vals.evidence || '').split('\n').map((s) => s.trim()).filter(Boolean),
      }),
    onSuccess: (c) => {
      AnalyticsService.track('complaint_created', { id: c.id });
      qc.invalidateQueries({ queryKey: ['complaints'] });
      router.replace(href(`/complaint/${c.id}`));
    },
    onError: (e: Error) => Alert.alert('AI Markets', getErrorMessage(e, language)),
  });

  if (!isAuthenticated) return <LoginPrompt />;

  return (
    <Screen>
      <ScrollView>
        <Text style={{ color: colors.text, fontSize: 22, fontWeight: '700', marginBottom: 12 }}>{t('complaint.create')}</Text>
        <Text style={{ color: colors.textSecondary, marginBottom: 8 }}>{t('complaint.type')}</Text>
        {KINDS.map((k) => (
          <Chip key={k} label={k} active={kind === k} onPress={() => setKind(k)} />
        ))}
        <Controller control={form.control} name="body" render={({ field, fieldState }) => (
          <Input label={t('complaint.body')} value={field.value} onChangeText={field.onChange} error={fieldState.error?.message} multiline />
        )} />
        <Controller control={form.control} name="evidence" render={({ field }) => (
          <Input label={t('complaint.evidence')} value={field.value} onChangeText={field.onChange} multiline />
        )} />
        <Button title={t('common.submit')} loading={create.isPending} onPress={form.handleSubmit((v) => create.mutate(v))} />
      </ScrollView>
    </Screen>
  );
}
