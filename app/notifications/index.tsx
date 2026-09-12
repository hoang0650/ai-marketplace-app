import React from 'react';
import { FlatList, Pressable, Text } from 'react-native';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { notificationsApi } from '@/api';
import { useAuth } from '@/hooks/useAuth';
import { useTheme } from '@/hooks/useT';
import { useT } from '@/hooks/useT';
import { Screen } from '@/components/ui/Screen';
import { LoginPrompt } from '@/components/ui/LoginPrompt';
import { Button } from '@/components/ui/Button';
import { formatDate } from '@/utils/format';
import { EmptyState } from '@/components/ui/EmptyState';

export default function NotificationsScreen() {
  const { isAuthenticated } = useAuth();
  const { colors } = useTheme();
  const { t } = useT();
  const qc = useQueryClient();
  const q = useQuery({ queryKey: ['notifications'], queryFn: notificationsApi.list, enabled: isAuthenticated });
  const read = useMutation({ mutationFn: notificationsApi.readAll, onSuccess: () => qc.invalidateQueries({ queryKey: ['notifications'] }) });
  if (!isAuthenticated) return <LoginPrompt />;
  return (
    <Screen>
      <Text style={{ color: colors.text, fontSize: 24, fontWeight: '700' }}>{t('settings.notifications')}</Text>
      <Button title="Read all" variant="outline" onPress={() => read.mutate()} style={{ marginVertical: 12 }} />
      <FlatList
        data={q.data || []}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <Pressable style={{ paddingVertical: 12, borderBottomWidth: 1, borderColor: colors.border, opacity: item.read ? 0.6 : 1 }}>
            <Text style={{ color: colors.text, fontWeight: '700' }}>{item.title}</Text>
            <Text style={{ color: colors.textSecondary }}>{item.body}</Text>
            <Text style={{ color: colors.textSecondary, fontSize: 11 }}>{formatDate(item.createdAt)}</Text>
          </Pressable>
        )}
        ListEmptyComponent={<EmptyState title={t('common.empty')} />}
      />
    </Screen>
  );
}
