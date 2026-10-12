import React, { useState } from 'react';
import { ActivityIndicator, Alert, Pressable, RefreshControl, ScrollView, Share, StyleSheet, Text, View } from 'react-native';
import { Stack, useRouter } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import * as Clipboard from 'expo-clipboard';
import { affiliateApi, ratePct, type AffiliateLink } from '@/api/affiliate';
import { useAuth } from '@/hooks/useAuth';
import { useTheme, useT } from '@/hooks/useT';
import { Screen } from '@/components/ui/Screen';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { LoginPrompt } from '@/components/ui/LoginPrompt';
import { formatDate, formatMoney } from '@/utils/format';
import { getErrorMessage } from '@/lib/errors';
import { href } from '@/lib/href';

/** Pasted product/store URL or a bare product slug → link target. */
function parseTarget(raw: string): { productSlug?: string; storeSlug?: string } | null {
  const s = raw.trim();
  if (!s) return null;
  const m = s.match(/\/(product|store|seller)\/([^/?#]+)/);
  if (m) return m[1] === 'product' ? { productSlug: decodeURIComponent(m[2]) } : { storeSlug: decodeURIComponent(m[2]) };
  if (/^[a-z0-9][a-z0-9-]*$/i.test(s)) return { productSlug: s.toLowerCase() };
  return null;
}

export default function AffiliateScreen() {
  const router = useRouter();
  const { isAuthenticated } = useAuth();
  const { colors } = useTheme();
  const { t, language } = useT();
  const [target, setTarget] = useState('');
  const [link, setLink] = useState<AffiliateLink | null>(null);
  const [busy, setBusy] = useState(false);
  const q = useQuery({ queryKey: ['affiliate', 'me'], queryFn: affiliateApi.dashboard, enabled: isAuthenticated });

  if (!isAuthenticated) {
    return (
      <Screen>
        <Stack.Screen options={{ title: t('aff.title') }} />
        <LoginPrompt />
      </Screen>
    );
  }

  const s = q.data;
  const cur = s?.currency || 'USD';
  const muted = { color: colors.textSecondary };

  const createLink = async () => {
    const parsed = parseTarget(target);
    if (!parsed) {
      Alert.alert('', t('aff.linkInvalid'));
      return;
    }
    setBusy(true);
    try {
      setLink(await affiliateApi.link(parsed));
    } catch (err) {
      Alert.alert('', getErrorMessage(err, language));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Screen>
      <Stack.Screen options={{ title: t('aff.title') }} />
      <ScrollView
        contentContainerStyle={{ paddingBottom: 32 }}
        refreshControl={<RefreshControl refreshing={q.isRefetching} onRefresh={() => void q.refetch()} />}
      >
      <Text style={[styles.hero, { color: colors.text }]}>{t('aff.hero')}</Text>
      <Text style={[muted, { marginBottom: 12, lineHeight: 20 }]}>{t('aff.lead')}</Text>

      {q.isLoading || !s ? (
        <ActivityIndicator color={colors.tint} />
      ) : (
        <>
          {!s.payoutReady ? (
            <Pressable onPress={() => router.push(href('/kyc'))} style={[styles.card, { borderColor: colors.border }]}>
              <Text style={{ color: colors.text }}>{t('aff.kycNotice')}</Text>
              <Text style={{ color: colors.tint, fontWeight: '700', marginTop: 4 }}>{t('aff.kycCta')}</Text>
            </Pressable>
          ) : null}

          <View style={styles.grid}>
            {[
              [t('aff.code'), s.code],
              [t('aff.clicks'), String(s.clicks)],
              [t('aff.orders'), String(s.orders)],
              [t('aff.pending'), formatMoney(s.commission.pending, cur)],
              [t('aff.available'), formatMoney(s.commission.available, cur)],
              [t('aff.reversed'), formatMoney(s.commission.reversed, cur)],
            ].map(([label, value]) => (
              <View key={label} style={[styles.kpi, { borderColor: colors.border, backgroundColor: colors.surface }]}>
                <Text style={[muted, { fontSize: 12 }]}>{label}</Text>
                <Text style={{ color: colors.text, fontWeight: '800', fontSize: 17, marginTop: 4 }} numberOfLines={1}>
                  {value}
                </Text>
              </View>
            ))}
          </View>
          <Text style={[muted, { fontSize: 12, marginBottom: 12 }]}>{t('aff.pendingHint', { hours: s.config.holdHours })}</Text>
          {s.commission.pitWithheld ? (
            <Text style={[muted, { fontSize: 12, marginBottom: 12 }]}>
              {t('aff.pitWithheld', { amount: formatMoney(s.commission.pitWithheld, cur) })}
            </Text>
          ) : null}

          <View style={[styles.card, { borderColor: colors.border }]}>
            <Text style={[styles.h, { color: colors.text }]}>{t('aff.linkTitle')}</Text>
            <Text style={[muted, { marginBottom: 8 }]}>{t('aff.linkHint')}</Text>
            <Input value={target} onChangeText={setTarget} placeholder={t('aff.linkPh')} autoCapitalize="none" />
            <Button title={t('aff.linkCreate')} loading={busy} onPress={() => void createLink()} />
            {link ? (
              <View style={{ marginTop: 10 }}>
                <Text selectable style={{ color: colors.text }}>{link.url}</Text>
                <Text style={[muted, { marginTop: 4 }]}>
                  {link.inProgram ? t('aff.linkRate', { rate: ratePct(link.rate) }) : t('aff.linkNotInProgram')}
                </Text>
                <View style={{ flexDirection: 'row', gap: 8, marginTop: 8 }}>
                  <Button
                    title={t('aff.copy')}
                    variant="outline"
                    onPress={() => void Clipboard.setStringAsync(link.url).then(() => Alert.alert('', t('aff.copied')))}
                    style={{ flex: 1 }}
                  />
                  <Button title={t('aff.share')} onPress={() => void Share.share({ message: link.url, url: link.url })} style={{ flex: 1 }} />
                </View>
              </View>
            ) : null}
          </View>

          <Text style={[styles.h, { color: colors.text, marginTop: 8 }]}>{t('aff.recent')}</Text>
          {s.recent.length === 0 ? <Text style={muted}>{t('aff.empty')}</Text> : null}
          {s.recent.map((r) => (
            <View key={r.id} style={[styles.row, { borderColor: colors.border }]}>
              <View style={{ flex: 1, minWidth: 0 }}>
                <Text style={{ color: colors.text, fontWeight: '700' }} numberOfLines={1}>
                  {r.productName}
                </Text>
                <Text style={[muted, { fontSize: 12 }]}>
                  {formatDate(r.createdAt, language)} · {formatMoney(r.baseAmount, r.currency)} · {ratePct(r.rate)}
                </Text>
              </View>
              <View style={{ alignItems: 'flex-end' }}>
                <Text style={{ color: colors.text, fontWeight: '800' }}>{formatMoney(r.netAmount - r.reversedAmount, r.currency)}</Text>
                <Text style={[muted, { fontSize: 12 }]}>{t(`aff.state.${r.state}`)}</Text>
              </View>
            </View>
          ))}

          <Text style={[styles.h, { color: colors.text, marginTop: 16 }]}>{t('aff.rulesTitle')}</Text>
          {[
            t('aff.rule.rate'),
            t('aff.rule.window', { days: s.config.attributionDays }),
            t('aff.rule.self'),
            t('aff.rule.hold', { hours: s.config.holdHours }),
            t('aff.rule.refund'),
            t('aff.rule.pit'),
            t('aff.rule.banned'),
          ].map((line) => (
            <Text key={line} style={[muted, { marginBottom: 4, lineHeight: 19 }]}>
              • {line}
            </Text>
          ))}
          <Pressable onPress={() => router.push(href('/legal/chinh-sach-affiliate'))} style={{ minHeight: 44, justifyContent: 'center' }}>
            <Text style={{ color: colors.tint, fontWeight: '700' }}>{t('aff.policy')}</Text>
          </Pressable>
        </>
      )}
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  hero: { fontSize: 20, fontWeight: '800', marginBottom: 6 },
  h: { fontSize: 16, fontWeight: '800', marginBottom: 6 },
  card: { borderWidth: 1, borderRadius: 12, padding: 12, marginBottom: 12 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 6 },
  kpi: { width: '48%', borderWidth: 1, borderRadius: 12, padding: 10 },
  row: { flexDirection: 'row', gap: 8, paddingVertical: 10, borderBottomWidth: StyleSheet.hairlineWidth },
});
