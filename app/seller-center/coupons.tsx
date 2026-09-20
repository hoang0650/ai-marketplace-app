import React, { useMemo, useState } from 'react';
import { Alert, Pressable, ScrollView, Text, View } from 'react-native';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { couponsApi, productsApi } from '@/api';
import type { Coupon } from '@/api/types';
import { useAuth } from '@/hooks/useAuth';
import { useTheme } from '@/hooks/useT';
import { useT } from '@/hooks/useT';
import { Screen } from '@/components/ui/Screen';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { Chip } from '@/components/ui/Chip';
import { LoginPrompt } from '@/components/ui/LoginPrompt';
import { formatDate, formatMoney } from '@/utils/format';
import { getErrorMessage } from '@/lib/errors';

export default function SellerCouponsScreen() {
  const qc = useQueryClient();
  const { isAuthenticated, user } = useAuth();
  const { colors } = useTheme();
  const { t, language } = useT();
  const [code, setCode] = useState('');
  const [type, setType] = useState<'percent' | 'amount'>('percent');
  const [value, setValue] = useState('10');
  const [productId, setProductId] = useState('');
  const [minSubtotal, setMinSubtotal] = useState('0');
  const [maxDiscount, setMaxDiscount] = useState('0');
  const [maxUses, setMaxUses] = useState('0');
  const [endsAt, setEndsAt] = useState('');

  const coupons = useQuery({ queryKey: ['seller-coupons'], queryFn: couponsApi.list, enabled: isAuthenticated });
  const products = useQuery({ queryKey: ['products', 'mine'], queryFn: () => productsApi.list({ limit: 200 }), enabled: isAuthenticated });
  const mine = useMemo(
    () => (products.data || []).filter((p) => p.creatorSlug === user?.creatorSlug || p.creatorId === user?.id),
    [products.data, user?.creatorSlug, user?.id],
  );

  const create = useMutation({
    mutationFn: () =>
      couponsApi.create({
        code,
        type,
        value: Number(value),
        productIds: productId ? [productId] : [],
        minSubtotal: Number(minSubtotal) || 0,
        maxDiscount: Number(maxDiscount) || 0,
        maxUses: Number(maxUses) || 0,
        endsAt: endsAt ? new Date(endsAt).toISOString() : null,
        maxUsesPerBuyer: 1,
      }),
    onSuccess: (row) => {
      qc.invalidateQueries({ queryKey: ['seller-coupons'] });
      setCode('');
      Alert.alert('AI Markets', `${t('seller.couponCreate')} ${row.code}`);
    },
    onError: (e: Error) => Alert.alert('AI Markets', getErrorMessage(e, language)),
  });

  const toggle = useMutation({
    mutationFn: (c: Coupon) => (c.active ? couponsApi.deactivate(c.id) : couponsApi.update(c.id, { active: true })),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['seller-coupons'] }),
    onError: (e: Error) => Alert.alert('AI Markets', getErrorMessage(e, language)),
  });

  if (!isAuthenticated) return <LoginPrompt />;

  return (
    <Screen>
      <ScrollView>
        <Text style={{ color: colors.text, fontSize: 22, fontWeight: '700', marginTop: 8 }}>{t('seller.coupons')}</Text>
        <Text style={{ color: colors.textSecondary, marginTop: 8, lineHeight: 20 }}>{t('seller.couponLead')}</Text>

        <View style={{ marginTop: 20 }}>
          <Input label={t('seller.couponCode')} value={code} onChangeText={setCode} autoCapitalize="characters" maxLength={24} />
          <Text style={{ color: colors.textSecondary, marginBottom: 8 }}>{t('seller.couponType')}</Text>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 12 }}>
            <Chip label={t('seller.couponPercent')} active={type === 'percent'} onPress={() => setType('percent')} />
            <Chip label={t('seller.couponAmount')} active={type === 'amount'} onPress={() => setType('amount')} />
          </View>
          <Input label={t('seller.couponValue')} value={value} onChangeText={setValue} keyboardType="decimal-pad" />
          <Text style={{ color: colors.textSecondary, marginBottom: 8 }}>{t('seller.couponAll')}</Text>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 12 }}>
            <Chip label={t('seller.couponAll')} active={!productId} onPress={() => setProductId('')} />
            {mine.map((p) => (
              <Chip key={p.id} label={p.name} active={productId === p.id} onPress={() => setProductId(p.id)} />
            ))}
          </View>
          <Input label={t('seller.couponMin')} value={minSubtotal} onChangeText={setMinSubtotal} keyboardType="decimal-pad" />
          <Input label={t('seller.couponMax')} value={maxDiscount} onChangeText={setMaxDiscount} keyboardType="decimal-pad" />
          <Input label={t('seller.couponUses')} value={maxUses} onChangeText={setMaxUses} keyboardType="number-pad" />
          <Input label={t('seller.couponExpiry')} value={endsAt} onChangeText={setEndsAt} placeholder="2026-12-31" />
          <Button title={t('seller.couponCreate')} loading={create.isPending} onPress={() => create.mutate()} />
        </View>

        <View style={{ marginTop: 28, paddingBottom: 40 }}>
          {(coupons.data || []).map((c) => (
            <View
              key={c.id}
              style={{
                borderWidth: 1,
                borderColor: colors.border,
                backgroundColor: colors.cardBackground,
                borderRadius: 12,
                padding: 14,
                marginBottom: 10,
              }}
            >
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', gap: 12, alignItems: 'center' }}>
                <View style={{ flex: 1 }}>
                  <Text style={{ color: colors.text, fontWeight: '800', letterSpacing: 0.6 }}>{c.code}</Text>
                  <Text style={{ color: colors.textSecondary, marginTop: 4 }}>
                    {c.type === 'percent' ? `${c.value}%` : formatMoney(c.value, 'USD')}
                    {' · '}
                    {c.usedCount}
                    {c.maxUses ? ` / ${c.maxUses}` : ''}
                    {c.endsAt ? ` · ${formatDate(c.endsAt, language)}` : ''}
                    {' · '}
                    {c.productIds.length ? mine.find((p) => p.id === c.productIds[0])?.name || c.productIds[0] : t('seller.couponAll')}
                  </Text>
                </View>
                <Pressable onPress={() => toggle.mutate(c)} style={{ minHeight: 40, justifyContent: 'center' }}>
                  <Text style={{ color: c.active ? colors.tint : colors.textSecondary, fontWeight: '700' }}>
                    {c.active ? t('seller.couponOn') : t('seller.couponOff')}
                  </Text>
                </Pressable>
              </View>
            </View>
          ))}
          {!coupons.data?.length ? (
            <Text style={{ color: colors.textSecondary, marginTop: 8 }}>{t('seller.couponEmpty')}</Text>
          ) : null}
        </View>
      </ScrollView>
    </Screen>
  );
}
