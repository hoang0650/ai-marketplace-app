import React from 'react';
import { Pressable, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { dashboardApi, sellersApi } from '@/api';
import { useAuth } from '@/hooks/useAuth';
import { useTheme } from '@/hooks/useT';
import { useT } from '@/hooks/useT';
import { Screen } from '@/components/ui/Screen';
import { LoginPrompt } from '@/components/ui/LoginPrompt';
import { formatMoney } from '@/utils/format';
import { Badge } from '@/components/ui/Badge';

export default function SellerCenterScreen() {
  const router = useRouter();
  const { isAuthenticated, isCreator } = useAuth();
  const { colors } = useTheme();
  const { t } = useT();
  const me = useQuery({ queryKey: ['seller-me'], queryFn: sellersApi.me, enabled: isAuthenticated });
  const dash = useQuery({ queryKey: ['seller-dash'], queryFn: dashboardApi.summary, enabled: isAuthenticated && isCreator });
  const earnings = useQuery({ queryKey: ['seller-earnings'], queryFn: sellersApi.earnings, enabled: isAuthenticated && isCreator });

  if (!isAuthenticated) return <LoginPrompt />;

  const rows = [
    { label: t('seller.products'), href: '/seller-center/products' },
    { label: t('seller.revenue'), href: '/seller-center/revenue' },
    { label: t('seller.payout'), href: '/seller-center/payout' },
    { label: t('seller.tax'), href: '/seller-center/tax' },
    { label: t('protection.complaints'), href: '/seller-center/complaints' },
  ];

  return (
    <Screen>
      <Text style={{ color: colors.text, fontSize: 24, fontWeight: '700', marginTop: 8 }}>{t('seller.center')}</Text>
      {me.data?.verificationStatus === 'VERIFIED' ? <Badge label={t('common.verified')} /> : <Text style={{ color: colors.warning, marginTop: 8 }}>{t('seller.notVerified')}</Text>}
      {earnings.data ? (
        <View style={{ marginTop: 16, padding: 16, borderRadius: 12, backgroundColor: colors.luxDark }}>
          <Text style={{ color: '#c9a961' }}>{t('seller.net')}</Text>
          <Text style={{ color: '#f2efe8', fontSize: 24, fontWeight: '800' }}>{formatMoney(earnings.data.netPayable, earnings.data.currency)}</Text>
        </View>
      ) : dash.data ? (
        <Text style={{ color: colors.textSecondary, marginTop: 12 }}>{String(dash.data.netPayable ?? '')}</Text>
      ) : null}
      {rows.map((r) => (
        <Pressable key={r.href} onPress={() => router.push(r.href as never)} style={{ paddingVertical: 16, borderBottomWidth: 1, borderColor: colors.border, minHeight: 48 }}>
          <Text style={{ color: colors.text, fontWeight: '600' }}>{r.label}</Text>
        </Pressable>
      ))}
    </Screen>
  );
}
