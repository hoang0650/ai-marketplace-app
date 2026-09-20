import React, { useMemo, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  Text,
  TextInput,
  View,
} from 'react-native';
import { Image } from 'expo-image';
import * as ImagePicker from 'expo-image-picker';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Image as ImageIcon, Send } from 'lucide-react-native';
import { href } from '@/lib/href';
import { chatApi } from '@/api';
import type { ChatMessage } from '@/api/types';
import { useAuth } from '@/hooks/useAuth';
import { useTheme } from '@/hooks/useT';
import { useT } from '@/hooks/useT';
import { Screen } from '@/components/ui/Screen';
import { getErrorMessage, ApiError } from '@/lib/errors';
import { containsBlockedLink } from '@/lib/chat-security';
import { formatDate } from '@/utils/format';

async function formFromAsset(asset: ImagePicker.ImagePickerAsset): Promise<FormData> {
  const form = new FormData();
  const name = asset.fileName || 'chat.jpg';
  const type = asset.mimeType || 'image/jpeg';
  if (Platform.OS === 'web') {
    const blob = await fetch(asset.uri).then((r) => r.blob());
    form.append('image', blob, name);
  } else {
    form.append('image', { uri: asset.uri, name, type } as unknown as Blob);
  }
  return form;
}

export default function ChatThreadScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const conversationId = String(id || '');
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { user } = useAuth();
  const { colors } = useTheme();
  const { t, language } = useT();
  const qc = useQueryClient();
  const [draft, setDraft] = useState('');
  const [error, setError] = useState('');

  const convo = useQuery({
    queryKey: ['chat', 'conversation', conversationId],
    queryFn: () => chatApi.conversation(conversationId),
    enabled: !!conversationId,
  });
  const msgs = useQuery({
    queryKey: ['chat', 'messages', conversationId],
    queryFn: () => chatApi.messages(conversationId),
    enabled: !!conversationId,
    refetchInterval: 8000,
  });

  const send = useMutation({
    mutationFn: (body: { body?: string; imageUrl?: string }) => chatApi.send(conversationId, body),
    onSuccess: () => {
      setDraft('');
      setError('');
      void qc.invalidateQueries({ queryKey: ['chat', 'messages', conversationId] });
      void qc.invalidateQueries({ queryKey: ['chat', 'conversations'] });
    },
    onError: (err) => setError(mapChatError(err, t, language)),
  });

  const upload = useMutation({
    mutationFn: async () => {
      const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!perm.granted) throw new ApiError(403, 'PHOTOS', t('chat.needPhotos'));
      const picked = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        quality: 0.85,
      });
      if (picked.canceled || !picked.assets?.[0]) return null;
      const form = await formFromAsset(picked.assets[0]);
      const up = await chatApi.uploadImage(form);
      const caption = draft.trim();
      if (caption && containsBlockedLink(caption)) throw new ApiError(400, 'LINKS_NOT_ALLOWED', t('chat.noLinks'));
      return chatApi.send(conversationId, { imageUrl: up.url, body: caption || undefined });
    },
    onSuccess: (msg) => {
      if (!msg) return;
      setDraft('');
      setError('');
      void qc.invalidateQueries({ queryKey: ['chat', 'messages', conversationId] });
      void qc.invalidateQueries({ queryKey: ['chat', 'conversations'] });
    },
    onError: (err) => setError(mapChatError(err, t, language)),
  });

  const items = useMemo(() => msgs.data || [], [msgs.data]);
  const busy = send.isPending || upload.isPending;
  const me = String(user?.id || '');

  const onSend = () => {
    const text = draft.trim();
    if (!text || busy) return;
    if (containsBlockedLink(text)) {
      setError(t('chat.noLinks'));
      return;
    }
    send.mutate({ body: text });
  };

  return (
    <Screen padded={false}>
      <Stack.Screen options={{ title: convo.data?.productName || t('nav.messages'), headerShown: true }} />
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined} keyboardVerticalOffset={88}>
        {convo.data ? (
          <Pressable
            onPress={() => router.push(href(`/product/${convo.data!.productSlug}`))}
            style={{ flexDirection: 'row', gap: 10, alignItems: 'center', paddingHorizontal: 16, paddingVertical: 10, borderBottomWidth: 1, borderColor: colors.border }}
          >
            {convo.data.productCover ? (
              <Image source={{ uri: convo.data.productCover }} style={{ width: 36, height: 36, borderRadius: 8 }} contentFit="cover" />
            ) : null}
            <View style={{ flex: 1 }}>
              <Text style={{ color: colors.text, fontWeight: '700' }} numberOfLines={1}>
                {convo.data.productName}
              </Text>
              <Text style={{ color: colors.textSecondary, fontSize: 12 }}>
                {convo.data.otherName} · {t(convo.data.role === 'seller' ? 'chat.role.buyer' : 'chat.role.seller')}
              </Text>
            </View>
          </Pressable>
        ) : null}

        {error ? <Text style={{ color: colors.danger, paddingHorizontal: 16, paddingTop: 8 }}>{error}</Text> : null}

        {msgs.isLoading ? (
          <ActivityIndicator color={colors.tint} style={{ marginTop: 24 }} />
        ) : (
          <FlatList
            data={items}
            keyExtractor={(item) => item.id}
            contentContainerStyle={{ padding: 16, paddingBottom: 8, gap: 8 }}
            renderItem={({ item }) => <Bubble item={item} mine={String(item.senderId) === me} />}
          />
        )}

        <View
          style={{
            flexDirection: 'row',
            alignItems: 'flex-end',
            gap: 8,
            paddingHorizontal: 12,
            paddingTop: 8,
            paddingBottom: Math.max(insets.bottom, 10),
            borderTopWidth: 1,
            borderColor: colors.border,
            backgroundColor: colors.surface,
          }}
        >
          <Pressable
            onPress={() => upload.mutate()}
            disabled={busy}
            accessibilityRole="button"
            accessibilityLabel={t('chat.attach')}
            style={{ width: 44, height: 44, alignItems: 'center', justifyContent: 'center' }}
          >
            <ImageIcon size={22} color={colors.text} />
          </Pressable>
          <TextInput
            value={draft}
            onChangeText={setDraft}
            placeholder={t('chat.placeholder')}
            placeholderTextColor={colors.textSecondary}
            multiline
            maxLength={2000}
            style={{
              flex: 1,
              minHeight: 44,
              maxHeight: 120,
              borderWidth: 1,
              borderColor: colors.border,
              borderRadius: 12,
              paddingHorizontal: 12,
              paddingVertical: 10,
              color: colors.text,
              backgroundColor: colors.cardBackground,
            }}
          />
          <Pressable
            onPress={onSend}
            disabled={busy || !draft.trim()}
            accessibilityRole="button"
            accessibilityLabel={t('chat.send')}
            style={{ width: 44, height: 44, alignItems: 'center', justifyContent: 'center', opacity: busy || !draft.trim() ? 0.45 : 1 }}
          >
            {busy ? <ActivityIndicator color={colors.tint} /> : <Send size={22} color={colors.tint} />}
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </Screen>
  );
}

