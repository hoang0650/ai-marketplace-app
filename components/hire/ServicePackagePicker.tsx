import React from 'react';
import { Alert, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { hireApi } from '@/api';
import type { Product, ServicePackage } from '@/api/types';
import { Button } from '@/components/ui/Button';
import { Chip } from '@/components/ui/Chip';
import { useTheme, useT } from '@/hooks/useT';
import { href } from '@/lib/href';
import { getErrorMessage } from '@/lib/errors';
import { formatMoney } from '@/utils/format';
import { packagePriceVnd, paymentChoiceOf, type PaymentChoice } from '@/lib/servicePackages';

export function ServicePackagePicker({ product }: { product: Product }) {
  const { colors } = useTheme();
  const { t, language } = useT();
  const router = useRouter();
  const packages = product.servicePackages || [];
  const [code, setCode] = React.useState(packages[0]?.code || '');
  const [choice, setChoice] = React.useState<PaymentChoice>('staged');
  const [busy, setBusy] = React.useState(false);
  const selected = packages.find((row) => row.code === code) || packages[0];

  const priceText = (row: ServicePackage) => {
    if (language !== 'vi') return `${row.price} ${row.currency || 'USD'}`;
    const vnd = packagePriceVnd(row.priceVnd);
    return vnd == null ? t('pkg.priceMissing') : formatMoney(vnd, 'VND');
  };

  const start = async () => {
    const paymentChoice = paymentChoiceOf(choice);
    if (!paymentChoice) return;
    if (packages.length && !selected) {
      Alert.alert('AI Markets', t('pkg.none'));
      return;
    }
    setBusy(true);
    try {
      const proj = await hireApi.startPackage(product.id, {
        ...(selected ? { packageCode: selected.code } : {}),
        paymentChoice,
      });
      router.push(href(`/hire/${proj.id}${proj.existing ? '' : '?started=1'}`));
    } catch (err) {
      Alert.alert('AI Markets', getErrorMessage(err, language));
    } finally {
      setBusy(false);
    }
  };

  return (
    <View style={{ marginTop: 16, gap: 8 }}>
      <Text style={{ color: colors.text, fontWeight: '800' }}>{t('pkg.choose')}</Text>
      {packages.length === 0 ? <Text style={{ color: colors.textSecondary }}>{t('pkg.none')}</Text> : null}
      {packages.map((row) => (
        <Chip key={row.code} label={`${row.name} · ${priceText(row)}`} active={selected?.code === row.code} onPress={() => setCode(row.code)} />
      ))}
      {selected ? <Text style={{ color: colors.textSecondary, lineHeight: 20 }}>{selected.scope}</Text> : null}
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
        <Chip label={t('pkg.staged')} active={choice === 'staged'} onPress={() => setChoice('staged')} />
        <Chip label={t('pkg.prepaid')} active={choice === 'prepaid'} onPress={() => setChoice('prepaid')} />
      </View>
      <Text style={{ color: colors.textSecondary, lineHeight: 20 }}>{choice === 'prepaid' ? t('pkg.prepaidHold') : t('pkg.stagedHold')}</Text>
      <Button title={t('pkg.start')} loading={busy} onPress={() => void start()} />
    </View>
  );
}
