import React from 'react';
import { Alert, Platform, ScrollView, Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { walletApi } from '@/api';
import { useAuth } from '@/hooks/useAuth';
import { useTheme } from '@/hooks/useT';
import { useT } from '@/hooks/useT';
import { Screen } from '@/components/ui/Screen';
import { LoginPrompt } from '@/components/ui/LoginPrompt';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { IapTopup } from '@/components/wallet/IapTopup';
import { formatMoney, formatDate } from '@/utils/format';
import { getErrorMessage } from '@/lib/errors';

export default function WalletScreen() {
  const qc = useQueryClient();
  const { isAuthenticated, isCreator } = useAuth();
  const { colors } = useTheme();
  const { t, language } = useT();
  const [amount, setAmount] = React.useState('10');

  const summary = useQuery({ queryKey: ['wallet-summary'], queryFn: walletApi.summary, enabled: isAuthenticated });
  const txs = useQuery({ queryKey: ['wallet-txs'], queryFn: walletApi.list, enabled: isAuthenticated });

  const withdraw = useMutation({
    mutationFn: () => walletApi.withdraw(Number(amount)),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['wallet-summary'] });
      qc.invalidateQueries({ queryKey: ['wallet-txs'] });
      Alert.alert('AI Markets', t('wallet.pending'));
    },
    onError: (e: Error) => Alert.alert('AI Markets', getErrorMessage(e, language)),
  });

  if (!isAuthenticated) return <LoginPrompt />;
  const s = summary.data;
  const cur = s?.currency || 'USD';

  return (
    <Screen padded={false}>
      <ScrollView contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 32 }}>
        <Text style={{ color: colors.text, fontSize: 24, fontWeight: '700', marginTop: 8 }}>{t('wallet.title')}</Text>
        <Text style={{ color: colors.textSecondary, marginTop: 8, lineHeight: 20 }}>{t('wallet.legalHint')}</Text>
        <LinearGradient colors={['#111111', '#2a2520']} style={{ borderRadius: 16, padding: 20, marginTop: 16 }}>
          <Text style={{ color: 'rgba(245,240,232,0.7)', fontSize: 12, letterSpacing: 1, textTransform: 'uppercase' }}>{t('wallet.balance')}</Text>
          <Text style={{ color: '#c9a961', fontSize: 30, fontWeight: '800', marginTop: 6 }}>{formatMoney(s?.balance ?? 0, cur)}</Text>
          <Text style={{ color: 'rgba(245,240,232,0.72)', marginTop: 6 }}>{t('wallet.available')}: {formatMoney(s?.available ?? 0, cur)}</Text>
        </LinearGradient>

        <IapTopup />

        {isCreator ? (
          <View style={{ marginTop: 20 }}>
            <Input label={`${t('wallet.payout')} (USD)`} keyboardType="numeric" value={amount} onChangeText={setAmount} />
            <Button title={t('wallet.payout')} variant="dark" onPress={() => withdraw.mutate()} loading={withdraw.isPending} />
          </View>
        ) : null}

        <Text style={{ color: colors.text, fontWeight: '700', marginTop: 20, marginBottom: 8 }}>{t('wallet.history')}</Text>
        {(txs.data || []).map((item) => {
          const debit = item.type === 'debit' || item.type === 'withdraw';
          const note = (item.note || '').toLowerCase();
          const methodLabel = item.paymentMethod === 'iap' || note.includes('app store') || note.includes('google play') || note.includes(' iap')
            ? Platform.OS === 'ios' ? t('wallet.method.iapIos') : t('wallet.method.iapAndroid')
            : note.includes('apple')
              ? t('wallet.method.apple')
              : note.includes('google')
                ? t('wallet.method.gpay')
                : item.paymentMethod === 'paypal' || note.includes('paypal')
                  ? t('wallet.method.paypal')
                  : item.type;
          return (
            <View key={item.id} style={{ flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 12, borderBottomWidth: 1, borderColor: colors.border }}>
              <View style={{ flex: 1 }}>
                <Text style={{ color: colors.text, fontWeight: '700' }}>{methodLabel} · {item.status || 'completed'}</Text>
                <Text style={{ color: colors.textSecondary, fontSize: 12 }}>{item.note || formatDate(item.createdAt)}</Text>
              </View>
              <Text style={{ color: debit ? colors.danger : colors.success, fontWeight: '800' }}>
                {debit ? '−' : '+'}
                {formatMoney(item.amount, item.currency)}
              </Text>
            </View>
          );
        })}
      </ScrollView>
    </Screen>
  );
}
