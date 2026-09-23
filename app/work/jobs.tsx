import React, { useState } from 'react';
import { ActivityIndicator, FlatList, RefreshControl, StyleSheet, Text, View } from 'react-native';
import { Stack, useRouter } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { workApi } from '@/api';
import type { WorkJob } from '@/api/types';
import { href } from '@/lib/href';
import { useAuth } from '@/hooks/useAuth';
import { useTheme } from '@/hooks/useT';
import { useT } from '@/hooks/useT';
import { Screen } from '@/components/ui/Screen';
import { SearchBar } from '@/components/ui/SearchBar';
import { Button } from '@/components/ui/Button';
import { EmptyState } from '@/components/ui/EmptyState';
import { ErrorState } from '@/components/ui/ErrorState';
import { WorkJobCard } from '@/components/work/WorkCards';
import { WorkFieldChips } from '@/components/work/WorkFieldChips';
import { useDebouncedValue } from '@/hooks/useDebouncedValue';
import { getErrorMessage } from '@/lib/errors';

export default function WorkJobsScreen() {
  const router = useRouter();
  const { colors } = useTheme();
  const { t, language } = useT();
  const { isAuthenticated } = useAuth();
  const [q, setQ] = useState('');
  const [field, setField] = useState('');
  const debounced = useDebouncedValue(q, 400);

  const jobs = useQuery({
    queryKey: ['work', 'jobs', debounced, field],
    queryFn: () => workApi.jobs({ q: debounced.trim() || undefined, field: field || undefined }),
  });

  return (
    <Screen>
      <Stack.Screen options={{ title: t('work.nav.jobs') }} />
      <View style={styles.head}>
        <Text style={[styles.count, { color: colors.text }]}>
          {t('work.jobsTitle', { n: (jobs.data as WorkJob[] | undefined)?.length ?? 0 })}
        </Text>
        <SearchBar placeholder={t('work.search')} value={q} onChangeText={setQ} />
        <WorkFieldChips selected={field} onSelect={setField} />
      </View>

      {jobs.isLoading ? (
        <View style={styles.center}>
          <ActivityIndicator color={colors.tint} />
        </View>
      ) : jobs.isError ? (
        <ErrorState message={getErrorMessage(jobs.error, language)} onRetry={() => jobs.refetch()} />
      ) : (
        <FlatList
          data={(jobs.data as WorkJob[]) || []}
          keyExtractor={(item) => item.id}
          contentContainerStyle={{ paddingBottom: 32 }}
          refreshControl={<RefreshControl refreshing={jobs.isRefetching} onRefresh={() => jobs.refetch()} tintColor={colors.tint} />}
          ListEmptyComponent={<EmptyState title={t('work.noJobs')} />}
          renderItem={({ item }) => <WorkJobCard item={item} />}
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
  head: { marginBottom: 8, gap: 10 },
  count: { fontSize: 18, fontWeight: '700', marginTop: 4 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
});
