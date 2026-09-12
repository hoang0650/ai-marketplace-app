import React from 'react';
import { FlatList, Pressable, Text } from 'react-native';
import { useRouter } from 'expo-router';
import { href } from '@/lib/href';
import { useQuery } from '@tanstack/react-query';
import { complaintsApi } from '@/api';
import { useTheme } from '@/hooks/useT';
import { Screen } from '@/components/ui/Screen';
import { StatusBadge } from '@/components/ui/StatusBadge';

export default function SellerComplaintsScreen() {
  const router = useRouter();
  const { colors } = useTheme();
  const q = useQuery({ queryKey: ['complaints', 'seller'], queryFn: () => complaintsApi.list('seller') });
  return (
    <Screen>
      <Text style={{ color: colors.text, fontSize: 22, fontWeight: '700', marginBottom: 12 }}>Complaints</Text>
      <FlatList
        data={q.data || []}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <Pressable onPress={() => router.push(href(`/complaint/${item.id}`))} style={{ paddingVertical: 14, borderBottomWidth: 1, borderColor: colors.border }}>
            <Text style={{ color: colors.text, fontWeight: '700' }}>{item.caseRef}</Text>
            <StatusBadge status={item.status} />
          </Pressable>
        )}
      />
    </Screen>
  );
}
