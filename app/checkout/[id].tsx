import React, { useMemo, useState } from 'react';
import { Alert, ActivityIndicator, Platform, Text, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { href } from '@/lib/href';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { IssuedLicense, LicenseTerm } from '@/api/types';
import { billingApi, licensesApi, ordersApi, productsApi } from '@/api';
import { useAuth } from '@/hooks/useAuth';
import { useTheme } from '@/hooks/useT';
import { useT } from '@/hooks/useT';
import { Screen } from '@/components/ui/Screen';
import { Button } from '@/components/ui/Button';
import { Chip } from '@/components/ui/Chip';
import { availableLicenseTerms, formatDate, formatMoney, licenseUnitPrice, productPrice } from '@/utils/format';
import { getErrorMessage } from '@/lib/errors';
import { AnalyticsService } from '@/lib/analytics';
import { LoginPrompt } from '@/components/ui/LoginPrompt';
import { isContentCategory, isDownloadLicenseCategory, isLicenseCategory, isSkillCategory, isDatasetCategory } from '@/constants/categories';
import { findActiveLicense, findPaidOrder } from '@/lib/access';

export default function CheckoutScreen() {
  const { id, term: termParam } = useLocalSearchParams<{ id: string; term?: string }>();
  const router = useRouter();
  const qc = useQueryClient();
  const { isAuthenticated } = useAuth();
  const { colors } = useTheme();
  const { t, language } = useT();
  const [doneId, setDoneId] = useState('');
  const [issued, setIssued] = useState<IssuedLicense | null>(null);
  const [alreadyOwned, setAlreadyOwned] = useState(false);
  const product = useQuery({
    queryKey: ['product-by-id', id],
    queryFn: async () => {
      const list = await productsApi.list({ limit: 200 });
      const found = list.find((p) => p.id === id);
      if (found) return found;
      return productsApi.one(String(id));
    },
    enabled: !!id,
  });
  const licenses = useQuery({ queryKey: ['licenses'], queryFn: licensesApi.me, enabled: isAuthenticated });
  const orders = useQuery({ queryKey: ['orders'], queryFn: ordersApi.list, enabled: isAuthenticated });
  const p = product.data;
  const licensed = isLicenseCategory(p?.category);
  const terms = p && licensed ? availableLicenseTerms(p) : [];
  const initialTerm = (termParam === 'day' || termParam === 'month' || termParam === 'year' ? termParam : terms[0]) as LicenseTerm | undefined;
  const [term, setTerm] = useState<LicenseTerm | undefined>(undefined);
  const selected = term || initialTerm || 'month';
  const activeLicense = p ? findActiveLicense(licenses.data, p.id) : undefined;
  const paidOrder = p ? findPaidOrder(orders.data, p.id) : undefined;
  const owned = licensed ? !!activeLicense : !!paidOrder;
  const priceLabel = useMemo(() => {
    if (!p) return '';
    if (licensed) {
      const amount = licenseUnitPrice(p, selected);
      return `${formatMoney(amount, p.pricing?.currency || 'USD')} / ${t(`license.term.${selected}`)}`;
    }
    return productPrice(p);
  }, [p, licensed, selected, t]);

  const pay = useMutation({
    mutationFn: () =>
      billingApi.checkout(
        String(id),
        1,
        licensed ? selected : undefined,
        Platform.OS === 'ios' ? 'APP_STORE' : Platform.OS === 'android' ? 'GOOGLE_PLAY' : 'WEB',
      ),
    onSuccess: (res) => {
      const skipCharge = !!(res.alreadyLicensed || res.alreadyPurchased);
      if (!skipCharge) AnalyticsService.track('payment_completed', { orderId: res.orderId || '' });
      qc.invalidateQueries({ queryKey: ['orders'] });
      qc.invalidateQueries({ queryKey: ['wallet-summary'] });
      qc.invalidateQueries({ queryKey: ['licenses'] });
      setIssued(res.license || activeLicense || null);
      setAlreadyOwned(skipCharge);
      setDoneId(res.orderId || paidOrder?.id || 'owned');
    },
    onError: (e: Error) => Alert.alert('AI Markets', getErrorMessage(e, language)),
  });

  if (!isAuthenticated) return <LoginPrompt />;
  if (product.isLoading || licenses.isLoading || orders.isLoading) {
    return (
      <Screen>
        <ActivityIndicator color={colors.tint} style={{ marginTop: 40 }} />
      </Screen>
    );
  }
  if (doneId || owned) {
    const license = issued || activeLicense || null;
    return (
      <Screen>
        <Text style={{ color: colors.text, fontSize: 24, fontWeight: '700', marginTop: 24 }}>
          {alreadyOwned || owned ? t('checkout.alreadyOwned') : t('checkout.success')}
        </Text>
        {doneId && doneId !== 'owned' ? (
          <Text style={{ color: colors.textSecondary, marginTop: 8 }}>#{doneId}</Text>
        ) : paidOrder?.id ? (
          <Text style={{ color: colors.textSecondary, marginTop: 8 }}>#{paidOrder.id}</Text>
        ) : null}
        {license?.licenseKey ? (
          <View style={{ borderWidth: 1, borderColor: colors.border, backgroundColor: colors.cardBackground, borderRadius: 12, padding: 16, marginTop: 16 }}>
            <Text style={{ color: colors.textSecondary, fontSize: 12, fontWeight: '700' }}>{t('license.key')}</Text>
            <Text style={{ color: colors.text, fontSize: 18, fontWeight: '800', marginTop: 6 }}>{license.licenseKey}</Text>
            {license.expiresAt ? (
              <Text style={{ color: colors.textSecondary, marginTop: 8 }}>{t('license.expires', { date: formatDate(license.expiresAt, language) })}</Text>
            ) : null}
            <Text style={{ color: colors.textSecondary, marginTop: 8, lineHeight: 20 }}>
              {isContentCategory(license.category || p?.category)
                ? t('checkout.licenseHint')
                : isDownloadLicenseCategory(license.category || p?.category)
                  ? t('download.licenseHint')
                  : t('license.unlocked')}
            </Text>
          </View>
        ) : null}
        {p?.slug ? (
          <Button title={t('checkout.goProduct')} onPress={() => router.replace(href(`/product/${p.slug}`))} style={{ marginTop: 24 }} />
        ) : null}
        {(doneId && doneId !== 'owned') || paidOrder?.id ? (
          <Button
            title={t('checkout.viewOrder')}
            variant="outline"
            onPress={() => router.replace(href(`/order/${doneId !== 'owned' ? doneId : paidOrder?.id}`))}
            style={{ marginTop: 10 }}
          />
        ) : null}
        {license?.licenseKey ? (
          <Button title={t('license.mine')} variant="outline" onPress={() => router.replace(href('/licenses'))} style={{ marginTop: 10 }} />
        ) : null}
      </Screen>
    );
  }

  return (
    <Screen>
      <Text style={{ color: colors.text, fontSize: 24, fontWeight: '700', marginTop: 8 }}>{t('checkout.title')}</Text>
      {p ? (
        <View style={{ borderWidth: 1, borderColor: colors.border, backgroundColor: colors.cardBackground, borderRadius: 12, padding: 16, marginTop: 16 }}>
          <Text style={{ color: colors.text, fontWeight: '700' }}>{p.name}</Text>
          <Text style={{ color: colors.textSecondary, marginTop: 4 }}>{p.sellerName || p.creatorName}</Text>
          {licensed ? (
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 14 }}>
              {terms.map((item) => (
                <Chip
                  key={item}
                  label={`${t(`license.term.${item}`)} · ${formatMoney(licenseUnitPrice(p, item), p.pricing?.currency || 'USD')}`}
                  active={selected === item}
                  onPress={() => setTerm(item)}
                />
              ))}
            </View>
          ) : null}
          <Text style={{ color: colors.text, fontWeight: '800', marginTop: 12 }}>{priceLabel}</Text>
          <Text style={{ color: colors.textSecondary, marginTop: 12, lineHeight: 20 }}>
            {licensed
              ? t(isDownloadLicenseCategory(p.category) ? 'download.licenseHint' : 'checkout.licenseHint')
              : `${t('product.refund')} · ${t('product.terms')}`}
          </Text>
        </View>
      ) : null}
      <Button
        title={
          isSkillCategory(p?.category)
            ? t('product.cta.buySkill')
            : isDatasetCategory(p?.category)
              ? t('product.cta.buyDataset')
              : licensed
                ? t('product.buyLicense')
                : t('checkout.pay')
        }
        loading={pay.isPending}
        onPress={() => {
          AnalyticsService.track('payment_started');
          pay.mutate();
        }}
        style={{ marginTop: 24 }}
      />
    </Screen>
  );
}
