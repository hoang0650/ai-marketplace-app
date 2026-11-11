import React, { useState } from 'react';
import { Alert, Text, View } from 'react-native';
import { useQueryClient } from '@tanstack/react-query';
import { productsApi } from '@/api';
import type { Product } from '@/api/types';
import { Button } from '@/components/ui/Button';
import { Chip } from '@/components/ui/Chip';
import { Input } from '@/components/ui/Input';
import { useTheme, useT } from '@/hooks/useT';
import { getErrorMessage } from '@/lib/errors';
import { sellerPackageDraft } from '@/lib/servicePackages';
import { isHireRequestCategory } from '@/constants/categories';

/** Saves the amount in the currency the seller typed. No exchange rate is applied. */
export function ServicePackageEditor({ product }: { product: Product }) {
  const { colors } = useTheme();
  const { t, language } = useT();
  const qc = useQueryClient();
  const [name, setName] = useState('');
  const [scope, setScope] = useState('');
  const [deliverable, setDeliverable] = useState('');
  const [days, setDays] = useState('1');
  const [price, setPrice] = useState('');
  const [currency, setCurrency] = useState<'USD' | 'VND'>('USD');
  const [busy, setBusy] = useState(false);
  if (!isHireRequestCategory(product.category)) return null;
  const existing = product.servicePackages || [];

  const save = async () => {
    const draft = sellerPackageDraft({ name, scope, deliverable, durationDays: days, price, currency });
    if (!draft.ok) {
      Alert.alert('AI Markets', t(`pkg.err.${draft.code}`));
      return;
    }
    setBusy(true);
    try {
      await productsApi.update(product.id, {
        servicePackages: [...existing.map((row) => ({
          code: row.code,
          name: row.name,
          scope: row.scope,
          deliverables: row.deliverables,
          durationDays: row.durationDays,
          price: row.price,
          currency: row.currency,
          ...(row.phases ? { phases: row.phases } : {}),
        })), draft.row],
      });
      await qc.invalidateQueries({ queryKey: ['products', 'mine'] });
      setName('');
      setScope('');
      setDeliverable('');
      setPrice('');
      Alert.alert('AI Markets', t('pkg.seller.saved'));
    } catch (err) {
      Alert.alert('AI Markets', getErrorMessage(err, language));
    } finally {
      setBusy(false);
    }
  };

  return (
    <View style={{ gap: 4, marginTop: 8 }}>
      <Text style={{ color: colors.text, fontWeight: '700' }}>{t('pkg.seller.title')}</Text>
      {existing.map((row) => (
        <Text key={row.code} style={{ color: colors.textSecondary, fontSize: 12 }}>
          {row.name} · {row.price} {row.currency}
        </Text>
      ))}
      <Input label={t('pkg.seller.name')} value={name} onChangeText={setName} />
      <Input label={t('pkg.seller.scope')} value={scope} onChangeText={setScope} />
      <Input label={t('pkg.seller.deliverable')} value={deliverable} onChangeText={setDeliverable} />
      <Input label={t('pkg.seller.days')} value={days} onChangeText={setDays} keyboardType="number-pad" />
      <Input label={t('pkg.seller.price')} value={price} onChangeText={setPrice} keyboardType="decimal-pad" />
      <Text style={{ color: colors.textSecondary, fontSize: 12 }}>{t('pkg.seller.currency')}</Text>
      <View style={{ flexDirection: 'row', gap: 8 }}>
        <Chip label="USD" active={currency === 'USD'} onPress={() => setCurrency('USD')} />
        <Chip label="VND" active={currency === 'VND'} onPress={() => setCurrency('VND')} />
      </View>
      <Text style={{ color: colors.textSecondary, fontSize: 12, lineHeight: 18 }}>{t('pkg.seller.note')}</Text>
      <Button title={t('pkg.seller.save')} loading={busy} onPress={() => void save()} />
    </View>
  );
}
