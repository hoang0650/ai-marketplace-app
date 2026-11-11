import React from 'react';
import { Alert, Text, View } from 'react-native';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { productsApi, usageApi } from '@/api';
import type { Product } from '@/api/types';
import { Chip } from '@/components/ui/Chip';
import { useTheme, useT } from '@/hooks/useT';
import { ApiError, getErrorMessage } from '@/lib/errors';
import { labelForUnit, unitsForCategory, usageUnitChoice } from '@/lib/usageUnits';

/** Saves a catalog code. Free text is not offered. */
export function UsageUnitPicker({ product }: { product: Product }) {
  const { colors } = useTheme();
  const { t, language } = useT();
  const qc = useQueryClient();
  const catalog = useQuery({ queryKey: ['usage-units'], queryFn: () => usageApi.units(), retry: false, staleTime: 60 * 60 * 1000 });
  const choices = unitsForCategory(catalog.data, product.category);
  if (product.pricing?.model !== 'usage' && !product.pricing?.usageUnit) return null;
  const current = String(product.pricing?.usageUnit || '');
  const known = choices.some((unit) => unit.code === current);

  const save = async (code: string) => {
    const decision = usageUnitChoice(code, choices.map((unit) => unit.code));
    if (!decision.ok) {
      Alert.alert('AI Markets', t(`price.err.${decision.code}`) !== `price.err.${decision.code}` ? t(`price.err.${decision.code}`) : decision.code);
      return;
    }
    try {
      const src = product.pricing || {};
      await productsApi.update(product.id, {
        pricing: {
          model: 'usage',
          ...(src.price != null ? { price: src.price } : {}),
          ...(src.usageRate != null ? { usageRate: src.usageRate } : {}),
          ...(src.currency ? { currency: src.currency } : {}),
          ...(src.interval ? { interval: src.interval } : {}),
          ...(src.compareAtPrice != null ? { compareAtPrice: src.compareAtPrice } : {}),
          usageUnit: decision.code,
        },
      });
      await qc.invalidateQueries({ queryKey: ['products', 'mine'] });
      Alert.alert('AI Markets', t('usage.unit.saved'));
    } catch (err) {
      const codeName = err instanceof ApiError ? err.code : '';
      Alert.alert('AI Markets', codeName === 'USAGE_UNIT_INVALID' || codeName === 'USAGE_UNIT_NOT_METERABLE' ? getErrorMessage(err, language) : getErrorMessage(err, language));
    }
  };

  return (
    <View style={{ gap: 6 }}>
      <Text style={{ color: colors.textSecondary, fontSize: 12 }}>{t('usage.unit.label')}</Text>
      {!catalog.data ? <Text style={{ color: colors.textSecondary, fontSize: 12 }}>{t('usage.unit.missing')}</Text> : null}
      {!known && current ? <Text style={{ color: colors.textSecondary, fontSize: 12 }}>{t('usage.unit.needsReview')}</Text> : null}
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
        {choices.map((unit) => (
          <Chip key={unit.code} label={labelForUnit(unit, language)} active={current === unit.code} onPress={() => void save(unit.code)} />
        ))}
      </View>
    </View>
  );
}
