import React, { useState } from 'react';
import { Alert, Image, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import * as Clipboard from 'expo-clipboard';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { walletApi } from '@/api';
import type { GpayConfig } from '@/api/types';
import { Button } from '@/components/ui/Button';
import { useTheme, useT } from '@/hooks/useT';
import { getErrorMessage } from '@/lib/errors';

const QUICK_VND = [50_000, 100_000, 200_000, 500_000, 1_000_000];

function qrUri(qr?: string) {
  if (!qr) return '';
  return qr.startsWith('data:') ? qr : `data:image/png;base64,${qr}`;
}

/**
 * VND bank-transfer top-up through a GPay Virtual Account. The wallet is
 * credited server-side when GPay's webhook reports the deposit.
 */
export function GpayTopup({ config }: { config: GpayConfig }) {
  const qc = useQueryClient();
  const { colors } = useTheme();
  const { t, language } = useT();
  const [amount, setAmount] = useState('100000');

  const accountQ = useQuery({
    queryKey: ['gpay-account'],
    queryFn: () => walletApi.gpayAccount(),
    enabled: config.enabled,
    staleTime: 60_000,
  });
  const account = accountQ.data?.account || null;

  const simulate = useMutation({
    mutationFn: (vnd: number) => walletApi.gpaySandboxCredit(vnd),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['wallet-summary'] });
      qc.invalidateQueries({ queryKey: ['wallet-txs'] });
      qc.invalidateQueries({ queryKey: ['gpay-account'] });
      Alert.alert('AI Markets', t('wallet.gpay.sandboxOk'));
    },
    onError: (e: Error) => Alert.alert('AI Markets', getErrorMessage(e, language) || t('wallet.gpay.sandboxFail')),
  });

  const vnd = Math.round(Number(String(amount).replace(/[^\d]/g, '')) || 0);
  const rate = Number(config.vndPerUsd) || 26000;
  const usd = Math.round((vnd / rate) * 100) / 100;

  async function copy(text: string) {
    try {
      await Clipboard.setStringAsync(text);
      Alert.alert('AI Markets', t('wallet.gpay.copied'));
    } catch {
      Alert.alert('AI Markets', t('wallet.gpay.copyFail'));
    }
  }

  return (
    <View style={styles.wrap}>
      <Text style={[styles.title, { color: colors.text }]}>{t('wallet.gpay.name')}</Text>
      <Text style={[styles.hint, { color: colors.textSecondary }]}>{t('wallet.gpay.hint')}</Text>

      {!config.enabled ? (
        <View style={[styles.box, { backgroundColor: colors.cardBackground, borderColor: colors.border }]}>
          <Text style={{ color: colors.textSecondary, lineHeight: 20, fontSize: 13 }}>{t('wallet.gpay.offline')}</Text>
        </View>
      ) : accountQ.isLoading ? (
        <Text style={[styles.hint, { color: colors.textSecondary }]}>{t('wallet.gpay.creating')}</Text>
      ) : !account ? (
        <View style={{ marginTop: 12, gap: 8 }}>
          {accountQ.isError ? (
            <Text style={{ color: colors.danger, fontSize: 13 }}>
              {getErrorMessage(accountQ.error as Error, language) || t('wallet.gpay.accountFail')}
            </Text>
          ) : null}
          <Button title={t('wallet.gpay.create')} variant="dark" onPress={() => void accountQ.refetch()} />
        </View>
      ) : (
        <>
          <View style={[styles.box, { backgroundColor: colors.cardBackground, borderColor: colors.border }]}>
            <Text style={{ color: colors.text, fontWeight: '800' }}>
              {account.bankCode} · {account.accountName}
            </Text>
            <Text style={[styles.label, { color: colors.textSecondary }]}>{t('wallet.gpay.accountNumber')}</Text>
            <View style={styles.row}>
              <Text selectable style={[styles.number, { color: colors.text }]}>
                {account.accountNumber}
              </Text>
              <Pressable
                onPress={() => void copy(account.accountNumber)}
                style={[styles.copy, { borderColor: colors.border }]}
                accessibilityRole="button"
              >
                <Text style={{ color: colors.text, fontWeight: '700', fontSize: 12 }}>{t('wallet.gpay.copy')}</Text>
              </Pressable>
            </View>
            {account.balanceVnd > 0 ? (
              <Text style={{ color: colors.success, fontWeight: '700', marginTop: 6, fontSize: 13 }}>
                {t('wallet.gpay.received', { amount: account.balanceVnd.toLocaleString('vi-VN') })}
              </Text>
            ) : null}
            {account.qrCode ? (
              <Image
                source={{ uri: qrUri(account.qrCode) }}
                style={styles.qr}
                resizeMode="contain"
                accessibilityLabel={t('wallet.gpay.qrAlt')}
              />
            ) : null}
          </View>

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
  row: { flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 4, flexWrap: 'wrap' },
  number: { fontSize: 20, fontWeight: '800', letterSpacing: 0.5 },
  copy: { borderWidth: 1, borderRadius: 8, paddingHorizontal: 10, paddingVertical: 5 },
  qr: { width: 180, height: 180, alignSelf: 'center', marginTop: 12, borderRadius: 10 },
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
