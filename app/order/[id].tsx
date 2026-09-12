import React, { useState } from 'react';
import { Alert, ScrollView, Text, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { href } from '@/lib/href';
import { useMutation, useQuery } from '@tanstack/react-query';
import { ordersApi } from '@/api';
import { useTheme } from '@/hooks/useT';
import { useT } from '@/hooks/useT';
import { Screen } from '@/components/ui/Screen';
import { Button } from '@/components/ui/Button';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { formatMoney, formatDate } from '@/utils/format';
import { getErrorMessage } from '@/lib/errors';
import { Input } from '@/components/ui/Input';
import { AnalyticsService } from '@/lib/analytics';

export default function OrderDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { colors } = useTheme();
  const { t, language } = useT();
  const [reason, setReason] = useState('');
  const list = useQuery({ queryKey: ['orders'], queryFn: ordersApi.list });
  const order = (list.data || []).find((o) => o.id === id);
  const dispute = useMutation({
    mutationFn: () => ordersApi.openDispute(String(id), reason || 'Buyer dispute'),
    onSuccess: () => {
      Alert.alert('AI Markets', 'OK');
      list.refetch();
    },
    onError: (e: Error) => Alert.alert('AI Markets', getErrorMessage(e, language)),
  });

  if (!order) {
    return (
      <Screen>
        <Text style={{ color: colors.textSecondary, marginTop: 24 }}>{t('common.empty')}</Text>
      </Screen>
    );
  }

  AnalyticsService.track('order_view', { id: order.id });

  return (
    <Screen>
      <ScrollView contentContainerStyle={{ paddingBottom: 40 }}>
        <Text style={{ color: colors.text, fontSize: 22, fontWeight: '700' }}>{order.productName}</Text>
        <View style={{ marginTop: 8 }}><StatusBadge status={order.status} /></View>
        <Text style={{ color: colors.text, fontWeight: '800', fontSize: 20, marginTop: 16 }}>{formatMoney(order.amount, order.currency)}</Text>
        <Text style={{ color: colors.textSecondary, marginTop: 6 }}>{formatDate(order.createdAt)}</Text>
        {order.taxAmount ? <Text style={{ color: colors.textSecondary, marginTop: 10 }}>Tax: {formatMoney(order.taxAmount, order.currency)}</Text> : null}
        <Button title={t('order.complaint')} variant="outline" onPress={() => router.push(href(`/complaint/create?orderId=${order.id}`))} style={{ marginTop: 20 }} />
        <Button title={t('order.review')} variant="outline" onPress={() => router.push(href(`/reviews/create?productId=${order.productId}`))} style={{ marginTop: 10 }} />
        {order.canDispute ? (
          <>
            <Input label={t('order.dispute')} value={reason} onChangeText={setReason} />
            <Button title={t('order.dispute')} variant="dark" loading={dispute.isPending} onPress={() => dispute.mutate()} />
          </>
        ) : null}
        <Button title={t('order.refund')} variant="outline" onPress={() => router.push(href(`/complaint/create?orderId=${order.id}`))} style={{ marginTop: 10 }} />
      </ScrollView>
    </Screen>
  );
}
