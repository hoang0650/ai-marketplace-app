import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Alert, Platform, Pressable, Text, View } from 'react-native';
import { useQueryClient } from '@tanstack/react-query';
import { ErrorCode, isUserCancelledError, useIAP, type Purchase } from 'expo-iap';
import { walletApi } from '@/api';
import { Button } from '@/components/ui/Button';
import { useTheme } from '@/hooks/useT';
import { useT } from '@/hooks/useT';
import { getErrorMessage } from '@/lib/errors';
import { WALLET_IAP_PACKS, WALLET_IAP_SKUS } from '@/lib/iap-packs';
import { formatMoney } from '@/utils/format';

export function IapTopup() {
  const qc = useQueryClient();
  const { colors } = useTheme();
  const { t, language } = useT();
  const [busySku, setBusySku] = useState('');
  const verifying = useRef(new Set<string>());

  const creditPurchase = useCallback(
    async (purchase: Purchase, finish: (p: Purchase) => Promise<void>) => {
      const key = String(purchase.transactionId || purchase.purchaseToken || purchase.id || '');
      if (!key || verifying.current.has(key)) return;
      verifying.current.add(key);
      try {
        const res = await walletApi.iapVerify({
          platform: Platform.OS === 'ios' ? 'ios' : 'android',
          productId: purchase.productId,
          transactionId: String(purchase.transactionId || purchase.id || ''),
          purchaseToken: String(purchase.purchaseToken || ''),
        });
        if (!res.success) throw new Error(t('wallet.iapFail'));
        await finish(purchase);
        qc.invalidateQueries({ queryKey: ['wallet-summary'] });
        qc.invalidateQueries({ queryKey: ['wallet-txs'] });
        Alert.alert('AI Markets', t('wallet.iapOk'));
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

  const { connected, fetchProducts, requestPurchase, finishTransaction, products, reconnect } = useIAP({
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
  }, [connected, fetchProducts]);

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

  const storeLabel = Platform.OS === 'ios' ? t('wallet.method.iapIos') : t('wallet.method.iapAndroid');

  return (
    <View>
      <Text style={{ color: colors.text, fontWeight: '700', marginTop: 20, marginBottom: 8 }}>{t('wallet.methods')}</Text>
      <Text style={{ color: colors.textSecondary, lineHeight: 20, fontSize: 13, marginBottom: 12 }}>
        {t('wallet.hint.iap', { store: storeLabel })}
      </Text>
      {!connected ? (
        <Text style={{ color: colors.textSecondary, backgroundColor: colors.cardBackground, borderRadius: 12, padding: 12, lineHeight: 20, marginBottom: 12 }}>
          {t('wallet.iapNeedBuild')}
        </Text>
      ) : null}
      <View style={{ gap: 8 }}>
        {WALLET_IAP_PACKS.map((pack) => {
          const store = products.find((p) => p.id === pack.sku);
          const label = store?.displayPrice || formatMoney(pack.usd, 'USD');
          const active = busySku === pack.sku;
          return (
            <Pressable
              key={pack.sku}
              onPress={() => buy(pack.sku)}
              disabled={!!busySku}
              style={{
                borderWidth: 1,
                borderColor: active ? colors.tint : colors.border,
                backgroundColor: colors.cardBackground,
                borderRadius: 12,
                padding: 14,
                flexDirection: 'row',
                justifyContent: 'space-between',
                alignItems: 'center',
                opacity: busySku && !active ? 0.5 : 1,
              }}
            >
              <View>
                <Text style={{ color: colors.text, fontWeight: '800' }}>{formatMoney(pack.usd, 'USD')}</Text>
                <Text style={{ color: colors.textSecondary, marginTop: 4, fontSize: 13 }}>{storeLabel}</Text>
              </View>
              <Text style={{ color: colors.tint, fontWeight: '800' }}>{active ? '…' : label}</Text>
            </Pressable>
          );
        })}
      </View>
      {!connected ? (
        <Button title={t('wallet.iapRetry')} variant="dark" onPress={() => void reconnect()} style={{ marginTop: 12 }} />
      ) : null}
    </View>
  );
}
