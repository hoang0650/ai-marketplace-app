import React from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Stack, useLocalSearchParams } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { workApi } from '@/api';
import { useTheme } from '@/hooks/useT';
import { useT } from '@/hooks/useT';
import { Screen } from '@/components/ui/Screen';
import { ErrorState } from '@/components/ui/ErrorState';
import { Chip } from '@/components/ui/Chip';
import { formatDate, formatJobPay } from '@/utils/format';
import { getErrorMessage } from '@/lib/errors';

export default function WorkJobScreen() {
  const { slug } = useLocalSearchParams<{ slug: string }>();
  const { colors } = useTheme();
  const { t, language } = useT();
  const q = useQuery({ queryKey: ['work', 'job', slug], queryFn: () => workApi.job(String(slug)), enabled: !!slug });

  if (q.isLoading) {
    return (
      <Screen>
        <Stack.Screen options={{ title: t('work.nav.jobs') }} />
        <ActivityIndicator color={colors.tint} style={{ marginTop: 40 }} />
      </Screen>
    );
  }
  if (q.isError || !q.data) {
    return (
      <Screen>
        <Stack.Screen options={{ title: t('work.nav.jobs') }} />
        <ErrorState message={q.isError ? getErrorMessage(q.error, language) : t('work.jobNotFound')} onRetry={() => q.refetch()} />
      </Screen>
    );
  }
  const job = q.data;
  return (
    <Screen>
      <Stack.Screen options={{ title: job.title }} />
      <ScrollView contentContainerStyle={{ paddingBottom: 40 }}>
        <Text style={[styles.title, { color: colors.text }]}>{job.title}</Text>
        <Text style={[styles.meta, { color: colors.textSecondary }]}>
          {job.company} · {job.remote ? t('work.remote') : job.location || t('work.onsite')}
        </Text>
        <Text style={[styles.pay, { color: colors.text }]}>{formatJobPay(job, t)}</Text>
        {job.employmentType ? (
          <Text style={[styles.meta, { color: colors.textSecondary }]}>{t(`work.type.${job.employmentType}`)}</Text>
        ) : null}
        <View style={styles.skills}>
          {(job.skills || []).map((s) => (
            <Chip key={s} label={s} />
          ))}
        </View>
        <Text style={[styles.body, { color: colors.text }]}>{job.description}</Text>
        <Text style={[styles.meta, { color: colors.textSecondary, marginTop: 16 }]}>
          {job.postedByName ? `${job.postedByName} · ` : ''}
          {formatDate(job.createdAt, language)}
        </Text>
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  title: { fontSize: 24, fontWeight: '700', lineHeight: 32, marginTop: 8 },
  meta: { fontSize: 14, lineHeight: 20, marginTop: 8 },
  pay: { fontSize: 16, fontWeight: '800', marginTop: 12 },
  skills: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginVertical: 16 },
  body: { fontSize: 15, lineHeight: 24 },
});