function Bubble({ item, mine }: { item: ChatMessage; mine: boolean }) {
  const { colors } = useTheme();
  const { language } = useT();
  return (
    <View
      style={{
        alignSelf: mine ? 'flex-end' : 'flex-start',
        maxWidth: '82%',
        backgroundColor: mine ? colors.luxDark : colors.cardBackground,
        borderColor: colors.border,
        borderWidth: 1,
        borderRadius: 14,
        padding: 10,
      }}
    >
      {item.kind === 'image' && item.imageUrl ? (
        <Image source={{ uri: item.imageUrl }} style={{ width: 220, height: 220, borderRadius: 10, marginBottom: item.body ? 8 : 0 }} contentFit="cover" />
      ) : null}
      {item.body ? <Text style={{ color: mine ? '#f2efe8' : colors.text, lineHeight: 20 }}>{item.body}</Text> : null}
      <Text style={{ color: mine ? '#c9a961' : colors.textSecondary, fontSize: 11, marginTop: 6 }}>
        {formatDate(item.createdAt, language)}
      </Text>
    </View>
  );
}

function mapChatError(err: unknown, t: (k: string) => string, language: 'vi' | 'en'): string {
  if (err instanceof ApiError) {
    if (err.code === 'LINKS_NOT_ALLOWED') return t('chat.noLinks');
    if (err.code === 'IMAGE_HOST_NOT_ALLOWED') return t('chat.imageOnlyHost');
    if (err.code === 'CHAT_SELF') return t('chat.self');
    if (err.code === 'PHOTOS') return t('chat.needPhotos');
  }
  return getErrorMessage(err, language);
}
