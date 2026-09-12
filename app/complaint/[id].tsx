import React from 'react';
import { ActivityIndicator, ScrollView, Text, View } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { complaintsApi } from '@/api';
import { useTheme } from '@/hooks/useT';
import { Screen } from '@/components/ui/Screen';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { formatDate } from '@/utils/format';

export default function ComplaintDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { colors } = useTheme();
  const q = useQuery({ queryKey: ['complaint', id], queryFn: () => complaintsApi.one(String(id)), enabled: !!id });
  if (q.isLoading) return <Screen><ActivityIndicator color={colors.tint} /></Screen>;
  const c = q.data;
  if (!c) return <Screen><Text style={{ color: colors.textSecondary }}>Not found</Text></Screen>;
  return (
    <Screen>
      <ScrollView>
        <Text style={{ color: colors.text, fontSize: 22, fontWeight: '700' }}>{c.caseRef}</Text>
        <View style={{ marginTop: 8 }}><StatusBadge status={c.status} /></View>
        <Text style={{ color: colors.text, marginTop: 16, lineHeight: 22 }}>{c.body}</Text>
        <Text style={{ color: colors.textSecondary, marginTop: 8 }}>{formatDate(c.createdAt)}</Text>
        {(c.events || []).map((e, i) => (
          <View key={i} style={{ marginTop: 12, borderLeftWidth: 2, borderColor: colors.tint, paddingLeft: 10 }}>
            <Text style={{ color: colors.text, fontWeight: '700' }}>{e.action}</Text>
            <Text style={{ color: colors.textSecondary }}>{e.note} · {formatDate(e.at)}</Text>
          </View>
        ))}
      </ScrollView>
    </Screen>
  );
}
