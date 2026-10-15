import React from 'react';
import { ActivityIndicator, FlatList, Pressable, RefreshControl, Text, View } from 'react-native';
import { Stack, router } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { complaintsApi } from '@/api';
import { useAuth } from '@/hooks/useAuth';
import { useT, useTheme } from '@/hooks/useT';
import { Screen } from '@/components/ui/Screen';
import { EmptyState } from '@/components/ui/EmptyState';
import { LoginPrompt } from '@/components/ui/LoginPrompt';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { formatDate } from '@/utils/format';
import { href } from '@/lib/href';

/** Buyer complaint list: status, product and link to the case timeline + messages. */
export default function ComplaintListScreen() {
  const { isAuthenticated } = useAuth();
  const { colors } = useTheme();
  const { t } = useT();
  const q = useQuery({ queryKey: ['complaints', 'mine'], queryFn: () => complaintsApi.list(), enabled: isAuthenticated });
  const title = <Stack.Screen options={{ title: t('bhub.complaints') }} />;
  if (!isAuthenticated) return <Screen>{title}<LoginPrompt /></Screen>;
  return (
    <Screen>
      {title}
      <Pressable onPress={() => router.push(href('/complaint/create'))} style={{ alignSelf: 'flex-start', borderWidth: 1, borderColor: colors.tint, borderRadius: 999, paddingHorizontal: 14, paddingVertical: 8, marginBottom: 12 }}>
        <Text style={{ color: colors.tint, fontWeight: '700' }}>{t('bhub.complaints.new')}</Text>
      </Pressable>
      {q.isLoading ? <ActivityIndicator color={colors.tint} /> : (
        <FlatList
          data={q.data || []}
          keyExtractor={(c) => c.id}
          refreshControl={<RefreshControl refreshing={q.isRefetching} onRefresh={() => q.refetch()} />}
          ListEmptyComponent={<EmptyState title={t('bhub.complaints.empty')} />}
          renderItem={({ item: c }) => (
            <Pressable onPress={() => router.push(href(`/complaint/${c.id}`))} style={{ paddingVertical: 12, borderBottomWidth: 1, borderColor: colors.border }}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                <Text style={{ color: colors.text, fontWeight: '700' }}>{c.caseRef}</Text>
                <StatusBadge status={c.status} />
              </View>
              <Text style={{ color: colors.textSecondary, marginTop: 4 }} numberOfLines={1}>{c.productName || '—'} · {formatDate(c.createdAt)}</Text>
            </Pressable>
          )}
        />
      )}
    </Screen>
  );
}
