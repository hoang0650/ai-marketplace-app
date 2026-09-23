import React, { useState } from 'react';
import { ActivityIndicator, FlatList, RefreshControl, StyleSheet, Text, View } from 'react-native';
import { Stack } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { workApi } from '@/api';
import type { WorkTalent } from '@/api/types';
import { useTheme } from '@/hooks/useT';
import { useT } from '@/hooks/useT';
import { Screen } from '@/components/ui/Screen';
import { SearchBar } from '@/components/ui/SearchBar';
import { EmptyState } from '@/components/ui/EmptyState';
import { ErrorState } from '@/components/ui/ErrorState';
import { WorkTalentCard } from '@/components/work/WorkCards';
import { WorkFieldChips } from '@/components/work/WorkFieldChips';
import { useDebouncedValue } from '@/hooks/useDebouncedValue';
import { getErrorMessage } from '@/lib/errors';

export default function WorkTalentsScreen() {
  const { colors } = useTheme();
  const { t, language } = useT();
  const [q, setQ] = useState('');
  const [field, setField] = useState('');
  const debounced = useDebouncedValue(q, 400);

  const talents = useQuery({
    queryKey: ['work', 'talents', debounced, field],
    queryFn: () => workApi.talents({ q: debounced.trim() || undefined, field: field || undefined }),
  });

  return (
    <Screen>
      <Stack.Screen options={{ title: t('work.nav.talents') }} />
      <View style={styles.head}>
        <Text style={[styles.count, { color: colors.text }]}>
          {t('work.talentsTitle', { n: (talents.data as WorkTalent[] | undefined)?.length ?? 0 })}
        </Text>
        <SearchBar placeholder={t('work.search')} value={q} onChangeText={setQ} />
        <WorkFieldChips selected={field} onSelect={setField} />
      </View>

      {talents.isLoading ? (
        <View style={styles.center}>
          <ActivityIndicator color={colors.tint} />
        </View>
      ) : talents.isError ? (
        <ErrorState message={getErrorMessage(talents.error, language)} onRetry={() => talents.refetch()} />
      ) : (
        <FlatList
          data={(talents.data as WorkTalent[]) || []}
          keyExtractor={(item) => item.id}
          contentContainerStyle={{ paddingBottom: 32 }}
          refreshControl={
            <RefreshControl refreshing={talents.isRefetching} onRefresh={() => talents.refetch()} tintColor={colors.tint} />
          }
          ListEmptyComponent={<EmptyState title={t('work.noTalents')} />}
          renderItem={({ item }) => <WorkTalentCard item={item} />}
        />
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  head: { marginBottom: 8, gap: 10 },
  count: { fontSize: 18, fontWeight: '700', marginTop: 4 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
});
