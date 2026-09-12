import React from 'react';
import { Text, FlatList, Pressable } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import { href } from '@/lib/href';
import { complaintsApi, notificationsApi } from '@/api';
import { useAuth } from '@/hooks/useAuth';
import { useTheme } from '@/hooks/useT';
import { useT } from '@/hooks/useT';
import { Screen } from '@/components/ui/Screen';
import { LoginPrompt } from '@/components/ui/LoginPrompt';
import { EmptyState } from '@/components/ui/EmptyState';
import { StatusBadge } from '@/components/ui/StatusBadge';

export default function MessagesScreen() {
  const router = useRouter();
  const { isAuthenticated } = useAuth();
  const { colors } = useTheme();
  const { t } = useT();
  const complaints = useQuery({ queryKey: ['complaints', 'mine'], queryFn: () => complaintsApi.list('mine'), enabled: isAuthenticated });
  const notes = useQuery({ queryKey: ['notifications'], queryFn: notificationsApi.list, enabled: isAuthenticated });

  if (!isAuthenticated) return <LoginPrompt />;

  const threads = [
    { id: 'support', title: t('messages.support'), subtitle: t('help.contact'), onPress: () => router.push(href('/help')) },
    ...(complaints.data || []).map((c) => ({
      id: c.id,
      title: c.caseRef,
      subtitle: c.body.slice(0, 80),
      status: c.status,
      onPress: () => router.push(href(`/complaint/${c.id}`)),
    })),
  ];

  return (
    <Screen>
      <Text style={{ color: colors.text, fontSize: 24, fontWeight: '700', marginTop: 8, marginBottom: 12 }}>{t('nav.messages')}</Text>
      <FlatList
        data={threads}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <Pressable
            onPress={item.onPress}
            style={{ borderBottomWidth: 1, borderColor: colors.border, paddingVertical: 14 }}
          >
            <Text style={{ color: colors.text, fontWeight: '700' }}>{item.title}</Text>
            <Text style={{ color: colors.textSecondary, marginTop: 4 }}>{item.subtitle}</Text>
            {'status' in item && item.status ? <StatusBadge status={String(item.status)} /> : null}
          </Pressable>
        )}
        ListEmptyComponent={<EmptyState title={t('messages.empty')} />}
        ListFooterComponent={
          notes.data?.length ? (
            <Pressable onPress={() => router.push(href('/notifications'))} style={{ paddingVertical: 16 }}>
              <Text style={{ color: colors.tint, fontWeight: '700' }}>{t('settings.notifications')} ({notes.data.length})</Text>
            </Pressable>
          ) : null
        }
      />
    </Screen>
  );
}
