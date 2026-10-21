import React, { useState } from 'react';
import { Alert, Linking } from 'react-native';
import { WalletTopupForm } from '@/components/wallet/WalletTopupForm';
import { useT } from '@/hooks/useT';
import { parseTopupAmount } from '@/lib/iap-packs';
import { GPAY_ENABLED } from '@/lib/features';

const WEB = (process.env.EXPO_PUBLIC_WEB_URL || 'https://aimarkets.vn').replace(/\/$/, '');

export function IapTopup() {
  const { t } = useT();
  // GPay copy is hidden unless EXPO_PUBLIC_GPAY_ENABLED=true.
  const hintKey = GPAY_ENABLED ? 'wallet.hint.web' : 'wallet.hint.webNoGpay';
  const submitKey = GPAY_ENABLED ? 'wallet.topup.web' : 'wallet.topup.webNoGpay';
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
      Alert.alert('AI Markets', t(hintKey));
    }
  }

  return (
    <WalletTopupForm
      amount={amount}
      onAmountChange={setAmount}
      hint={t(hintKey)}
      submitLabel={t(submitKey)}
      onSubmit={() => void submit()}
    />
  );
}
