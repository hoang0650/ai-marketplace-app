import React from 'react';
import { Alert, Pressable, Text, View } from 'react-native';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import { walletApi } from '@/api';
import type { BuyerDepositWithdraw } from '@/api/types';
import { ApiError, getErrorMessage } from '@/lib/errors';
import { href } from '@/lib/href';
import {
  buyerTopupWithdrawDecision,
  fxReferenceUsd,
  parseVndInput,
  vietqrWithdrawRequest,
  type BuyerTopupBlocker,
  type PayoutAccountCode,
} from '@/lib/buyerDepositWithdraw';
import { buyerWithdrawMaySubmit } from '@/lib/gpayOffer';
import { useTheme, useT } from '@/hooks/useT';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { formatMoney } from '@/utils/format';

function blockerKey(code: BuyerTopupBlocker | PayoutAccountCode | string): string {
  return `wallet.topupWithdraw.blocker.${code}`;
}

/**
 * VietQR company-bank withdrawal. Closed until the server returns a separated
 * VND amount and an approved electronic identity. The pooled balance is not used.
 */
export function BuyerVietqrWithdraw({
  snapshot,
  summaryReady,
  summaryError,
}: {
  snapshot?: BuyerDepositWithdraw | null;
  summaryReady: boolean;
  summaryError: boolean;
}) {
  const qc = useQueryClient();
  const router = useRouter();
  const { colors } = useTheme();
  const { t, language } = useT();
  const [amountText, setAmountText] = React.useState('');
  const [replaceAccount, setReplaceAccount] = React.useState(false);
  const [bankName, setBankName] = React.useState('');
  const [accountNumber, setAccountNumber] = React.useState('');
  const [accountName, setAccountName] = React.useState('');

  const cashoutOpen = buyerWithdrawMaySubmit();
  const accountQ = useQuery({
    queryKey: ['wallet-payout-account'],
    queryFn: () => walletApi.payoutAccount(),
    enabled: cashoutOpen && summaryReady && !summaryError,
    retry: false,
  });

  const gate = summaryError ? null : snapshot ?? null;
  const parsed = parseVndInput(amountText);
  const amountVnd = parsed.ok ? parsed.amountVnd : parsed.code === 'empty' ? gate?.payableVnd : null;
  const typedInvalid = amountText.trim() !== '' && !parsed.ok;
  const decision = buyerTopupWithdrawDecision({
    snapshot: gate,
    amountVnd: typeof amountVnd === 'number' ? amountVnd : null,
  });
  const saved = accountQ.data?.account;
  const useSaved = Boolean(saved) && !replaceAccount;
  const request =
    summaryReady && !typedInvalid
      ? vietqrWithdrawRequest({
          snapshot: gate,
          amountVnd: typeof amountVnd === 'number' ? amountVnd : null,
          savedAccount: useSaved,
          bankAccount: { bankName, accountNumber, accountName },
          saveAccount: true,
        })
      : { ok: false as const, blocker: typedInvalid ? ('INVALID_AMOUNT' as const) : ('SERVER_GATE_CLOSED' as const) };

  const withdraw = useMutation({
    mutationFn: () => {
      if (!buyerWithdrawMaySubmit() || !request.ok) throw new Error('PARTNER_NOT_READY');
      return walletApi.withdrawVietqrDeposit(request.body);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['wallet-summary'] });
      qc.invalidateQueries({ queryKey: ['wallet-txs'] });
      qc.invalidateQueries({ queryKey: ['wallet-payout-account'] });
      Alert.alert('AI Markets', t('wallet.topupWithdraw.requested'));
    },
    onError: (e: unknown) => {
      const code = e instanceof ApiError ? e.code : e instanceof Error ? e.message : '';
      const key = blockerKey(code);
      const translated = t(key);
      Alert.alert('AI Markets', translated !== key ? translated : getErrorMessage(e, language));
    },
  });

  const fx = fxReferenceUsd(gate);
  const blocker = !summaryReady ? 'SERVER_GATE_CLOSED' : request.ok ? null : request.blocker;
  const showAccount = cashoutOpen && decision.ok;

  if (!cashoutOpen) {
    return (
      <View style={{ marginTop: 28 }}>
        <Text style={{ color: colors.text, fontSize: 18, fontWeight: '700' }}>{t('wallet.topupWithdraw.title')}</Text>
        <Text style={{ color: colors.textSecondary, marginTop: 8, lineHeight: 20, fontSize: 13 }}>{t('wallet.gpay.direct')}</Text>
        <Text style={{ color: colors.textSecondary, marginTop: 8, lineHeight: 20, fontSize: 13 }}>{t('wallet.topupWithdraw.closed')}</Text>
      </View>
    );
  }

  return (
    <View style={{ marginTop: 28 }}>
      <Text style={{ color: colors.text, fontSize: 18, fontWeight: '700' }}>{t('wallet.topupWithdraw.title')}</Text>
      <Text style={{ color: colors.textSecondary, marginTop: 8, lineHeight: 20, fontSize: 13 }}>{t('wallet.topupWithdraw.rule')}</Text>

      {!summaryReady ? (
        <Text style={{ color: colors.textSecondary, marginTop: 10, lineHeight: 20 }}>{t('wallet.topupWithdraw.reading')}</Text>
      ) : null}

      {summaryReady && decision.ok && typeof gate?.payableVnd === 'number' ? (
        <Text style={{ color: colors.text, marginTop: 10, fontWeight: '700' }}>
          {t('wallet.topupWithdraw.payable', { amount: gate.payableVnd.toLocaleString('vi-VN') })}
        </Text>
      ) : null}

      {summaryReady && fx != null ? (
        <Text style={{ color: colors.textSecondary, marginTop: 6, fontSize: 12, lineHeight: 18 }}>
          {t('wallet.topupWithdraw.fx', { usd: formatMoney(fx, 'USD') })}
        </Text>
      ) : null}

      {blocker ? (
        <Text style={{ color: colors.textSecondary, marginTop: 10, lineHeight: 20 }}>{t(blockerKey(blocker))}</Text>
      ) : null}

      {summaryReady && !decision.ok && decision.blocker === 'IDENTITY_REQUIRED' ? (
        <Pressable onPress={() => router.push(href('/kyc'))} style={{ marginTop: 8, minHeight: 44, justifyContent: 'center' }}>
          <Text style={{ color: colors.tint, fontWeight: '700' }}>{t('wallet.topupWithdraw.kyc')}</Text>
        </Pressable>
      ) : null}

      {showAccount ? (
        <>
          <Input
            label={t('wallet.topupWithdraw.amount')}
            keyboardType="number-pad"
            value={amountText}
            onChangeText={setAmountText}
            placeholder={typeof gate?.payableVnd === 'number' ? String(gate.payableVnd) : ''}
            style={{ marginTop: 8 }}
          />
          {useSaved && saved ? (
            <View style={{ marginBottom: 8 }}>
              <Text style={{ color: colors.text, lineHeight: 20 }}>
                {t('wallet.topupWithdraw.accountSaved', {
                  bank: saved.bankName,
                  name: saved.accountName,
                  masked: saved.accountNumberMasked || '',
                })}
              </Text>
              <Pressable onPress={() => setReplaceAccount(true)} style={{ marginTop: 6, minHeight: 44, justifyContent: 'center' }}>
                <Text style={{ color: colors.tint, fontWeight: '700' }}>{t('wallet.topupWithdraw.replaceAccount')}</Text>
              </Pressable>
            </View>
          ) : (
            <View>
              {accountQ.isError ? (
                <Text style={{ color: colors.textSecondary, marginBottom: 8, lineHeight: 20 }}>{t('wallet.topupWithdraw.accountUnknown')}</Text>
              ) : (
                <Text style={{ color: colors.textSecondary, marginBottom: 8, lineHeight: 20 }}>{t('wallet.topupWithdraw.accountMissing')}</Text>
              )}
              <Text style={{ color: colors.textSecondary, marginBottom: 8, fontSize: 12, lineHeight: 18 }}>{t('wallet.topupWithdraw.holderHint')}</Text>
              <Input label={t('wallet.topupWithdraw.bankName')} value={bankName} onChangeText={setBankName} autoCapitalize="words" />
              <Input label={t('wallet.topupWithdraw.accountNumber')} value={accountNumber} onChangeText={setAccountNumber} keyboardType="number-pad" />
              <Input label={t('wallet.topupWithdraw.accountName')} value={accountName} onChangeText={setAccountName} autoCapitalize="characters" />
              {saved && replaceAccount ? (
                <Pressable onPress={() => setReplaceAccount(false)} style={{ marginBottom: 8, minHeight: 44, justifyContent: 'center' }}>
                  <Text style={{ color: colors.tint, fontWeight: '700' }}>{t('wallet.topupWithdraw.useSaved')}</Text>
                </Pressable>
              ) : null}
            </View>
          )}
          <Button
            title={t('wallet.topupWithdraw.submit', {
              amount: request.ok ? request.body.amountVnd.toLocaleString('vi-VN') : '—',
            })}
            variant="outline"
            disabled={!request.ok}
            loading={withdraw.isPending}
            onPress={() => {
              if (!request.ok) {
                Alert.alert('AI Markets', t(blockerKey(request.blocker)));
                return;
              }
              withdraw.mutate();
            }}
          />
        </>
      ) : null}
    </View>
  );
}
