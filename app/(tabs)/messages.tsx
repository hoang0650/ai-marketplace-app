import React from 'react';
import { Text, FlatList, Pressable, View } from 'react-native';
import { Image } from 'expo-image';
import { useQuery } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import { href } from '@/lib/href';
import { chatApi, complaintsApi } from '@/api';
import { useAuth } from '@/hooks/useAuth';
import { useTheme } from '@/hooks/useT';
import { useT } from '@/hooks/useT';
import { Screen } from '@/components/ui/Screen';
import { LoginPrompt } from '@/components/ui/LoginPrompt';
import { EmptyState } from '@/components/ui/EmptyState';
import { ErrorState } from '@/components/ui/ErrorState';
import { getErrorMessage } from '@/lib/errors';
import { formatDate } from '@/utils/format';

export default function MessagesScreen() {
  const router = useRouter();
  const { isAuthenticated } = useAuth();
  const { colors } = useTheme();
  const { t, language } = useT();
  const chats = useQuery({
    queryKey: ['chat', 'conversations'],
    queryFn: chatApi.conversations,
    enabled: isAuthenticated,
    refetchInterval: 8000,
    retry: 2,
  });
  const complaints = useQuery({
    queryKey: ['complaints', 'mine'],
    queryFn: () => complaintsApi.list('mine'),
    enabled: isAuthenticated,
  });

  if (!isAuthenticated) return <LoginPrompt />;

  const conversations = chats.data || [];

  return (
    <Screen>
      <Text style={{ color: colors.text, fontSize: 24, fontWeight: '700', marginTop: 8, marginBottom: 4 }}>{t('nav.messages')}</Text>
      <Text style={{ color: colors.textSecondary, marginBottom: 12, lineHeight: 20 }}>{t('chat.lede')}</Text>
      <FlatList
        data={conversations}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <Pressable
            onPress={() => router.push(href(`/chat/${item.id}`))}
            style={{
              flexDirection: 'row',
              gap: 12,
              alignItems: 'center',
              borderBottomWidth: 1,
              borderColor: colors.border,
              paddingVertical: 14,
            }}
          >
            {item.productCover ? (
              <Image source={{ uri: item.productCover }} style={{ width: 48, height: 48, borderRadius: 10 }} contentFit="cover" />
            ) : (
              <View style={{ width: 48, height: 48, borderRadius: 10, backgroundColor: colors.luxDark }} />
            )}
            <View style={{ flex: 1, minWidth: 0 }}>
              <Text style={{ color: colors.text, fontWeight: '700' }} numberOfLines={1}>
                {item.productName || t('chat.product')}
              </Text>
              <Text style={{ color: colors.textSecondary, marginTop: 4 }} numberOfLines={2}>
                {item.otherName}
                {item.lastKind === 'image' ? ` · ${t('chat.image')}` : ''}
                {item.lastMessage ? ` · ${item.lastMessage}` : ''}
              </Text>
              {item.lastMessageAt ? (
                <Text style={{ color: colors.textSecondary, marginTop: 2, fontSize: 11 }}>{formatDate(item.lastMessageAt, language)}</Text>
              ) : null}
            </View>
            {item.unread > 0 ? (
              <View style={{ minWidth: 22, height: 22, borderRadius: 11, backgroundColor: colors.tint, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 6 }}>
                <Text style={{ color: colors.tintText, fontSize: 11, fontWeight: '800' }}>{item.unread}</Text>
              </View>
            ) : null}
          </Pressable>
        )}
        ListEmptyComponent={
          chats.isError ? (
            <ErrorState message={getErrorMessage(chats.error, language)} onRetry={() => chats.refetch()} />
          ) : (
            <EmptyState title={t('chat.empty')} hint={t('chat.lede')} />
          )
        }
        ListFooterComponent={
          <View style={{ paddingVertical: 16 }}>
            <Pressable onPress={() => router.push(href('/help'))} style={{ paddingVertical: 12 }}>
              <Text style={{ color: colors.tint, fontWeight: '700' }}>{t('messages.support')}</Text>
            </Pressable>
            {(complaints.data || []).slice(0, 5).map((c) => (
              <Pressable key={c.id} onPress={() => router.push(href(`/complaint/${c.id}`))} style={{ paddingVertical: 12 }}>
                <Text style={{ color: colors.text, fontWeight: '600' }}>{c.caseRef}</Text>
                <Text style={{ color: colors.textSecondary, marginTop: 4 }} numberOfLines={1}>
                  {c.body}
                </Text>
              </Pressable>
            ))}
          </View>
        }
      />
    </Screen>
  );
}
