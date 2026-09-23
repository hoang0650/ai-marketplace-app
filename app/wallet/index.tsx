import React from 'react';
import { Alert, Platform, Pressable, ScrollView, Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import { walletApi } from '@/api';
import type { PayoutPersona } from '@/api/types';
import { href } from '@/lib/href';
import { useAuth } from '@/hooks/useAuth';
import { useTheme } from '@/hooks/useT';
import { useT } from '@/hooks/useT';
import { Screen } from '@/components/ui/Screen';
import { LoginPrompt } from '@/components/ui/LoginPrompt';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { Chip } from '@/components/ui/Chip';
import { IapTopup } from '@/components/wallet/IapTopup';
import { displayFont } from '@/constants/fonts';
import { formatMoney, formatDate } from '@/utils/format';
import { getErrorMessage } from '@/lib/errors';

export default function WalletScreen() {
  const qc = useQueryClient();
  const router = useRouter();
  const { isAuthenticated, isCreator, user } = useAuth();
  const { colors } = useTheme();
  const { t, language } = useT();
  const [payout, setPayout] = React.useState('10');
  const [persona, setPersona] = React.useState<PayoutPersona | undefined>(undefined);

  const summary = useQuery({ queryKey: ['wallet-summary'], queryFn: () => walletApi.summary(), enabled: isAuthenticated });
  const txs = useQuery({ queryKey: ['wallet-txs'], queryFn: walletApi.list, enabled: isAuthenticated });
  const amountNumber = Number(payout);
  const policyQ = useQuery({
    queryKey: ['wallet-policy', persona, Number.isFinite(amountNumber) ? amountNumber : 0],
    queryFn: () => walletApi.payoutPolicy(persona, Number.isFinite(amountNumber) && amountNumber > 0 ? amountNumber : undefined),
    enabled: isAuthenticated && isCreator,
  });

  const policy = policyQ.data?.policy;
  const quote = policyQ.data?.quote;
  const personas = policyQ.data?.personas || [];

  const withdraw = useMutation({
    mutationFn: () => walletApi.withdraw(Number(payout), persona),
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

            {personas.length > 1 ? (
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 10 }}>
                {personas.map((p) => (
                  <Chip key={p} label={t(`payout.persona.${p}`)} active={(persona || policyQ.data?.persona) === p} onPress={() => setPersona(p)} />
                ))}
              </View>
            ) : null}

            {policy ? (
              <View style={{ marginTop: 12, backgroundColor: colors.cardBackground, borderColor: colors.border, borderWidth: 1, borderRadius: 12, padding: 12 }}>
                <Text style={{ color: colors.text, fontWeight: '700', marginBottom: 6 }}>{t('payout.rulesTitle')}</Text>
                <Text style={{ color: colors.textSecondary, fontSize: 13, lineHeight: 19 }}>{t('payout.rulesBody')}</Text>
                <Text style={{ color: colors.text, marginTop: 8, fontSize: 13 }}>
                  {t('payout.platformFee')}: {((policy.platformFeeRate || 0) * 100).toFixed(2)}%
                  {policy.taxRate > 0 ? ` · ${t('payout.tax')}: ${(policy.taxRate * 100).toFixed(2)}%` : ''}
                  {policy.minAmountVnd > 0 ? ` · ${t('payout.minBalance')}: ${policy.minAmountVnd.toLocaleString()} VND` : ''}
                </Text>
                {!policy.chargeAtWithdraw ? (
                  <Text style={{ color: colors.textSecondary, marginTop: 6, fontSize: 12, lineHeight: 18 }}>{t('payout.netAtSource')}</Text>
                ) : null}
              </View>
            ) : null}

            <Pressable onPress={() => router.push(href('/kyc'))} style={{ marginVertical: 8 }}>
              <Text style={{ color: colors.tint, fontWeight: '700' }}>{t('kyc.goVerify')}</Text>
            </Pressable>
            <Input
              label={`${t('wallet.payout')} (USD)`}
              keyboardType="numeric"
              value={payout}
              onChangeText={setPayout}
              style={{ marginTop: 8 }}
            />

            {quote ? (
              <View style={{ marginTop: 10, gap: 4 }}>
                <Row label={t('payout.gross')} value={formatMoney(quote.gross, 'USD')} colors={colors} />
                {quote.platformFee > 0 ? (
                  <Row label={t('payout.platformFee')} value={`−${formatMoney(quote.platformFee, 'USD')}`} colors={colors} />
                ) : null}
                {quote.tax > 0 ? <Row label={t('payout.tax')} value={`−${formatMoney(quote.tax, 'USD')}`} colors={colors} /> : null}
                <Row label={t('payout.net')} value={formatMoney(quote.net, 'USD')} colors={colors} strong />
              </View>
            ) : null}

            <Button
              title={t('wallet.payout')}
              variant="outline"
              onPress={() => {
                if (policy && !policy.canWithdraw) {
                  Alert.alert('AI Markets', t('payout.buyerBlocked'));
                  return;
                }
                if (user?.role !== 'admin' && user?.kycStatus !== 'verified') {
                  Alert.alert('AI Markets', t('kyc.withdrawBlocked'), [
                    { text: t('kyc.goVerify'), onPress: () => router.push(href('/kyc')) },
                    { text: 'OK', style: 'cancel' },
                  ]);
                  return;
                }
                withdraw.mutate();
              }}
              loading={withdraw.isPending}
            />
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

function Row({
  label,
  value,
  colors,
  strong,
}: {
  label: string;
  value: string;
  colors: { text: string; textSecondary: string; success: string };
  strong?: boolean;
}) {
  return (
    <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
      <Text style={{ color: strong ? colors.text : colors.textSecondary, fontWeight: strong ? '800' : '600' }}>{label}</Text>
      <Text style={{ color: strong ? colors.success : colors.text, fontWeight: strong ? '800' : '600' }}>{value}</Text>
    </View>
  );
}
