import React, { useState } from 'react';
import { ActivityIndicator, FlatList, Pressable, RefreshControl, StyleSheet, Text, TextInput, View } from 'react-native';
import { Stack, useRouter } from 'expo-router';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { workApi } from '@/api';
import type { WorkJobBid } from '@/api/types';
import { href } from '@/lib/href';
import { useAuth } from '@/hooks/useAuth';
import { useTheme } from '@/hooks/useT';
import { useT } from '@/hooks/useT';
import { Screen } from '@/components/ui/Screen';
import { Button } from '@/components/ui/Button';
import { Chip } from '@/components/ui/Chip';
import { EmptyState } from '@/components/ui/EmptyState';
import { LoginPrompt } from '@/components/ui/LoginPrompt';
import { formatMoney } from '@/utils/format';
import { getErrorMessage } from '@/lib/errors';
import { HubBackButton } from '@/components/catalog/HubBackButton';

type RoleFilter = 'all' | 'employer' | 'freelancer';

function statusLabel(t: (k: string) => string, s?: string) {
  const key = `work.ws.${s || 'none'}`;
  const v = t(key);
  return v === key ? s || '—' : v;
}

export default function WorkContractsScreen() {
  const router = useRouter();
  const { colors } = useTheme();
  const { t, language } = useT();
  const { isAuthenticated, user } = useAuth();
  const qc = useQueryClient();
  const [as, setAs] = useState<RoleFilter>('all');
  const [deliverNote, setDeliverNote] = useState<Record<string, string>>({});
  const [revNote, setRevNote] = useState<Record<string, string>>({});
  const [err, setErr] = useState('');

  const q = useQuery({
    queryKey: ['work', 'contracts', as],
    queryFn: () => workApi.contracts(as),
    enabled: isAuthenticated,
  });

  const invalidate = () => qc.invalidateQueries({ queryKey: ['work', 'contracts'] });

  const mut = useMutation({
    mutationFn: async ({
      id,
      action,
      note,
    }: {
      id: string;
      action: 'start' | 'deliver' | 'complete' | 'revision';
      note?: string;
    }) => {
      if (action === 'start') return workApi.startWork(id);
      if (action === 'deliver') return workApi.deliver(id, { note: note || '' });
      if (action === 'complete') return workApi.complete(id);
      return workApi.revision(id, note || '');
    },
    onSuccess: () => {
      setErr('');
      void invalidate();
    },
    onError: (e) => setErr(getErrorMessage(e, language)),
  });

  if (!isAuthenticated) {
    return (
      <Screen>
        <Stack.Screen options={{ title: t('work.contracts'), headerLeft: () => <HubBackButton />, headerBackVisible: false }} />
        <LoginPrompt />
      </Screen>
    );
  }

  const renderItem = ({ item }: { item: WorkJobBid }) => {
    const isFreelancer = item.applicantId && user?.id && String(item.applicantId) === String(user.id);
    const isEmployer = !isFreelancer;
    const ws = item.workStatus || 'none';

    return (
      <View style={[styles.card, { backgroundColor: colors.cardBackground, borderColor: colors.border }]}>
        <Pressable onPress={() => item.jobSlug && router.push(href(`/work/job/${item.jobSlug}`))}>
          <Text style={[styles.title, { color: colors.text }]} numberOfLines={2}>
            {item.jobTitle || item.jobSlug || t('work.contracts')}
          </Text>
        </Pressable>
        <Text style={{ color: colors.textSecondary, marginTop: 4 }}>
          {isFreelancer ? t('work.role.freelancer') : t('work.role.employer')} · {item.applicantName}
        </Text>
        <Text style={{ color: colors.text, fontWeight: '800', marginTop: 6 }}>
          {formatMoney(item.proposedAmount, item.proposedCurrency)} / {item.proposedPeriod}
        </Text>
        <Text style={[styles.badge, { color: colors.tint }]}>{statusLabel(t, ws)}</Text>

        {item.deliveryNote ? (
          <Text style={{ color: colors.textSecondary, marginTop: 8, fontSize: 13 }} numberOfLines={4}>
            {t('work.delivery')}: {item.deliveryNote}
          </Text>
        ) : null}
        {item.revisionNote ? (
          <Text style={{ color: colors.danger, marginTop: 6, fontSize: 13 }} numberOfLines={3}>
            {t('work.revision')}: {item.revisionNote}
          </Text>
        ) : null}

        <View style={styles.actions}>
          {isFreelancer && (ws === 'hired' || ws === 'in_progress' || ws === 'revision_requested') ? (
            <>
              {ws === 'hired' ? (
                <Button title={t('work.action.start')} variant="outline" onPress={() => mut.mutate({ id: item.id, action: 'start' })} />
              ) : null}
              <TextInput
                value={deliverNote[item.id] || ''}
                onChangeText={(v) => setDeliverNote((m) => ({ ...m, [item.id]: v }))}
                placeholder={t('work.deliveryPh')}
                placeholderTextColor={colors.textSecondary}
                style={[styles.input, { color: colors.text, borderColor: colors.border }]}
                multiline
              />
              <Button
                title={t('work.action.deliver')}
                loading={mut.isPending}
                onPress={() => mut.mutate({ id: item.id, action: 'deliver', note: deliverNote[item.id] })}
              />
            </>
          ) : null}

          {isEmployer && ws === 'delivered' ? (
            <>
              <Button title={t('work.action.complete')} onPress={() => mut.mutate({ id: item.id, action: 'complete' })} />
              <TextInput
                value={revNote[item.id] || ''}
                onChangeText={(v) => setRevNote((m) => ({ ...m, [item.id]: v }))}
                placeholder={t('work.revisionPh')}
                placeholderTextColor={colors.textSecondary}
                style={[styles.input, { color: colors.text, borderColor: colors.border }]}
                multiline
              />
              <Button
                title={t('work.action.revision')}
                variant="outline"
                onPress={() => mut.mutate({ id: item.id, action: 'revision', note: revNote[item.id] })}
              />
            </>
          ) : null}

          {['hired', 'in_progress', 'delivered', 'revision_requested', 'disputed', 'completed'].includes(ws) ? (
            <Button
              title={t('work.action.complaint')}
              variant="outline"
              onPress={() =>
                router.push(
                  href(
                    `/complaint/create?jobApplicationId=${item.id}&kind=${
                      isEmployer ? 'employer_freelancer' : 'freelancer_employer'
                    }`,
                  ),
                )
              }
            />
          ) : null}
        </View>
      </View>
    );
  };

  return (
    <Screen>
      <Stack.Screen options={{ title: t('work.contracts'), headerLeft: () => <HubBackButton />, headerBackVisible: false }} />
      <Text style={[styles.lede, { color: colors.textSecondary }]}>{t('work.contractsLede')}</Text>
      <View style={styles.tabs}>
        {(['all', 'employer', 'freelancer'] as const).map((k) => (
          <Chip key={k} label={t(`work.filter.${k}`)} active={as === k} onPress={() => setAs(k)} />
        ))}
      </View>
      {err ? <Text style={{ color: colors.danger, marginBottom: 8 }}>{err}</Text> : null}
      {q.isLoading ? (
        <ActivityIndicator color={colors.tint} style={{ marginTop: 24 }} />
      ) : (
        <FlatList
          data={q.data || []}
          keyExtractor={(item) => item.id}
          contentContainerStyle={{ paddingBottom: 40 }}
          refreshControl={<RefreshControl refreshing={q.isRefetching} onRefresh={() => q.refetch()} tintColor={colors.tint} />}
          ListEmptyComponent={<EmptyState title={t('work.noContracts')} hint={t('work.noContractsHint')} />}
          renderItem={renderItem}
        />
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  lede: { fontSize: 14, lineHeight: 20, marginBottom: 10, marginTop: 4 },
  tabs: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 12 },
  card: { borderWidth: 1, borderRadius: 16, padding: 14, marginBottom: 12 },
  title: { fontSize: 16, fontWeight: '700' },
  badge: { marginTop: 8, fontWeight: '800', fontSize: 13 },
  actions: { marginTop: 12, gap: 8 },
  input: { borderWidth: 1, borderRadius: 12, padding: 10, minHeight: 72, textAlignVertical: 'top' },
});
