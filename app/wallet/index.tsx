import React, { useMemo, useState } from 'react';
import { Alert, Pressable, ScrollView, Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import * as WebBrowser from 'expo-web-browser';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { walletApi } from '@/api';
import type { PaypalFunding } from '@/api/types';
import { useAuth } from '@/hooks/useAuth';
import { useTheme } from '@/hooks/useT';
import { useT } from '@/hooks/useT';
import { Screen } from '@/components/ui/Screen';
import { LoginPrompt } from '@/components/ui/LoginPrompt';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { Chip } from '@/components/ui/Chip';
import { formatMoney, formatDate } from '@/utils/format';
import { getErrorMessage } from '@/lib/errors';

type DepositMethod = 'sepay' | 'apple' | 'gpay' | 'paypal';

const SEPAY_QUICK = [50000, 100000, 200000, 500000, 1000000];
const PAYPAL_QUICK = [5, 10, 20, 50, 100];

function fundingOf(method: DepositMethod): PaypalFunding {
  if (method === 'apple') return 'applepay';
  if (method === 'gpay') return 'googlepay';
  return 'paypal';
}

export default function WalletScreen() {
  const qc = useQueryClient();
  const { isAuthenticated, isCreator } = useAuth();
  const { colors } = useTheme();
  const { t, language } = useT();
  const [method, setMethod] = useState<DepositMethod>('sepay');
  const [amount, setAmount] = useState('500000');
  const paypalRail = method !== 'sepay';
  const depositCurrency = paypalRail ? 'USD' : 'VND';
  const quick = paypalRail ? PAYPAL_QUICK : SEPAY_QUICK;

  const summary = useQuery({ queryKey: ['wallet-summary'], queryFn: walletApi.summary, enabled: isAuthenticated });
  const txs = useQuery({ queryKey: ['wallet-txs'], queryFn: walletApi.list, enabled: isAuthenticated });
  const paypalCfg = useQuery({ queryKey: ['paypal-config'], queryFn: walletApi.paypalConfig, enabled: isAuthenticated });
  const paypalOn = !!paypalCfg.data?.enabled;

  const deposit = useMutation({
    mutationFn: () => walletApi.deposit(Number(amount)),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['wallet-summary'] });
      qc.invalidateQueries({ queryKey: ['wallet-txs'] });
      Alert.alert('AI Markets', t('wallet.pending'));
    },
    onError: (e: Error) => Alert.alert('AI Markets', getErrorMessage(e, language)),
  });
  const withdraw = useMutation({
    mutationFn: () => walletApi.withdraw(Number(amount)),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['wallet-summary'] });
      qc.invalidateQueries({ queryKey: ['wallet-txs'] });
      Alert.alert('AI Markets', t('wallet.pending'));
    },
    onError: (e: Error) => Alert.alert('AI Markets', getErrorMessage(e, language)),
  });
  const paypalPay = useMutation({
    mutationFn: async () => {
      const n = Number(amount);
      if (!n || n < 1) throw new Error(t('wallet.errAmount'));
      const created = await walletApi.paypalCreateOrder(n, 'USD', fundingOf(method));
      if (!created.orderId) throw new Error(t('wallet.paypalFail'));
      if (created.approvalUrl) {
        await WebBrowser.openBrowserAsync(created.approvalUrl, { enableBarCollapsing: true });
      }
      const captured = await walletApi.paypalCaptureOrder(created.orderId);
      if (!captured.success) throw new Error(t('wallet.paypalFail'));
      return captured;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['wallet-summary'] });
      qc.invalidateQueries({ queryKey: ['wallet-txs'] });
      Alert.alert('AI Markets', t('wallet.paypalOk'));
    },
    onError: (e: Error) => Alert.alert('AI Markets', getErrorMessage(e, language) || t('wallet.paypalFail')),
  });

  const methods = useMemo(
    () =>
      [
        { id: 'sepay' as const, title: t('wallet.method.sepay'), desc: t('wallet.method.sepayDesc') },
        { id: 'apple' as const, title: t('wallet.method.apple'), desc: t('wallet.method.appleDesc') },
        { id: 'gpay' as const, title: t('wallet.method.gpay'), desc: t('wallet.method.gpayDesc') },
        { id: 'paypal' as const, title: t('wallet.method.paypal'), desc: t('wallet.method.paypalDesc') },
      ],
    [t],
  );

  if (!isAuthenticated) return <LoginPrompt />;
  const s = summary.data;
  const cur = s?.currency || 'USD';

  function pickMethod(next: DepositMethod) {
    setMethod(next);
    const rail = next !== 'sepay';
    setAmount(rail ? '10' : '500000');
  }

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

        <Text style={{ color: colors.text, fontWeight: '700', marginTop: 20, marginBottom: 8 }}>{t('wallet.methods')}</Text>
        <View style={{ gap: 8 }}>
          {methods.map((m) => {
            const active = method === m.id;
            return (
              <Pressable
                key={m.id}
                onPress={() => pickMethod(m.id)}
                style={{
                  borderWidth: 1,
                  borderColor: active ? colors.tint : colors.border,
                  backgroundColor: active ? colors.cardBackground : colors.surface,
                  borderRadius: 12,
                  padding: 14,
                }}
              >
                <Text style={{ color: colors.text, fontWeight: '800' }}>{m.title}</Text>
                <Text style={{ color: colors.textSecondary, marginTop: 4, fontSize: 13 }}>{m.desc}</Text>
              </Pressable>
            );
          })}
        </View>
        <Text style={{ color: colors.textSecondary, marginTop: 10, lineHeight: 20, fontSize: 13 }}>
          {method === 'apple' ? t('wallet.hint.apple') : method === 'gpay' ? t('wallet.hint.gpay') : method === 'paypal' ? t('wallet.hint.paypal') : t('wallet.hint.sepay')}
        </Text>

        <Input label={`${t('wallet.topup')} (${depositCurrency})`} keyboardType="numeric" value={amount} onChangeText={setAmount} />
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 12 }}>
          {quick.map((q) => (
            <Chip
              key={q}
              label={formatMoney(q, depositCurrency)}
              active={Number(amount) === q}
              onPress={() => setAmount(String(q))}
            />
          ))}
        </View>

        {paypalRail && !paypalOn ? (
          <Text style={{ color: colors.textSecondary, backgroundColor: colors.cardBackground, borderRadius: 12, padding: 12, lineHeight: 20, marginBottom: 12 }}>
            {t('wallet.paypalOffline')}
          </Text>
        ) : null}

        <View style={{ flexDirection: 'row', gap: 10 }}>
          {method === 'sepay' ? (
            <Button title={t('wallet.topup')} onPress={() => deposit.mutate()} loading={deposit.isPending} style={{ flex: 1 }} />
          ) : (
            <Button
              title={t('wallet.payPaypal')}
              onPress={() => paypalPay.mutate()}
              loading={paypalPay.isPending}
              disabled={!paypalOn}
              style={{ flex: 1 }}
            />
          )}
          {isCreator ? <Button title={t('wallet.payout')} variant="dark" onPress={() => withdraw.mutate()} loading={withdraw.isPending} style={{ flex: 1 }} /> : null}
        </View>

        <Text style={{ color: colors.text, fontWeight: '700', marginTop: 20, marginBottom: 8 }}>{t('wallet.history')}</Text>
        {(txs.data || []).map((item) => {
          const debit = item.type === 'debit' || item.type === 'withdraw';
          const note = (item.note || '').toLowerCase();
          const methodLabel = note.includes('apple')
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
