import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Alert, Platform } from 'react-native';
import { useQueryClient } from '@tanstack/react-query';
import { ErrorCode, getTransactionJwsIOS, isUserCancelledError, useIAP, type Purchase } from 'expo-iap';
import { walletApi } from '@/api';
import { WalletTopupForm } from '@/components/wallet/WalletTopupForm';
import { useT } from '@/hooks/useT';
import { getErrorMessage } from '@/lib/errors';
import { iapFailureKind, looksLikeJws } from '@/lib/iapErrors';
import { isExpoIapNativeAvailable } from '@/lib/iap-native';
import { WALLET_IAP_SKUS, parseTopupAmount, resolveIapPack } from '@/lib/iap-packs';
import { playSound } from '@/services/sound';
import { formatMoney } from '@/utils/format';

export function IapTopup() {
  if (!isExpoIapNativeAvailable()) return <IapUnavailable />;
  return <IapTopupLive />;
}

function IapUnavailable() {
  const { t } = useT();
  const [amount, setAmount] = useState('10');
  const storeLabel = Platform.OS === 'ios' ? t('wallet.method.iapIos') : t('wallet.method.iapAndroid');
  const notice = t('wallet.iapNoModule', { store: storeLabel });
  return (
    <WalletTopupForm
      amount={amount}
      onAmountChange={setAmount}
      hint={t('wallet.hint.iap', { store: storeLabel })}
      notice={notice}
      noticeTone="danger"
      submitLabel={t('wallet.topup.submit')}
      onSubmit={() => Alert.alert('AI Markets', notice)}
    />
  );
}

function IapTopupLive() {
  const qc = useQueryClient();
  const { t, language } = useT();
  const [amount, setAmount] = useState('10');
  const [busySku, setBusySku] = useState('');
  const [connectError, setConnectError] = useState('');
  const [productsFetched, setProductsFetched] = useState(false);
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
        let token = String(purchase.purchaseToken || '');
        if (Platform.OS === 'ios' && !looksLikeJws(token)) {
          try {
            const jws = await getTransactionJwsIOS(purchase.productId);
            if (jws) token = jws;
          } catch {
            /* The API can still verify with the App Store Server API and transactionId. */
          }
        }
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
        if (!res.duplicate) {
          playSound('paymentSuccess', { say: t('sound.topupDone') });
          Alert.alert('AI Markets', t('wallet.iapOk'));
        }
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
    reconnect,
  } = useIAP({
    onPurchaseSuccess: (purchase) => {
      void creditPurchase(purchase, (p) => finishRef.current(p));
    },
    onPurchaseError: (err) => {
      setBusySku('');
      if (isUserCancelledError(err) || err.code === ErrorCode.UserCancelled) return;
      const kind = iapFailureKind(err);
      if (kind === 'products') {
        Alert.alert('AI Markets', t('wallet.iapProductsPending', { store: storeLabel }));
        return;
      }
      if (kind === 'connect') {
        setConnectError(err.message || '');
        Alert.alert('AI Markets', t('wallet.iapConnectFail', { store: storeLabel }));
        return;
      }
      Alert.alert('AI Markets', err.message || t('wallet.iapFail'));
    },
    onError: (err) => {
      const kind = iapFailureKind(err);
      if (kind === 'products') return;
      setConnectError(err.message || '');
    },
  });

  useEffect(() => {
    finishRef.current = async (purchase: Purchase) => {
      await finishTransaction({ purchase, isConsumable: true });
    };
  }, [finishTransaction]);

  useEffect(() => {
    if (!connected) return;
    let cancelled = false;
    void fetchProducts({ skus: [...WALLET_IAP_SKUS], type: 'in-app' })
      .then(() => {
        if (cancelled) return;
        setConnectError('');
        setProductsFetched(true);
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        setProductsFetched(true);
        if (iapFailureKind(err) === 'connect') setConnectError(err instanceof Error ? err.message : '');
      });
    void getAvailablePurchases().catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, [connected, fetchProducts, getAvailablePurchases]);

  useEffect(() => {
    for (const purchase of availablePurchases) {
      void creditPurchase(purchase, (p) => finishRef.current(p));
    }
  }, [availablePurchases, creditPurchase]);

  async function buy(sku: string) {
    setBusySku(sku);
    try {
      let ready = connected;
      if (!ready) ready = await reconnect();
      if (!ready) {
        setBusySku('');
        Alert.alert(
          'AI Markets',
          connectError
            ? `${t('wallet.iapConnectFail', { store: storeLabel })}\n${connectError}`
            : t('wallet.iapConnectFail', { store: storeLabel }),
        );
        return;
      }
      await requestPurchase({
        type: 'in-app',
        request: {
          apple: { sku, quantity: 1 },
          google: { skus: [sku] },
        },
      });
    } catch (e) {
      setBusySku('');
      const kind = iapFailureKind(e);
      if (kind === 'cancel') return;
      if (kind === 'products') {
        Alert.alert('AI Markets', t('wallet.iapProductsPending', { store: storeLabel }));
        return;
      }
      if (kind === 'connect') {
        setConnectError(e instanceof Error ? e.message : '');
        Alert.alert('AI Markets', t('wallet.iapConnectFail', { store: storeLabel }));
        return;
      }
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
  const storePrice = products.find((product) => product.id === sku)?.displayPrice;
  const catalogMissing =
    connected &&
    productsFetched &&
    !connectError &&
    (products.length === 0 || (!!sku && !products.some((product) => product.id === sku)));
  const notice = !connected
    ? connectError
      ? t('wallet.iapConnectFail', { store: storeLabel })
      : t('wallet.iapConnecting', { store: storeLabel })
    : connectError
      ? t('wallet.iapConnectFail', { store: storeLabel })
      : catalogMissing
        ? t('wallet.iapProductsPending', { store: storeLabel })
        : '';
  const noticeTone = connectError ? 'danger' : catalogMissing ? 'warning' : 'muted';

  return (
    <WalletTopupForm
      amount={amount}
      onAmountChange={setAmount}
      hint={t('wallet.hint.iap', { store: storeLabel })}
      notice={notice}
      noticeTone={noticeTone}
      submitLabel={connected ? t('wallet.topup.submit') : t('wallet.iapRetry')}
      onSubmit={submit}
      busy={!!busySku}
      storePrice={storePrice}
    />
  );
}
