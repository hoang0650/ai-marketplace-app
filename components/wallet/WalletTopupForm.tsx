import React from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { Button } from '@/components/ui/Button';
import { useTheme } from '@/hooks/useT';
import { useT } from '@/hooks/useT';
import { WALLET_IAP_PACKS, parseTopupAmount, resolveIapPack } from '@/lib/iap-packs';
import { formatMoney } from '@/utils/format';

type Props = {
  amount: string;
  onAmountChange: (value: string) => void;
  hint: string;
  notice?: string;
  submitLabel: string;
  onSubmit: () => void;
  busy?: boolean;
  disabled?: boolean;
  storePrice?: string;
};

export function WalletTopupForm({
  amount,
  onAmountChange,
  hint,
  notice,
  submitLabel,
  onSubmit,
  busy,
  disabled,
  storePrice,
}: Props) {
  const { colors } = useTheme();
  const { t } = useT();
  const parsed = parseTopupAmount(amount);
  const resolved = parsed.ok ? resolveIapPack(parsed.usd) : null;
  const activeUsd = parsed.ok ? parsed.usd : 0;

  return (
    <View style={styles.wrap}>
      <Text style={[styles.title, { color: colors.text }]}>{t('wallet.topup')}</Text>
      <Text style={[styles.hint, { color: colors.textSecondary }]}>{hint}</Text>
      {notice ? (
        <Text style={[styles.notice, { color: colors.textSecondary, backgroundColor: colors.cardBackground, borderColor: colors.border }]}>
          {notice}
        </Text>
      ) : null}

      <View style={[styles.amountBox, { backgroundColor: colors.cardBackground, borderColor: colors.border }]}>
        <Text style={[styles.currency, { color: colors.textSecondary }]}>USD</Text>
        <TextInput
          value={amount}
          onChangeText={(v) => onAmountChange(v.replace(/[^\d.,]/g, ''))}
          keyboardType="decimal-pad"
          placeholder="10"
          placeholderTextColor={colors.textSecondary}
          accessibilityLabel={t('wallet.topup.amount')}
          style={[styles.input, { color: colors.text }]}
        />
      </View>

      <Text style={[styles.quickLabel, { color: colors.textSecondary }]}>{t('wallet.topup.quick')}</Text>
      <View style={styles.chips}>
        {WALLET_IAP_PACKS.map((pack) => {
          const on = activeUsd === pack.usd;
          return (
            <Pressable
              key={pack.sku}
              onPress={() => onAmountChange(String(pack.usd))}
              style={[
                styles.chip,
                {
                  borderColor: on ? colors.tint : colors.border,
                  backgroundColor: on ? colors.luxDark : colors.cardBackground,
                },
              ]}
            >
              <Text style={{ color: on ? '#f2efe8' : colors.text, fontWeight: '700' }}>{formatMoney(pack.usd, 'USD')}</Text>
            </Pressable>
          );
        })}
      </View>

      {resolved && !resolved.exact ? (
        <Text style={[styles.snap, { color: colors.warning }]}>
          {t('wallet.topup.snap', { pack: formatMoney(resolved.pack.usd, 'USD') })}
        </Text>
      ) : null}

      <Button
        title={busy ? '…' : storePrice && resolved?.exact ? `${submitLabel} · ${storePrice}` : submitLabel}
        variant="dark"
        onPress={onSubmit}
        loading={!!busy}
        disabled={disabled || busy || !parsed.ok}
        style={{ marginTop: 16 }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { marginTop: 20 },
  title: { fontSize: 18, fontWeight: '700' },
  hint: { marginTop: 8, lineHeight: 21, fontSize: 14 },
  notice: { marginTop: 12, borderWidth: 1, borderRadius: 12, padding: 12, lineHeight: 20, fontSize: 13 },
  amountBox: {
    marginTop: 16,
    borderWidth: 1,
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 10,
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: 64,
  },
  currency: { fontSize: 13, fontWeight: '800', marginRight: 10 },
  input: { flex: 1, fontSize: 32, fontWeight: '700', paddingVertical: 4 },
  quickLabel: { marginTop: 14, fontSize: 12, fontWeight: '700' },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 8 },
  chip: { borderWidth: 1, borderRadius: 999, paddingHorizontal: 14, paddingVertical: 8 },
  snap: { marginTop: 10, fontSize: 13, lineHeight: 18 },
});
