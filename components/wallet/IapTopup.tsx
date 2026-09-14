import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Alert, Platform } from 'react-native';
import { useQueryClient } from '@tanstack/react-query';
import { ErrorCode, isUserCancelledError, useIAP, type Purchase } from 'expo-iap';
import { walletApi } from '@/api';
import { WalletTopupForm } from '@/components/wallet/WalletTopupForm';
import { useT } from '@/hooks/useT';
import { getErrorMessage } from '@/lib/errors';
import { isExpoIapNativeAvailable } from '@/lib/iap-native';
import { WALLET_IAP_SKUS, parseTopupAmount, resolveIapPack } from '@/lib/iap-packs';
import { formatMoney } from '@/utils/format';

export function IapTopup() {
  if (!isExpoIapNativeAvailable()) {
    return <IapNeedBuild />;
  }
  return <IapTopupLive />;
}

function IapNeedBuild() {
  const { t } = useT();
  const [amount, setAmount] = useState('10');
  const storeLabel = Platform.OS === 'ios' ? t('wallet.method.iapIos') : t('wallet.method.iapAndroid');

  return (
    <WalletTopupForm
      amount={amount}
      onAmountChange={setAmount}
      hint={t('wallet.hint.iap', { store: storeLabel })}
      notice={t('wallet.iapNeedBuild')}
      submitLabel={t('wallet.topup.submit')}
      onSubmit={() => Alert.alert('AI Markets', t('wallet.iapNeedBuild'))}
    />
  );
}

function IapTopupLive() {
  const qc = useQueryClient();
  const { t, language } = useT();
  const [amount, setAmount] = useState('10');
  const [busySku, setBusySku] = useState('');
  const verifying = useRef(new Set<string>());
  const storeLabel = Platform.OS === 'ios' ? t('wallet.method.iapIos') : t('wallet.method.iapAndroid');

  const creditPurchase = useCallback(
    async (purchase: Purchase, finish: (p: Purchase) => Promise<void>) => {
      if (purchase.purchaseState && purchase.purchaseState !== 'purchased') return;
      if (!(WALLET_IAP_SKUS as readonly string[]).includes(purchase.productId)) return;
      const key = String(purchase.transactionId || purchase.purchaseToken || purchase.id || '');
      if (!key || verifying.current.has(key)) return;
      verifying.current.add(key);
      try {
        const token = String(purchase.purchaseToken || '');
        const res = await walletApi.iapVerify({
          platform: Platform.OS === 'ios' ? 'ios' : 'android',
          productId: purchase.productId,
          transactionId: String(purchase.transactionId || purchase.id || ''),
          purchaseToken: token,
          signedTransaction: Platform.OS === 'ios' ? token : undefined,
          packageName: Platform.OS === 'android' ? 'app.phgroup.ai_market_vn' : undefined,
        });
        if (!res.success) throw new Error(t('wallet.iapFail'));
        await finish(purchase);
        qc.invalidateQueries({ queryKey: ['wallet-summary'] });
        qc.invalidateQueries({ queryKey: ['wallet-txs'] });
        if (!res.duplicate) Alert.alert('AI Markets', t('wallet.iapOk'));
      } catch (e) {
        Alert.alert('AI Markets', getErrorMessage(e as Error, language) || t('wallet.iapFail'));
      } finally {
        verifying.current.delete(key);
        setBusySku('');
      }
    },
    [qc, t, language],
  );

  const finishRef = useRef<(p: Purchase) => Promise<void>>(async () => undefined);

  const {
    connected,
    fetchProducts,
    requestPurchase,
    finishTransaction,
    products,
    availablePurchases,
    getAvailablePurchases,
  } = useIAP({
    onPurchaseSuccess: (purchase) => {
      void creditPurchase(purchase, (p) => finishRef.current(p));
    },
    onPurchaseError: (err) => {
      setBusySku('');
      if (isUserCancelledError(err) || err.code === ErrorCode.UserCancelled) return;
      Alert.alert('AI Markets', err.message || t('wallet.iapFail'));
    },
  });

  useEffect(() => {
    finishRef.current = async (purchase: Purchase) => {
      await finishTransaction({ purchase, isConsumable: true });
    };
  }, [finishTransaction]);

  useEffect(() => {
    if (!connected) return;
    void fetchProducts({ skus: [...WALLET_IAP_SKUS], type: 'in-app' });
    void getAvailablePurchases();
  }, [connected, fetchProducts, getAvailablePurchases]);

  useEffect(() => {
    for (const purchase of availablePurchases) {
      void creditPurchase(purchase, (p) => finishRef.current(p));
    }
  }, [availablePurchases, creditPurchase]);

  async function buy(sku: string) {
    if (!connected) {
      Alert.alert('AI Markets', t('wallet.iapNeedBuild'));
      return;
    }
    setBusySku(sku);
    try {
      await requestPurchase({
        type: 'in-app',
        request: {
          apple: { sku, quantity: 1 },
          google: { skus: [sku] },
        },
      });
    } catch (e) {
      setBusySku('');
      Alert.alert('AI Markets', getErrorMessage(e as Error, language) || t('wallet.iapFail'));
    }
  }

  function submit() {
    const parsed = parseTopupAmount(amount);
    if (!parsed.ok) {
      Alert.alert('AI Markets', t('wallet.topup.invalid'));
      return;
    }
    const resolved = resolveIapPack(parsed.usd);
    if (!resolved.exact) {
      Alert.alert(
        'AI Markets',
        t('wallet.topup.snapConfirm', { pack: formatMoney(resolved.pack.usd, 'USD') }),
        [
          { text: t('common.cancel'), style: 'cancel' },
          { text: t('wallet.topup.submit'), onPress: () => void buy(resolved.pack.sku) },
        ],
      );
      return;
    }
    void buy(resolved.pack.sku);
  }

  const parsed = parseTopupAmount(amount);
  const sku = parsed.ok ? resolveIapPack(parsed.usd).pack.sku : '';
  const storePrice = products.find((p) => p.id === sku)?.displayPrice;

  return (
    <WalletTopupForm
      amount={amount}
      onAmountChange={setAmount}
      hint={t('wallet.hint.iap', { store: storeLabel })}
      notice={connected ? undefined : t('wallet.iapNeedBuild')}
      submitLabel={t('wallet.topup.submit')}
      onSubmit={submit}
      busy={!!busySku}
      disabled={!connected}
      storePrice={storePrice}
    />
  );
}
