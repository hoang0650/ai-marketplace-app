import React from 'react';
import { Pressable, RefreshControl, ScrollView, Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { usageApi } from '@/api';
import type { BuyerUsageItem } from '@/api/types';
import { useAuth } from '@/hooks/useAuth';
import { useTheme } from '@/hooks/useT';
import { useT } from '@/hooks/useT';
import { Screen } from '@/components/ui/Screen';
import { LoginPrompt } from '@/components/ui/LoginPrompt';
import { displayFont } from '@/constants/fonts';
import { formatMoney, formatDate } from '@/utils/format';

function sourceLabel(t: (k: string) => string, row: BuyerUsageItem): string {
  if (row.source === 'openclaw') return t('usage.source.openclaw');
  if (row.source === 'hermes') return t('usage.source.hermes');
  if (row.source === 'playground') return t('usage.source.playground');
  if (row.source === 'gateway') return t('usage.source.gateway');
  if (row.source === 'gpu' || row.source === 'training') return t('usage.source.compute');
  return t('usage.source.api');
}

function titleFor(row: BuyerUsageItem, t: (k: string) => string): string {
  if (row.productName) return row.productName;
  if (row.model) return row.model;
  return sourceLabel(t, row);
}

export default function UsageScreen() {
  const router = useRouter();
  const { isAuthenticated } = useAuth();
  const { colors } = useTheme();
  const { t, language } = useT();

  const feed = useQuery({
    queryKey: ['usage-me'],
    queryFn: () => usageApi.me(100),
    enabled: isAuthenticated,
  });

  if (!isAuthenticated) return <LoginPrompt />;

  const summary = feed.data?.summary;
  const cur = feed.data?.currency || 'USD';
  const items = feed.data?.items || [];

  return (
    <Screen padded={false}>
      <ScrollView
        contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 40 }}
        refreshControl={<RefreshControl refreshing={feed.isFetching} onRefresh={() => feed.refetch()} />}
      >
        <Text style={{ color: colors.text, fontSize: 28, fontFamily: displayFont, fontWeight: '600', marginTop: 8 }}>
          {t('usage.title')}
        </Text>
        <Text style={{ color: colors.textSecondary, marginTop: 8, lineHeight: 21, fontSize: 14 }}>{t('usage.sub')}</Text>

        <Pressable onPress={() => router.push('/wallet')} style={{ marginTop: 12 }}>
          <Text style={{ color: '#c9a961', fontWeight: '700' }}>{t('usage.toWallet')}</Text>
        </Pressable>

        <LinearGradient colors={['#111111', '#2a2520']} style={{ borderRadius: 18, padding: 20, marginTop: 18 }}>
          <Text style={{ color: 'rgba(245,240,232,0.7)', fontSize: 11, fontWeight: '700' }}>{t('usage.stat.charged')}</Text>
          <Text style={{ color: '#c9a961', fontSize: 30, fontWeight: '800', marginTop: 6 }}>
            {formatMoney(summary?.totalCharged ?? 0, cur)}
          </Text>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 16, marginTop: 14 }}>
            <View>
              <Text style={{ color: 'rgba(245,240,232,0.65)', fontSize: 11 }}>{t('usage.stat.tokens')}</Text>
              <Text style={{ color: '#f5f0e8', fontWeight: '700', marginTop: 2 }}>{(summary?.totalTokens ?? 0).toLocaleString()}</Text>
            </View>
            <View>
              <Text style={{ color: 'rgba(245,240,232,0.65)', fontSize: 11 }}>{t('usage.stat.input')}</Text>
              <Text style={{ color: '#f5f0e8', fontWeight: '700', marginTop: 2 }}>
                {(summary?.totalInputTokens ?? 0).toLocaleString()}
              </Text>
            </View>
            <View>
              <Text style={{ color: 'rgba(245,240,232,0.65)', fontSize: 11 }}>{t('usage.stat.output')}</Text>
              <Text style={{ color: '#f5f0e8', fontWeight: '700', marginTop: 2 }}>
                {(summary?.totalOutputTokens ?? 0).toLocaleString()}
              </Text>
            </View>
            <View>
              <Text style={{ color: 'rgba(245,240,232,0.65)', fontSize: 11 }}>{t('usage.stat.requests')}</Text>
              <Text style={{ color: '#f5f0e8', fontWeight: '700', marginTop: 2 }}>{(summary?.requests ?? 0).toLocaleString()}</Text>
            </View>
          </View>
        </LinearGradient>

        <Text style={{ color: colors.text, fontSize: 18, fontWeight: '700', marginTop: 28, marginBottom: 4 }}>
          {t('usage.list.title')}
        </Text>

        {feed.isError ? (
          <Text style={{ color: colors.danger, marginTop: 8 }}>{t('usage.err.load')}</Text>
        ) : items.length === 0 ? (
          <Text style={{ color: colors.textSecondary, marginTop: 8, lineHeight: 20 }}>{t('usage.empty')}</Text>
        ) : (
          items.map((item) => (
            <View
              key={item.id}
              style={{
                paddingVertical: 14,
                borderBottomWidth: 1,
                borderColor: colors.border,
                gap: 4,
              }}
            >
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', gap: 12 }}>
                <View style={{ flex: 1 }}>
                  <Text style={{ color: colors.text, fontWeight: '700' }}>{titleFor(item, t)}</Text>
                  <Text style={{ color: colors.textSecondary, fontSize: 12, marginTop: 3 }}>
                    {sourceLabel(t, item)} · {formatDate(item.createdAt, language)}
                  </Text>
                </View>
                <Text style={{ color: colors.danger, fontWeight: '800' }}>−{formatMoney(item.amount, item.currency || cur)}</Text>
              </View>
              <Text style={{ color: colors.textSecondary, fontSize: 12 }}>
                {t('usage.col.in')} {item.inputTokens.toLocaleString()} · {t('usage.col.out')}{' '}
                {item.outputTokens.toLocaleString()} · Σ {item.tokens.toLocaleString()}
              </Text>
            </View>
          ))
        )}
      </ScrollView>
    </Screen>
  );
}
