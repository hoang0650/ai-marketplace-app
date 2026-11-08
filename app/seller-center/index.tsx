import React from 'react';
import { Pressable, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { dashboardApi, kycApi, sellersApi } from '@/api';
import { useAuth } from '@/hooks/useAuth';
import { useTheme, useT } from '@/hooks/useT';
import { Screen } from '@/components/ui/Screen';
import { LoginPrompt } from '@/components/ui/LoginPrompt';
import { formatMoney } from '@/utils/format';
import { supplierReviewView } from '@/lib/supplierReview';

export default function SellerCenterScreen() {
  const router = useRouter();
  const { isAuthenticated, isSeller } = useAuth();
  const { colors } = useTheme();
  const { t } = useT();
  const me = useQuery({ queryKey: ['seller-me'], queryFn: sellersApi.me, enabled: isAuthenticated });
  const kyc = useQuery({ queryKey: ['kyc-me'], queryFn: kycApi.me, enabled: isAuthenticated, retry: false });
  const dash = useQuery({ queryKey: ['seller-dash'], queryFn: dashboardApi.summary, enabled: isAuthenticated && isSeller });
  const earnings = useQuery({ queryKey: ['seller-earnings'], queryFn: sellersApi.earnings, enabled: isAuthenticated && isSeller });

  if (!isAuthenticated) return <LoginPrompt />;

  const rows = [
    { label: t('seller.products'), href: '/seller-center/products' },
    { label: t('builder.tpl.sell.title'), href: '/seller-center/templates' },
    { label: t('scn.menu'), href: '/seller-center/compute' },
    { label: t('nav.messages'), href: '/(tabs)/messages' },
    { label: t('seller.coupons'), href: '/seller-center/coupons' },
    { label: t('seller.revenue'), href: '/seller-center/revenue' },
    { label: t('seller.payout'), href: '/seller-center/payout' },
    { label: t('seller.tax'), href: '/seller-center/tax' },
    { label: t('protection.complaints'), href: '/seller-center/complaints' },
  ];

  return (
    <Screen>
      <Text style={{ color: colors.text, fontSize: 24, fontWeight: '700', marginTop: 8 }}>{t('seller.center')}</Text>
      <SupplierReviewPanel
        profile={me.data}
        profileReady={me.isSuccess}
        identityStatus={kyc.data?.status}
        identityKnown={kyc.isSuccess}
      />
      {earnings.data || dash.data ? (
        <View style={{ marginTop: 16, padding: 16, borderRadius: 12, backgroundColor: colors.luxDark }}>
          <Text style={{ color: '#c9a961' }}>{t('seller.net')}</Text>
          <Text style={{ color: '#f2efe8', fontSize: 24, fontWeight: '800' }}>
            {earnings.data
              ? formatMoney(earnings.data.netPayable, earnings.data.currency)
              : formatMoney(Number(dash.data?.netPayable) || 0, String(dash.data?.currency || 'USD'))}
          </Text>
        </View>
      ) : null}
      {rows.map((r) => (
        <Pressable key={r.href} onPress={() => router.push(r.href as never)} style={{ paddingVertical: 16, borderBottomWidth: 1, borderColor: colors.border, minHeight: 48 }}>
          <Text style={{ color: colors.text, fontWeight: '600' }}>{r.label}</Text>
        </Pressable>
      ))}
    </Screen>
  );
}

function SupplierReviewPanel({
  profile,
  profileReady,
  identityStatus,
  identityKnown,
}: {
  profile: { verificationStatus?: string; manualTaxReview?: { status?: string; reason?: string } | null; statusReason?: string; sellerAgreementAcceptedAt?: string | null; canPublish?: boolean } | null | undefined;
  profileReady: boolean;
  identityStatus?: string | null;
  identityKnown: boolean;
}) {
  const { colors } = useTheme();
  const { t } = useT();
  if (!profileReady) {
    return <Text style={{ color: colors.textSecondary, marginTop: 8, lineHeight: 20 }}>{t('sell.review.waiting')}</Text>;
  }
  const present = !!profile && Object.prototype.hasOwnProperty.call(profile, 'manualTaxReview');
  const view = supplierReviewView({
    verificationStatus: profile?.verificationStatus,
    manualTaxReviewFieldPresent: present,
    manualStatus: profile?.manualTaxReview?.status,
    statusReason: profile?.manualTaxReview?.reason || profile?.statusReason,
    sellerAgreementAcceptedAt: profile?.sellerAgreementAcceptedAt,
    canPublish: profile?.canPublish,
    electronicIdentityKnown: identityKnown,
    electronicIdentityStatus: identityStatus,
  });
  const manualKey = view.manualStatusKnown ? `sell.review.manual.${view.manualStatus}` : 'sell.review.manualUnknown';
  const ekycKey = view.electronicIdentityKnown ? `sell.review.ekyc.${view.electronicIdentityStatus}` : 'sell.review.ekycUnknown';
  return (
    <View style={{ marginTop: 12, padding: 12, borderRadius: 12, borderWidth: 1, borderColor: colors.border }}>
      <Text style={{ color: colors.text, fontWeight: '700' }}>{t('sell.review.manualTitle')}</Text>
      <Text style={{ color: colors.textSecondary, marginTop: 6, lineHeight: 20 }}>{t('sell.review.notEkyc')}</Text>
      <Text style={{ color: colors.text, marginTop: 8 }}>{t(manualKey)}</Text>
      {view.reason ? <Text style={{ color: colors.textSecondary, marginTop: 4 }}>{view.reason}</Text> : null}
      <Text style={{ color: colors.text, marginTop: 8 }}>
        {t('sell.review.ekycLabel')}: {t(ekycKey)}
      </Text>
      <Text style={{ color: colors.textSecondary, marginTop: 6 }}>{view.contractAccepted ? t('sell.review.contractOn') : t('sell.review.contractOff')}</Text>
      <Text style={{ color: colors.textSecondary, marginTop: 4 }}>{view.serverCanPublish ? t('sell.review.publishOn') : t('sell.review.publishOff')}</Text>
    </View>
  );
}
