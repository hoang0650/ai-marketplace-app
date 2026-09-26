import React, { useEffect, useRef, useState } from 'react';
import { Alert, Image, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import * as WebBrowser from 'expo-web-browser';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { walletApi } from '@/api';
import type { GpayConfig, GpayOrder, GpayQrResponse } from '@/api/types';
import { Button } from '@/components/ui/Button';
import { useTheme, useT } from '@/hooks/useT';
import { getErrorMessage } from '@/lib/errors';

const QUICK_VND = [50_000, 100_000, 200_000, 500_000, 1_000_000];
const RETURN_URL = 'aimarkets://wallet';
const POLL_MS = 4000;
/** Stop polling after ~15 minutes (QR / bill expiry). */
const POLL_WINDOW_MS = 15 * 60_000;

function qrUri(qr?: string) {
  if (!qr) return '';
  return qr.startsWith('data:') ? qr : `data:image/png;base64,${qr}`;
}

/**
 * VND top-up through GPay: the payment gateway (ATM / card / transfer on
 * GPay's page) or a dynamic VietQR. The wallet is credited server-side when
 * GPay's webhook confirms; this screen polls the order until then.
 */
export function GpayTopup({ config }: { config: GpayConfig }) {
  const qc = useQueryClient();
  const { colors } = useTheme();
  const { t, language } = useT();
  const [amount, setAmount] = useState('100000');
  const [qr, setQr] = useState<GpayQrResponse | null>(null);
  const [orderId, setOrderId] = useState('');
  /** Bumped to cancel the running poll loop (new order, close, unmount). */
  const pollGen = useRef(0);

  const vnd = Math.round(Number(String(amount).replace(/[^\d]/g, '')) || 0);
  const rate = Number(config.vndPerUsd) || 26000;
  const usd = Math.round((vnd / rate) * 100) / 100;
  const amountOk = vnd > 0 && vnd >= (Number(config.minTopupVnd) || 0);

  const refreshWallet = () => {
    qc.invalidateQueries({ queryKey: ['wallet-summary'] });
    qc.invalidateQueries({ queryKey: ['wallet-txs'] });
  };

  useEffect(() => {
    const gen = pollGen;
    return () => {
      gen.current += 1;
    };
  }, []);

  function finish(order: GpayOrder) {
    setOrderId('');
    setQr(null);
    if (order.status === 'completed') {
      refreshWallet();
      Alert.alert('AI Markets', t('wallet.gpay.paidOk', { usd: order.amountUsd }));
    } else {
      Alert.alert('AI Markets', t('wallet.gpay.paidFail'));
    }
  }

  /** Poll the order until GPay's webhook settles it (or the QR / bill expires). */
  async function track(requestId: string) {
    const gen = ++pollGen.current;
    setOrderId(requestId);
    const deadline = Date.now() + POLL_WINDOW_MS;
    while (pollGen.current === gen && Date.now() < deadline) {
      try {
        const { order } = await walletApi.gpayOrder(requestId);
        if (pollGen.current !== gen) return;
        if (order.status !== 'pending') {
          finish(order);
          return;
        }
      } catch {
        /* transient: keep polling */
      }
      await new Promise((resolve) => setTimeout(resolve, POLL_MS));
    }
    if (pollGen.current === gen) setOrderId('');
  }

  const onError = (e: Error) => Alert.alert('AI Markets', getErrorMessage(e, language) || t('wallet.gpay.createFail'));

  const checkout = useMutation({
    mutationFn: (amountVnd: number) => walletApi.gpayCheckout(amountVnd),
    onSuccess: async (res) => {
      if (!res.billUrl) {
        Alert.alert('AI Markets', t('wallet.gpay.createFail'));
        return;
      }
      void track(res.order.requestId);
      await WebBrowser.openAuthSessionAsync(res.billUrl, RETURN_URL);
    },
    onError,
  });

  const createQr = useMutation({
    mutationFn: (amountVnd: number) => walletApi.gpayQr(amountVnd),
    onSuccess: (res) => {
      setQr(res);
      void track(res.order.requestId);
    },
    onError,
  });

  const simulate = useMutation({
    mutationFn: (amountVnd: number) => walletApi.gpaySandboxCredit(amountVnd),
    onSuccess: () => {
      refreshWallet();
      Alert.alert('AI Markets', t('wallet.gpay.sandboxOk'));
    },
    onError: (e: Error) => Alert.alert('AI Markets', getErrorMessage(e, language) || t('wallet.gpay.sandboxFail')),
  });

  const busy = checkout.isPending || createQr.isPending;
  const waiting = !!orderId;

  function closeQr() {
    pollGen.current += 1;
    setQr(null);
    setOrderId('');
  }

  return (
    <View style={styles.wrap}>
      <Text style={[styles.title, { color: colors.text }]}>{t('wallet.gpay.name')}</Text>
      <Text style={[styles.hint, { color: colors.textSecondary }]}>{t('wallet.gpay.hint')}</Text>

      {!config.enabled ? (
        <View style={[styles.box, { backgroundColor: colors.cardBackground, borderColor: colors.border }]}>
          <Text style={{ color: colors.textSecondary, lineHeight: 20, fontSize: 13 }}>{t('wallet.gpay.offline')}</Text>
        </View>
      ) : qr ? (
        <View style={[styles.box, { backgroundColor: colors.cardBackground, borderColor: colors.border }]}>
          <Text style={{ color: colors.text, fontWeight: '800' }}>
            {t('wallet.gpay.qrTitle', { amount: qr.order.amountVnd.toLocaleString('vi-VN') })}
          </Text>
          {qr.accountNumber ? (
            <Text selectable style={[styles.label, { color: colors.textSecondary }]}>
              {qr.provider} · {qr.accountName} · {qr.accountNumber}
            </Text>
          ) : null}
          {qr.qrCodeImage ? (
            <Image
              source={{ uri: qrUri(qr.qrCodeImage) }}
              style={styles.qr}
              resizeMode="contain"
              accessibilityLabel={t('wallet.gpay.qrAlt')}
            />
          ) : null}
          <Text style={[styles.hint, { color: colors.textSecondary, textAlign: 'center' }]}>
            {t('wallet.gpay.qrWaiting')}
          </Text>
          <Pressable onPress={closeQr} style={[styles.close, { borderColor: colors.border }]} accessibilityRole="button">
            <Text style={{ color: colors.text, fontWeight: '700', fontSize: 13 }}>{t('wallet.gpay.qrClose')}</Text>
          </Pressable>
        </View>
      ) : (
        <>
          <Text style={[styles.label, { color: colors.textSecondary, marginTop: 14 }]}>{t('wallet.gpay.amount')}</Text>
          <View style={[styles.amountBox, { backgroundColor: colors.cardBackground, borderColor: colors.border }]}>
            <TextInput
              value={amount}
              onChangeText={(v) => setAmount(v.replace(/[^\d]/g, ''))}
              keyboardType="number-pad"
              placeholder="100000"
              placeholderTextColor={colors.textSecondary}
              style={[styles.input, { color: colors.text }]}
            />
            <Text style={{ color: colors.textSecondary, fontWeight: '800' }}>VND</Text>
          </View>
          <View style={styles.chips}>
            {QUICK_VND.map((v) => {
              const on = vnd === v;
              return (
                <Pressable
                  key={v}
                  onPress={() => setAmount(String(v))}
                  style={[
                    styles.chip,
                    { borderColor: on ? colors.tint : colors.border, backgroundColor: on ? colors.luxDark : colors.cardBackground },
                  ]}
                >
                  <Text style={{ color: on ? '#f2efe8' : colors.text, fontWeight: '700' }}>{v.toLocaleString('vi-VN')}₫</Text>
                </Pressable>
              );
            })}
          </View>
          <Text style={[styles.hint, { color: colors.textSecondary }]}>{t('wallet.gpay.estimate', { usd })}</Text>

          <View style={{ marginTop: 12, gap: 8 }}>
            {config.portalEnabled ? (
              <Button
                title={t('wallet.gpay.portalBtn')}
                variant="dark"
                loading={checkout.isPending}
                disabled={!amountOk || busy || waiting}
                onPress={() => checkout.mutate(vnd)}
              />
            ) : null}
            {config.qrEnabled ? (
              <Button
                title={t('wallet.gpay.qrBtn')}
                variant="outline"
                loading={createQr.isPending}
                disabled={!amountOk || busy || waiting}
                onPress={() => createQr.mutate(vnd)}
              />
            ) : null}
            {waiting ? (
              <Text style={{ color: colors.textSecondary, fontSize: 12, lineHeight: 18 }}>{t('wallet.gpay.checking')}</Text>
            ) : config.portalEnabled ? (
              <Text style={{ color: colors.textSecondary, fontSize: 12, lineHeight: 18 }}>{t('wallet.gpay.portalHint')}</Text>
            ) : null}
          </View>

          {config.canSimulate ? (
            <View style={{ marginTop: 12, gap: 6 }}>
              <Button
                title={t('wallet.gpay.sandboxSim')}
                variant="outline"
                loading={simulate.isPending}
                disabled={vnd <= 0}
                onPress={() => simulate.mutate(vnd)}
              />
              <Text style={{ color: colors.textSecondary, fontSize: 12, lineHeight: 18 }}>{t('wallet.gpay.sandboxHint')}</Text>
            </View>
          ) : null}
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { marginTop: 20 },
  title: { fontSize: 18, fontWeight: '700' },
  hint: { marginTop: 8, lineHeight: 20, fontSize: 13 },
  box: { marginTop: 12, borderWidth: 1, borderRadius: 14, padding: 14 },
  label: { marginTop: 8, fontSize: 11, fontWeight: '800', letterSpacing: 0.4, textTransform: 'uppercase' },
  qr: { width: 220, height: 220, alignSelf: 'center', marginTop: 12, borderRadius: 10 },
  close: { alignSelf: 'center', borderWidth: 1, borderRadius: 8, paddingHorizontal: 14, paddingVertical: 7, marginTop: 12 },
  amountBox: {
    marginTop: 6,
    borderWidth: 1,
    borderRadius: 14,
    paddingHorizontal: 16,
    minHeight: 56,
    flexDirection: 'row',
    alignItems: 'center',
  },
  input: { flex: 1, fontSize: 24, fontWeight: '700', paddingVertical: 6 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 10 },
  chip: { borderWidth: 1, borderRadius: 999, paddingHorizontal: 12, paddingVertical: 7 },
});
