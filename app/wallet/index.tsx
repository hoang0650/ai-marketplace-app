import React from 'react';
import { Alert, Platform, Pressable, ScrollView, Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import { walletApi } from '@/api';
import { useAuth } from '@/hooks/useAuth';
import { useTheme } from '@/hooks/useT';
import { useT } from '@/hooks/useT';
import { Screen } from '@/components/ui/Screen';
import { LoginPrompt } from '@/components/ui/LoginPrompt';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { IapTopup } from '@/components/wallet/IapTopup';
import { displayFont } from '@/constants/fonts';
import { formatMoney, formatDate } from '@/utils/format';
import { getErrorMessage } from '@/lib/errors';

export default function WalletScreen() {
  const qc = useQueryClient();
  const router = useRouter();
  const { isAuthenticated, isCreator } = useAuth();
  const { colors } = useTheme();
  const { t, language } = useT();
  const [payout, setPayout] = React.useState('10');

  const summary = useQuery({ queryKey: ['wallet-summary'], queryFn: walletApi.summary, enabled: isAuthenticated });
  const txs = useQuery({ queryKey: ['wallet-txs'], queryFn: walletApi.list, enabled: isAuthenticated });

  const withdraw = useMutation({
    mutationFn: () => walletApi.withdraw(Number(payout)),
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
      <ScrollView contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 40 }} keyboardShouldPersistTaps="handled">
        <Text style={{ color: colors.text, fontSize: 28, fontFamily: displayFont, fontWeight: '600', marginTop: 8 }}>
          {t('wallet.title')}
        </Text>
        <Text style={{ color: colors.textSecondary, marginTop: 8, lineHeight: 21, fontSize: 14 }}>{t('wallet.legalHint')}</Text>

        <LinearGradient colors={['#111111', '#2a2520']} style={{ borderRadius: 18, padding: 20, marginTop: 18 }}>
          <Text style={{ color: 'rgba(245,240,232,0.7)', fontSize: 11, fontWeight: '700' }}>{t('wallet.balance')}</Text>
          <Text style={{ color: '#c9a961', fontSize: 34, fontWeight: '800', marginTop: 6 }}>{formatMoney(s?.balance ?? 0, cur)}</Text>
          <Text style={{ color: 'rgba(245,240,232,0.72)', marginTop: 8, fontSize: 13 }}>
            {t('wallet.available')}: {formatMoney(s?.available ?? 0, cur)}
          </Text>
        </LinearGradient>

        <IapTopup />

        {isCreator ? (
          <View style={{ marginTop: 28 }}>
            <Text style={{ color: colors.text, fontSize: 18, fontWeight: '700' }}>{t('wallet.payout')}</Text>
            <Input
              label={`${t('wallet.payout')} (USD)`}
              keyboardType="numeric"
              value={payout}
              onChangeText={setPayout}
              style={{ marginTop: 8 }}
            />
            <Button title={t('wallet.payout')} variant="outline" onPress={() => withdraw.mutate()} loading={withdraw.isPending} />
          </View>
        ) : null}

        <Text style={{ color: colors.text, fontSize: 18, fontWeight: '700', marginTop: 28, marginBottom: 4 }}>{t('wallet.history')}</Text>
        <Pressable onPress={() => router.push('/usage')} style={{ marginBottom: 8 }}>
          <Text style={{ color: '#c9a961', fontWeight: '700' }}>{t('wallet.link.usage')}</Text>
        </Pressable>
        {(txs.data || []).length === 0 ? (
          <Text style={{ color: colors.textSecondary, marginTop: 8, lineHeight: 20 }}>{t('wallet.history.empty')}</Text>
        ) : (
          (txs.data || []).map((item) => {
            const debit = item.type === 'debit' || item.type === 'withdraw';
            const note = (item.note || '').toLowerCase();
            const methodLabel =
              item.paymentMethod === 'iap' || note.includes('app store') || note.includes('google play') || note.includes(' iap')
                ? Platform.OS === 'ios'
                  ? t('wallet.method.iapIos')
                  : t('wallet.method.iapAndroid')
                : item.paymentMethod === 'paypal' || note.includes('paypal')
                  ? t('wallet.method.paypal')
                  : debit
                    ? t('wallet.type.debit')
                    : t('wallet.type.deposit');
            return (
              <View
                key={item.id}
                style={{
                  flexDirection: 'row',
                  justifyContent: 'space-between',
                  paddingVertical: 14,
                  borderBottomWidth: 1,
                  borderColor: colors.border,
                  gap: 12,
                }}
              >
                <View style={{ flex: 1 }}>
                  <Text style={{ color: colors.text, fontWeight: '700' }}>{methodLabel}</Text>
                  <Text style={{ color: colors.textSecondary, fontSize: 12, marginTop: 3 }}>
                    {formatDate(item.createdAt, language)} · {item.status || 'completed'}
                  </Text>
                  {item.note ? (
                    <Text style={{ color: colors.textSecondary, fontSize: 12, marginTop: 2 }} numberOfLines={2}>
                      {item.note}
                    </Text>
                  ) : null}
                </View>
                <Text style={{ color: debit ? colors.danger : colors.success, fontWeight: '800' }}>
                  {debit ? '−' : '+'}
                  {formatMoney(item.amount, item.currency)}
                </Text>
              </View>
            );
          })
        )}
      </ScrollView>
    </Screen>
  );
}
