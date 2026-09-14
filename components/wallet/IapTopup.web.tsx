import React, { useState } from 'react';
import { Alert, Linking } from 'react-native';
import { WalletTopupForm } from '@/components/wallet/WalletTopupForm';
import { useT } from '@/hooks/useT';
import { parseTopupAmount } from '@/lib/iap-packs';

const WEB = (process.env.EXPO_PUBLIC_WEB_URL || 'https://aimarkets.vn').replace(/\/$/, '');

export function IapTopup() {
  const { t } = useT();
  const [amount, setAmount] = useState('10');

  async function submit() {
    const parsed = parseTopupAmount(amount);
    if (!parsed.ok) {
      Alert.alert('AI Markets', t('wallet.topup.invalid'));
      return;
    }
    const url = `${WEB}/wallet?amount=${encodeURIComponent(String(parsed.usd))}`;
    try {
      await Linking.openURL(url);
    } catch {
      Alert.alert('AI Markets', t('wallet.hint.web'));
    }
  }

  return (
    <WalletTopupForm
      amount={amount}
      onAmountChange={setAmount}
      hint={t('wallet.hint.web')}
      submitLabel={t('wallet.topup.web')}
      onSubmit={() => void submit()}
    />
  );
}
