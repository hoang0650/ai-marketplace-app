import React, { useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ChevronLeft, MessageCircle, UserRound } from 'lucide-react-native';
import { chatApi, workApi } from '@/api';
import type { WorkJobBid } from '@/api/types';
import { href } from '@/lib/href';
import { useAuth } from '@/hooks/useAuth';
import { useTheme } from '@/hooks/useT';
import { useT } from '@/hooks/useT';
import { Screen } from '@/components/ui/Screen';
import { ErrorState } from '@/components/ui/ErrorState';
import { Chip } from '@/components/ui/Chip';
import { Button } from '@/components/ui/Button';
import { formatDate, formatJobPay, formatMoney } from '@/utils/format';
import { getErrorMessage } from '@/lib/errors';

export default function WorkJobScreen() {
  const { slug } = useLocalSearchParams<{ slug: string }>();
  const router = useRouter();
  const { colors } = useTheme();
  const { t, language } = useT();
  const { isAuthenticated, user } = useAuth();
  const qc = useQueryClient();
  const [amount, setAmount] = useState('');
  const [cover, setCover] = useState('');
  const [period, setPeriod] = useState<'hour' | 'project' | 'month'>('project');
  const [formError, setFormError] = useState('');
  const [busyChat, setBusyChat] = useState(false);

  const q = useQuery({ queryKey: ['work', 'job', slug], queryFn: () => workApi.job(String(slug)), enabled: !!slug });
  const bidsQ = useQuery({
    queryKey: ['work', 'bids', slug],
    queryFn: () => workApi.bids(String(slug)),
    enabled: !!slug,
  });
  const appsQ = useQuery({
    queryKey: ['work', 'applications', slug],
    queryFn: () => workApi.applications(String(slug)),
    enabled: !!slug && isAuthenticated,
  });

  const applyMut = useMutation({
    mutationFn: () =>
      workApi.apply(String(slug), {
        proposedAmount: Number(amount),
        proposedCurrency: q.data?.salaryCurrency || 'VND',
        proposedPeriod: period,
        coverLetter: cover.trim(),
      }),
    onSuccess: async () => {
      setFormError('');
      await Promise.all([
        qc.invalidateQueries({ queryKey: ['work', 'bids', slug] }),
        qc.invalidateQueries({ queryKey: ['work', 'applications', slug] }),
        qc.invalidateQueries({ queryKey: ['work', 'job', slug] }),
      ]);
    },
    onError: (e) => setFormError(getErrorMessage(e, language)),
  });

  const job = q.data;
  const isEmployer = !!(job?.postedBy && user?.id && String(job.postedBy) === String(user.id));
  const bidRows: WorkJobBid[] = useMemo(() => {
    if (isAuthenticated && appsQ.data?.length) return appsQ.data;
    return bidsQ.data || [];
  }, [appsQ.data, bidsQ.data, isAuthenticated]);
  const myBid = bidRows.find((b) => b.mine);

  const openChatWithEmployer = async () => {
    if (!isAuthenticated) {
      router.push('/auth/login');
      return;
    }
    if (!myBid) {
      setFormError(t('work.applyFirst'));
      return;
    }
    try {
      setBusyChat(true);
      const c = await chatApi.start({ jobSlug: String(slug) });
      router.push(href(`/chat/${c.id}`));
    } catch (e) {
      setFormError(getErrorMessage(e, language));
    } finally {
      setBusyChat(false);
    }
  };

  const openChatWithApplicant = async (applicantId: string) => {
    if (!isAuthenticated) {
      router.push('/auth/login');
      return;
    }
    try {
      setBusyChat(true);
      const c = await chatApi.start({ jobSlug: String(slug), applicantId });
      router.push(href(`/chat/${c.id}`));
    } catch (e) {
      setFormError(getErrorMessage(e, language));
    } finally {
      setBusyChat(false);
    }
  };

  const headerLeft = () => (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={t('common.back')}
      onPress={() => (router.canGoBack() ? router.back() : router.replace(href('/work/jobs')))}
      hitSlop={8}
      style={styles.backBtn}
    >
      <ChevronLeft size={22} color={colors.text} />
      <Text style={{ color: colors.text, fontWeight: '700' }}>{t('common.back')}</Text>
    </Pressable>
  );

  if (q.isLoading) {
    return (
      <Screen>
        <Stack.Screen options={{ title: t('work.nav.jobs'), headerLeft }} />
        <ActivityIndicator color={colors.tint} style={{ marginTop: 40 }} />
      </Screen>
    );
  }
  if (q.isError || !job) {
    return (
      <Screen>
        <Stack.Screen options={{ title: t('work.nav.jobs'), headerLeft }} />
        <ErrorState message={q.isError ? getErrorMessage(q.error, language) : t('work.jobNotFound')} onRetry={() => q.refetch()} />
      </Screen>
    );
  }

  return (
    <Screen>
      <Stack.Screen options={{ title: job.title, headerLeft, headerBackVisible: false }} />
      <ScrollView contentContainerStyle={{ paddingBottom: 48 }} keyboardShouldPersistTaps="handled">
        <Text style={[styles.title, { color: colors.text }]}>{job.title}</Text>
        <Text style={[styles.meta, { color: colors.textSecondary }]}>
          {job.company} · {job.remote ? t('work.remote') : job.location || t('work.onsite')}
        </Text>
        <Text style={[styles.pay, { color: colors.text }]}>{formatJobPay(job, t)}</Text>
        {job.employmentType ? (
          <Text style={[styles.meta, { color: colors.textSecondary }]}>{t(`work.type.${job.employmentType}`)}</Text>
        ) : null}

        <View style={[styles.poster, { backgroundColor: colors.cardBackground, borderColor: colors.border }]}>
          <View style={[styles.posterIcon, { backgroundColor: colors.mist }]}>
            <UserRound size={20} color={colors.tint} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={{ color: colors.textSecondary, fontSize: 12 }}>{t('work.employer')}</Text>
            <Text style={{ color: colors.text, fontWeight: '700', marginTop: 2 }}>
              {job.postedByName || job.company || t('work.anonymousEmployer')}
            </Text>
            <Text style={{ color: colors.textSecondary, fontSize: 12, marginTop: 4 }}>
              {formatDate(job.createdAt, language)} · {t('work.detail.applications', { n: job.applicationsCount || bidRows.length })}
            </Text>
          </View>
          {!isEmployer ? (
            <Pressable
              onPress={openChatWithEmployer}
              disabled={busyChat}
              style={[styles.msgBtn, { borderColor: colors.border }]}
            >
              <MessageCircle size={18} color={colors.tint} />
            </Pressable>
          ) : null}
        </View>

        <View style={styles.skills}>
          {(job.skills || []).map((s) => (
            <Chip key={s} label={s} />
          ))}
        </View>
        <Text style={[styles.body, { color: colors.text }]}>{job.description}</Text>

        <Text style={[styles.section, { color: colors.text }]}>{t('work.bidsTitle')}</Text>
        <Text style={[styles.meta, { color: colors.textSecondary, marginTop: 4 }]}>{t('work.bidsLede')}</Text>
        {bidRows.length ? (
          bidRows.map((b) => (
            <View key={b.id} style={[styles.bid, { backgroundColor: colors.cardBackground, borderColor: colors.border }]}>
              <View style={{ flex: 1 }}>
                <Text style={{ color: colors.text, fontWeight: '700' }}>
                  {b.applicantName}
                  {b.mine ? ` · ${t('work.yourBid')}` : ''}
                </Text>
                <Text style={{ color: colors.text, fontWeight: '800', marginTop: 4 }}>
                  {formatMoney(b.proposedAmount, b.proposedCurrency)} / {t(`work.period.${b.proposedPeriod}`) || b.proposedPeriod}
                </Text>
                {b.coverLetter ? (
                  <Text style={{ color: colors.textSecondary, marginTop: 6, fontSize: 13 }} numberOfLines={3}>
                    {b.coverLetter}
                  </Text>
                ) : null}
              </View>
              {isEmployer && b.applicantId && b.status === 'pending' ? (
                <View style={{ gap: 6 }}>
                  <Button
                    title={t('work.hire')}
                    onPress={async () => {
                      try {
                        setBusyChat(true);
                        await workApi.updateApplication(b.id, { status: 'accepted' });
                        await Promise.all([appsQ.refetch(), bidsQ.refetch()]);
                      } catch (e) {
                        setFormError(getErrorMessage(e, language));
                      } finally {
                        setBusyChat(false);
                      }
                    }}
                    style={{ minWidth: 88 }}
                  />
                  <Button title={t('work.chat')} variant="outline" onPress={() => openChatWithApplicant(b.applicantId!)} style={{ minWidth: 88 }} />
                </View>
              ) : null}
              {isEmployer && b.applicantId && b.status === 'accepted' ? (
                <Button title={t('work.chat')} variant="outline" onPress={() => openChatWithApplicant(b.applicantId!)} style={{ minWidth: 88 }} />
              ) : null}
            </View>
          ))
        ) : (
          <Text style={[styles.meta, { color: colors.textSecondary }]}>{t('work.noBids')}</Text>
        )}

        {!isEmployer ? (
          <View style={[styles.applyBox, { borderColor: colors.border, backgroundColor: colors.cardBackground }]}>
            <Text style={[styles.section, { color: colors.text, marginTop: 0 }]}>{t('work.proposePrice')}</Text>
            <Text style={[styles.meta, { color: colors.textSecondary }]}>{t('work.proposeHint')}</Text>
            <TextInput
              value={amount}
              onChangeText={setAmount}
              keyboardType="numeric"
              placeholder={t('work.form.amount')}
              placeholderTextColor={colors.textSecondary}
              style={[styles.input, { color: colors.text, borderColor: colors.border }]}
            />
            <View style={styles.periodRow}>
              {(['project', 'hour', 'month'] as const).map((p) => (
                <Chip key={p} label={t(`work.period.${p}`)} active={period === p} onPress={() => setPeriod(p)} />
              ))}
            </View>
            <TextInput
              value={cover}
              onChangeText={setCover}
              multiline
              numberOfLines={4}
              placeholder={t('work.form.cover')}
              placeholderTextColor={colors.textSecondary}
              textAlignVertical="top"
              style={[styles.input, styles.cover, { color: colors.text, borderColor: colors.border }]}
            />
            {formError ? <Text style={{ color: colors.danger, marginBottom: 8 }}>{formError}</Text> : null}
            {!isAuthenticated ? (
              <Button title={t('work.detail.applyNow')} onPress={() => router.push('/auth/login')} />
            ) : (
              <View style={{ gap: 10 }}>
                <Button
                  title={myBid ? t('work.updateBid') : t('work.detail.applyNow')}
                  loading={applyMut.isPending}
                  onPress={() => {
                    if (!Number(amount)) {
                      setFormError(t('work.amountRequired'));
                      return;
                    }
                    applyMut.mutate();
                  }}
                />
                <Button title={t('work.messageEmployer')} variant="outline" loading={busyChat} onPress={openChatWithEmployer} />
              </View>
            )}
          </View>
        ) : (
          <Text style={[styles.meta, { color: colors.textSecondary, marginTop: 16 }]}>{t('work.employerHint')}</Text>
        )}
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  backBtn: { flexDirection: 'row', alignItems: 'center', minHeight: 44, marginLeft: -4, paddingRight: 8 },
  title: { fontSize: 24, fontWeight: '700', lineHeight: 32, marginTop: 8 },
  meta: { fontSize: 14, lineHeight: 20, marginTop: 8 },
  pay: { fontSize: 16, fontWeight: '800', marginTop: 12 },
  skills: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginVertical: 16 },
  body: { fontSize: 15, lineHeight: 24 },
  poster: {
    marginTop: 16,
    borderWidth: 1,
    borderRadius: 14,
    padding: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  posterIcon: { width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  msgBtn: { width: 40, height: 40, borderRadius: 12, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  section: { fontSize: 17, fontWeight: '700', marginTop: 22 },
  bid: {
    marginTop: 10,
    borderWidth: 1,
    borderRadius: 14,
    padding: 12,
    flexDirection: 'row',
    gap: 10,
    alignItems: 'center',
  },
  applyBox: { marginTop: 20, borderWidth: 1, borderRadius: 16, padding: 14, gap: 10 },
  input: { borderWidth: 1, borderRadius: 12, paddingHorizontal: 12, paddingVertical: 10, fontSize: 15 },
  cover: { minHeight: 100 },
  periodRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
});
