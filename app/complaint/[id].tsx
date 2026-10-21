import React, { useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import { Stack, useLocalSearchParams } from 'expo-router';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Paperclip, Image as ImageIcon } from 'lucide-react-native';
import { complaintsApi } from '@/api';
import type { FileAttachment } from '@/api/types';
import { useAuth } from '@/hooks/useAuth';
import { useT, useTheme } from '@/hooks/useT';
import { Screen } from '@/components/ui/Screen';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { Attachments } from '@/components/chat/Attachments';
import { pickAndUpload } from '@/lib/attachments';
import { getErrorMessage } from '@/lib/errors';
import { formatDate } from '@/utils/format';

export default function ComplaintDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { colors } = useTheme();
  const { t, language } = useT();
  const { user } = useAuth();
  const qc = useQueryClient();
  const [body, setBody] = useState('');
  const [pending, setPending] = useState<FileAttachment[]>([]);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const q = useQuery({ queryKey: ['complaint', id], queryFn: () => complaintsApi.one(String(id)), enabled: !!id });
  if (q.isLoading) return <Screen><ActivityIndicator color={colors.tint} /></Screen>;
  const c = q.data;
  if (!c) return <Screen><Text style={{ color: colors.textSecondary }}>{getErrorMessage(q.error, language)}</Text></Screen>;

  const pick = async (kind: 'image' | 'file') => {
    try { setErr(''); const got = await pickAndUpload(kind, 'complaint', c.id); setPending((p) => [...p, ...got]); }
    catch (e) { setErr(getErrorMessage(e, language)); }
  };
  const send = async () => {
    if (!body.trim() && !pending.length) return;
    setBusy(true); setErr('');
    try {
      const next = await complaintsApi.message(c.id, body.trim(), pending.map((a) => a.id));
      qc.setQueryData(['complaint', id], next); setBody(''); setPending([]);
    } catch (e) { setErr(getErrorMessage(e, language)); }
    setBusy(false);
  };

  return (
    <Screen>
      <Stack.Screen options={{ title: c.caseRef }} />
      <ScrollView keyboardShouldPersistTaps="handled">
        <Text style={{ color: colors.text, fontSize: 22, fontWeight: '700' }}>{c.caseRef}</Text>
        <View style={{ marginTop: 8 }}><StatusBadge status={c.status} /></View>
        {c.productName ? <Text style={{ color: colors.textSecondary, marginTop: 8 }}>{c.productName}</Text> : null}
        <Text style={{ color: colors.text, marginTop: 12, lineHeight: 22 }}>{c.body}</Text>
        <Text style={{ color: colors.textSecondary, marginTop: 4 }}>{formatDate(c.createdAt)}</Text>
        {c.sellerResponse ? (
          <View style={{ marginTop: 16 }}>
            <Text style={{ color: colors.text, fontWeight: '700' }}>{t('complaint.thread.response')}</Text>
            <Text style={{ color: colors.text, marginTop: 4 }}>{c.sellerResponse}</Text>
          </View>
        ) : null}

        <Text style={{ color: colors.text, fontWeight: '700', fontSize: 16, marginTop: 20 }}>{t('complaint.thread.timeline')}</Text>
        {(c.events || []).map((e, i) => (
          <View key={i} style={{ marginTop: 10, borderLeftWidth: 2, borderColor: colors.tint, paddingLeft: 10 }}>
            <Text style={{ color: colors.text, fontWeight: '700' }}>{e.action}</Text>
            <Text style={{ color: colors.textSecondary }}>{e.note} · {formatDate(e.at)}</Text>
          </View>
        ))}

        <Text style={{ color: colors.text, fontWeight: '700', fontSize: 16, marginTop: 20 }}>{t('complaint.thread.title')}</Text>
        {(c.messages || []).length === 0 ? <Text style={{ color: colors.textSecondary, marginTop: 6 }}>{t('complaint.thread.empty')}</Text> : null}
        {(c.messages || []).map((m) => (
          <View key={m.id} style={{ marginTop: 10, padding: 10, borderRadius: 10, borderWidth: 1, borderColor: colors.border, backgroundColor: m.authorId === user?.id ? 'rgba(201,162,39,0.08)' : 'transparent' }}>
            <Text style={{ color: colors.textSecondary, fontSize: 12 }}>{t(`complaint.thread.role.${m.role}`)} · {m.at ? formatDate(m.at) : ''}</Text>
            {m.body ? <Text style={{ color: colors.text, marginTop: 4 }}>{m.body}</Text> : null}
            <Attachments items={m.attachments} />
          </View>
        ))}

        {c.status !== 'closed' ? (
          <View style={{ marginTop: 14 }}>
            {pending.length ? <Attachments items={pending} /> : null}
            <TextInput value={body} onChangeText={setBody} multiline placeholder={t('complaint.thread.ph')} placeholderTextColor={colors.textSecondary}
              style={{ minHeight: 70, borderWidth: 1, borderColor: colors.border, borderRadius: 10, padding: 10, color: colors.text, marginTop: 8 }} />
            <View style={{ flexDirection: 'row', gap: 12, alignItems: 'center', marginTop: 8 }}>
              <Pressable onPress={() => pick('image')} hitSlop={8}><ImageIcon size={22} color={colors.tint} /></Pressable>
              <Pressable onPress={() => pick('file')} hitSlop={8}><Paperclip size={22} color={colors.tint} /></Pressable>
              <Pressable disabled={busy} onPress={send} style={{ marginLeft: 'auto', backgroundColor: colors.tint, borderRadius: 999, paddingHorizontal: 18, paddingVertical: 9, opacity: busy ? 0.6 : 1 }}>
                <Text style={{ color: '#fff', fontWeight: '700' }}>{t('complaint.thread.send')}</Text>
              </Pressable>
            </View>
            {err ? <Text style={{ color: '#b42318', marginTop: 6 }}>{err}</Text> : null}
          </View>
        ) : null}
      </ScrollView>
    </Screen>
  );
}
