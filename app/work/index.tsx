import React, { useState } from 'react';
import { ActivityIndicator, FlatList, Pressable, RefreshControl, StyleSheet, Text, View } from 'react-native';
import { Stack, useRouter } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { Briefcase, Users } from 'lucide-react-native';
import { workApi } from '@/api';
import type { WorkJob, WorkTalent } from '@/api/types';
import { href } from '@/lib/href';
import { useAuth } from '@/hooks/useAuth';
import { useTheme } from '@/hooks/useT';
import { useT } from '@/hooks/useT';
import { Screen } from '@/components/ui/Screen';
import { SearchBar } from '@/components/ui/SearchBar';
import { Chip } from '@/components/ui/Chip';
import { Button } from '@/components/ui/Button';
import { EmptyState } from '@/components/ui/EmptyState';
import { ErrorState } from '@/components/ui/ErrorState';
import { useDebouncedValue } from '@/hooks/useDebouncedValue';
import { formatJobPay, formatMoney } from '@/utils/format';
import { getErrorMessage } from '@/lib/errors';
import { displayFont } from '@/constants/fonts';
import { HubBackButton } from '@/components/catalog/HubBackButton';

type Tab = 'jobs' | 'talents';

export default function WorkHubScreen() {
  const router = useRouter();
  const { colors } = useTheme();
  const { t, language } = useT();
  const { isAuthenticated } = useAuth();
  const [tab, setTab] = useState<Tab>('jobs');
  const [q, setQ] = useState('');
  const debounced = useDebouncedValue(q, 400);

  const jobs = useQuery({
    queryKey: ['work', 'jobs', debounced],
    queryFn: () => workApi.jobs(debounced.trim() || undefined),
    enabled: tab === 'jobs',
  });
  const talents = useQuery({
    queryKey: ['work', 'talents', debounced],
    queryFn: () => workApi.talents(debounced.trim() || undefined),
    enabled: tab === 'talents',
  });

  const active = tab === 'jobs' ? jobs : talents;

  return (
    <Screen>
      <Stack.Screen options={{ title: t('work.title'), headerLeft: () => <HubBackButton />, headerBackVisible: false }} />
      <View style={styles.head}>
        <Text style={[styles.title, { color: colors.text }]}>{t('work.title')}</Text>
        <Text style={[styles.lede, { color: colors.textSecondary }]}>{t('work.lede')}</Text>
        <View style={{ marginTop: 14 }}>
          <SearchBar placeholder={t('work.search')} value={q} onChangeText={setQ} />
        </View>
        <View style={styles.tabs}>
          <Chip label={t('work.nav.jobs')} active={tab === 'jobs'} onPress={() => setTab('jobs')} />
          <Chip label={t('work.nav.talents')} active={tab === 'talents'} onPress={() => setTab('talents')} />
        </View>
      </View>

      {active.isLoading ? (
        <View style={styles.center}>
          <ActivityIndicator color={colors.tint} />
        </View>
      ) : active.isError ? (
        <ErrorState message={getErrorMessage(active.error, language)} onRetry={() => active.refetch()} />
      ) : tab === 'jobs' ? (
        <FlatList
          data={(jobs.data as WorkJob[]) || []}
          keyExtractor={(item) => item.id}
          contentContainerStyle={{ paddingBottom: 32 }}
          refreshControl={<RefreshControl refreshing={jobs.isRefetching} onRefresh={() => jobs.refetch()} tintColor={colors.tint} />}
          ListEmptyComponent={<EmptyState title={t('work.noJobs')} />}
          renderItem={({ item }) => (
            <Pressable
              onPress={() => router.push(href(`/work/job/${item.slug}`))}
              style={[styles.card, { backgroundColor: colors.cardBackground, borderColor: colors.border }]}
            >
              <View style={styles.cardIcon}>
                <Briefcase size={18} color={colors.text} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[styles.cardTitle, { color: colors.text }]}>{item.title}</Text>
                <Text style={[styles.cardMeta, { color: colors.textSecondary }]}>
                  {item.company} · {item.remote ? t('work.remote') : item.location || t('work.onsite')}
                </Text>
                <Text style={[styles.cardPay, { color: colors.text }]}>{formatJobPay(item, t)}</Text>
              </View>
            </Pressable>
          )}
        />
      ) : (
        <FlatList
          data={(talents.data as WorkTalent[]) || []}
          keyExtractor={(item) => item.id}
          contentContainerStyle={{ paddingBottom: 32 }}
          refreshControl={<RefreshControl refreshing={talents.isRefetching} onRefresh={() => talents.refetch()} tintColor={colors.tint} />}
          ListEmptyComponent={<EmptyState title={t('work.noTalents')} />}
          renderItem={({ item }) => (
            <Pressable
              onPress={() => router.push(href(`/work/talent/${item.slug}`))}
              style={[styles.card, { backgroundColor: colors.cardBackground, borderColor: colors.border }]}
            >
              <View style={styles.cardIcon}>
                <Users size={18} color={colors.text} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[styles.cardTitle, { color: colors.text }]}>{item.name}</Text>
                <Text style={[styles.cardMeta, { color: colors.textSecondary }]}>{item.title}</Text>
                <Text style={[styles.cardPay, { color: colors.text }]}>
                  {item.rateNegotiable || !item.rateAmount
                    ? t('work.negotiable')
                    : `${formatMoney(item.rateAmount, item.rateCurrency || 'VND')} / ${t('work.period.hour')}`}
                </Text>
              </View>
            </Pressable>
          )}
        />
      )}

      <View style={{ paddingBottom: 12 }}>
        <Button
          title={t('work.postJob')}
          variant="outline"
          onPress={() => router.push(isAuthenticated ? href('/work/post') : '/auth/login')}
        />
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  head: { marginBottom: 8 },
  title: { fontSize: 28, fontFamily: displayFont, fontWeight: '600', marginTop: 4 },
  lede: { fontSize: 14, lineHeight: 20, marginTop: 8 },
  tabs: { flexDirection: 'row', gap: 8, marginTop: 14, marginBottom: 8 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  card: {
    flexDirection: 'row',
    gap: 12,
    borderWidth: 1,
    borderRadius: 16,
    padding: 14,
    marginBottom: 10,
    minHeight: 88,
    alignItems: 'center',
  },
  cardIcon: { width: 40, height: 40, borderRadius: 10, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(201,169,97,0.16)' },
  cardTitle: { fontSize: 15, fontWeight: '700', lineHeight: 20 },
  cardMeta: { fontSize: 13, marginTop: 4, lineHeight: 18 },
  cardPay: { fontSize: 13, fontWeight: '700', marginTop: 6 },
});
