import React from 'react';
import { Text } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { href } from '@/lib/href';
import { useQuery } from '@tanstack/react-query';
import { ordersApi } from '@/api';
import { useTheme } from '@/hooks/useT';
import { Screen } from '@/components/ui/Screen';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { Button } from '@/components/ui/Button';

export default function DisputeScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { colors } = useTheme();
  const q = useQuery({ queryKey: ['order-disputes'], queryFn: ordersApi.disputes });
  const order = (q.data || []).find((o) => o.id === id);
  return (
    <Screen>
      <Text style={{ color: colors.text, fontSize: 22, fontWeight: '700' }}>Dispute</Text>
      {order ? (
        <>
          <Text style={{ color: colors.text, marginTop: 12 }}>{order.productName}</Text>
          <StatusBadge status={order.disputeStatus || 'open'} />
          <Text style={{ color: colors.textSecondary, marginTop: 8 }}>{order.disputeReason}</Text>
        </>
      ) : (
        <Text style={{ color: colors.textSecondary, marginTop: 12 }}>No dispute record for this id.</Text>
      )}
      <Button title="Complaint" variant="outline" onPress={() => router.push(href('/protection'))} style={{ marginTop: 20 }} />
    </Screen>
  );
}
