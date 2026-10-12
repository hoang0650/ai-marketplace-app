import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Stack } from 'expo-router';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { affiliateApi, percentToRate, ratePct } from '@/api/affiliate';
import { productsApi } from '@/api';
import { useAuth } from '@/hooks/useAuth';
import { useTheme, useT } from '@/hooks/useT';
import { Screen } from '@/components/ui/Screen';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { LoginPrompt } from '@/components/ui/LoginPrompt';
import { formatMoney } from '@/utils/format';
import { getErrorMessage } from '@/lib/errors';

const toPct = (rate: number | null | undefined) => (rate === null || rate === undefined ? '' : String(Math.round(rate * 1000) / 10));

/** Seller: store-default affiliate rate, per-product rates (0–25%) and affiliate sales. */
export default function SellerAffiliateScreen() {
  const qc = useQueryClient();
  const { isAuthenticated } = useAuth();
  const { colors } = useTheme();
  const { t, language } = useT();
  const q = useQuery({ queryKey: ['affiliate', 'seller'], queryFn: affiliateApi.seller, enabled: isAuthenticated });
  const [defaultPct, setDefaultPct] = useState('0');
  const [edits, setEdits] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState('');

  useEffect(() => {
    if (!q.data) return;
    setDefaultPct(toPct(q.data.defaultRate) || '0');
    setEdits(Object.fromEntries(q.data.products.map((p) => [p.id, toPct(p.affiliateRate)])));
  }, [q.data]);

  if (!isAuthenticated) {
    return (
      <Screen>
        <Stack.Screen options={{ title: t('sellAff.title') }} />
        <LoginPrompt />
      </Screen>
    );
  }

  const d = q.data;
  const cur = d?.currency || 'USD';
  const muted = { color: colors.textSecondary };

  const run = async (key: string, fn: () => Promise<unknown>) => {
    setSaving(key);
    try {
      await fn();
      await qc.invalidateQueries({ queryKey: ['affiliate', 'seller'] });
      Alert.alert('', t('sellAff.saved'));
    } catch (err) {
      Alert.alert('', getErrorMessage(err, language));
    } finally {
      setSaving('');
    }
  };

  const saveDefault = () => {
    const rate = percentToRate(defaultPct);
    if (rate === undefined || rate === null) return Alert.alert('', t('sellAff.invalid'));
    void run('default', () => affiliateApi.setDefaultRate(rate));
  };

  const saveProduct = (id: string) => {
    const rate = percentToRate(edits[id] ?? '', { allowEmpty: true });
    if (rate === undefined) return Alert.alert('', t('sellAff.invalid'));
    void run(id, () => productsApi.update(id, { affiliateRate: rate }));
  };

  return (
    <Screen>
      <Stack.Screen options={{ title: t('sellAff.title') }} />
      <ScrollView contentContainerStyle={{ paddingBottom: 32 }}>
        <Text style={[muted, { lineHeight: 20, marginBottom: 12 }]}>{t('sellAff.lead')}</Text>
        {q.isLoading || !d ? (
          <ActivityIndicator color={colors.tint} />
        ) : (
          <>
            <View style={[styles.card, { borderColor: colors.border }]}>
              <Text style={[styles.h, { color: colors.text }]}>{t('sellAff.defaultTitle')}</Text>
              <Text style={[muted, { marginBottom: 8 }]}>{t('sellAff.defaultHint')}</Text>
              <Input label={t('sellAff.ratePct')} value={defaultPct} onChangeText={setDefaultPct} keyboardType="decimal-pad" />
              <Button title={t('sellAff.save')} loading={saving === 'default'} onPress={saveDefault} />
              <Text style={{ color: colors.text, marginTop: 10, fontWeight: '600' }}>{t('sellAff.formula')}</Text>
              <Text style={[muted, { marginTop: 4 }]}>{t('sellAff.example')}</Text>
            </View>

            <View style={[styles.card, { borderColor: colors.border }]}>
              <Text style={[styles.h, { color: colors.text }]}>{t('sellAff.stats')}</Text>
              <Text style={{ color: colors.text }}>
                {t('aff.clicks')}: {d.clicks} · {t('aff.orders')}: {d.orders}
              </Text>
              <Text style={{ color: colors.text }}>
                {t('sellAff.sales')}: {formatMoney(d.sales, cur)} · {t('sellAff.paid')}: {formatMoney(d.commission, cur)}
              </Text>
            </View>

            <Text style={[styles.h, { color: colors.text }]}>{t('sellAff.products')}</Text>
            <Text style={[muted, { marginBottom: 8 }]}>{t('sellAff.productsHint')}</Text>
            {d.products.map((p) => (
              <View key={p.id} style={[styles.card, { borderColor: colors.border }]}>
                <Text style={{ color: colors.text, fontWeight: '700' }} numberOfLines={1}>
                  {p.name}
                </Text>
                <Text style={[muted, { fontSize: 12, marginBottom: 6 }]}>
                  {t('sellAff.effective')}: {ratePct(p.effectiveRate)} · {t('aff.orders')}: {p.orders} · {t('sellAff.paid')}:{' '}
                  {formatMoney(p.commission, cur)}
                </Text>
                <Input
                  label={t('sellAff.productRate')}
                  value={edits[p.id] ?? ''}
                  onChangeText={(v) => setEdits((e) => ({ ...e, [p.id]: v }))}
                  keyboardType="decimal-pad"
                  placeholder={t('sellAff.inherit')}
                />
                <Button title={t('sellAff.save')} variant="outline" loading={saving === p.id} onPress={() => saveProduct(p.id)} />
              </View>
            ))}
          </>
        )}
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  h: { fontSize: 16, fontWeight: '800', marginBottom: 6 },
  card: { borderWidth: 1, borderRadius: 12, padding: 12, marginBottom: 12 },
});
