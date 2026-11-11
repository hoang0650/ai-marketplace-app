import React, { useState } from 'react';
import { ActivityIndicator, Alert, Pressable, RefreshControl, ScrollView, Share, StyleSheet, Text, View } from 'react-native';
import { Stack, useRouter } from 'expo-router';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import * as Clipboard from 'expo-clipboard';
import { affiliateApi, ratePct, type AffiliateLink, type AffiliateStats } from '@/api/affiliate';
import { ApiError, getErrorMessage } from '@/lib/errors';
import {
  affiliateWithdrawBody,
  impliedVndPerUsd,
  isLegacyAffiliateMinimumRejection,
  parseAffiliateVndInput,
  quoteAffiliateWithdraw,
} from '@/lib/affiliateWithdraw';
import { affiliateIdentityReady, affiliateLinkGate, affiliateServerWindow, commissionViewState, ownPitSummary, payoutRequestIsTransfer } from '@/lib/affiliateProcess';
import { useAuth } from '@/hooks/useAuth';
import { useTheme, useT } from '@/hooks/useT';
import { Screen } from '@/components/ui/Screen';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { LoginPrompt } from '@/components/ui/LoginPrompt';
import { formatDate, formatMoney } from '@/utils/format';
import { href } from '@/lib/href';
import { openLegal, openWeb, webUrl } from '@/lib/legalLinks';

/** Pasted product/store URL or a bare product slug → link target. */
function parseTarget(raw: string): { productSlug?: string; storeSlug?: string } | null {
  const s = raw.trim();
  if (!s) return null;
  const m = s.match(/\/(product|store|seller)\/([^/?#]+)/);
  if (m) return m[1] === 'product' ? { productSlug: decodeURIComponent(m[2]) } : { storeSlug: decodeURIComponent(m[2]) };
  if (/^[a-z0-9][a-z0-9-]*$/i.test(s)) return { productSlug: s.toLowerCase() };
  return null;
}

function vndLabel(n: number) {
  return Math.round(Number(n) || 0).toLocaleString('vi-VN');
}

function serverPitRate(w: NonNullable<AffiliateStats['withdrawal']>): number {
  const rate = Number(w.pitRate);
  return Number.isFinite(rate) && rate > 0 ? rate : 0;
}

export default function AffiliateScreen() {
  const router = useRouter();
  const qc = useQueryClient();
  const { isAuthenticated } = useAuth();
  const { colors } = useTheme();
  const { t, language } = useT();
  const [target, setTarget] = useState('');
  const [link, setLink] = useState<AffiliateLink | null>(null);
  const [busy, setBusy] = useState(false);
  const [vndText, setVndText] = useState('');
  const [vndTouched, setVndTouched] = useState(false);
  const [wdBusy, setWdBusy] = useState(false);
  const [wdMsg, setWdMsg] = useState('');
  const q = useQuery({ queryKey: ['affiliate', 'me'], queryFn: affiliateApi.dashboard, enabled: isAuthenticated });
  const certQ = useQuery({
    queryKey: ['affiliate', 'pit-certificate'],
    queryFn: affiliateApi.pitCertificate,
    enabled: isAuthenticated,
    retry: false,
  });

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
  const w = s?.withdrawal;
  const availableVnd = Math.round(Number(w?.availableVnd) || 0);
  const amountSource = vndTouched ? vndText : availableVnd > 0 ? String(availableVnd) : vndText;
  const pitRate = w ? serverPitRate(w) : 0;
  const withdrawQuote = w
    ? quoteAffiliateWithdraw({
        amountVnd: parseAffiliateVndInput(amountSource),
        availableUsd: Number(w.available),
        availableVnd: Number(w.availableVnd),
        vndPerUsd: impliedVndPerUsd(Number(w.available), Number(w.availableVnd)),
      })
    : null;

  const requestWithdraw = async () => {
    if (!w || !withdrawQuote) return;
    const body = affiliateWithdrawBody(withdrawQuote);
    if (!body) {
      setWdMsg(t(`aff.wd.${withdrawQuote.code === 'ok' ? 'not_positive' : withdrawQuote.code}`));
      return;
    }
    if (s?.payoutReady === false) {
      setWdMsg(t('aff.kycNotice'));
      return;
    }
    setWdMsg('');
    setWdBusy(true);
    try {
      await affiliateApi.withdraw(body.amount);
      setWdMsg(t('aff.wd.sent'));
      setVndTouched(false);
      await q.refetch();
      await qc.invalidateQueries({ queryKey: ['wallet-summary'] });
      await qc.invalidateQueries({ queryKey: ['wallet-txs'] });
    } catch (err) {
      const server = getErrorMessage(err, language);
      const code = err instanceof ApiError ? err.code : '';
      setWdMsg(isLegacyAffiliateMinimumRejection(code) ? `${t('aff.wd.serverMin')} ${server}` : server);
    } finally {
      setWdBusy(false);
    }
  };

  const createLink = async () => {
    const parsed = parseTarget(target);
    if (!parsed) {
      Alert.alert('', t('aff.linkInvalid'));
      return;
    }
    setBusy(true);
    const gate = affiliateLinkGate({ kycStatus: s?.kycStatus, code: s?.code, linkReady: s?.linkReady });
    if (!gate.canCreateLink) {
      Alert.alert('', t(gate.code === 'KYC_REQUIRED' ? 'aff.kycNotice' : 'aff.err.ELECTRONIC_IDENTITY_NOT_IMPLEMENTED'));
      return;
    }
    try {
      setLink(await affiliateApi.link(parsed));
    } catch (err) {
      const code = err instanceof ApiError ? err.code : '';
      Alert.alert('', code === 'ELECTRONIC_IDENTITY_NOT_IMPLEMENTED' ? t('aff.err.ELECTRONIC_IDENTITY_NOT_IMPLEMENTED') : getErrorMessage(err, language));
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
      <Text style={[styles.hero, { color: colors.text }]}>
        {(() => {
          const max = affiliateServerWindow(s?.config).maxRatePercent;
          return max == null ? t('aff.heroPlain') : t('aff.heroRate', { rate: max });
        })()}
      </Text>
      <Text style={[muted, { marginBottom: 8, lineHeight: 20 }]}>{t('aff.lead')}</Text>
      <View style={[styles.card, { borderColor: colors.border }]}>
        <Text style={[styles.h, { color: colors.text }]}>{t('aff.roles.title')}</Text>
        <Text style={[muted, { lineHeight: 20 }]}>{t('aff.roles.body')}</Text>
        <Text style={[muted, { marginTop: 6, lineHeight: 20 }]}>{t('aff.roles.notManual')}</Text>
        <Text style={[muted, { marginTop: 6, lineHeight: 20 }]}>{t('aff.roles.provider')}</Text>
        <Text style={[muted, { marginTop: 6, lineHeight: 20 }]}>{t('aff.roles.notTransfer')}</Text>
        <Text style={[muted, { marginTop: 6, lineHeight: 20 }]}>{t('aff.policyVersion')}</Text>
      </View>

      {q.isLoading || !s ? (
        <ActivityIndicator color={colors.tint} />
      ) : (
        <>
          {s.kycRequired || !s.payoutReady ? (
            <Pressable onPress={() => router.push(href('/kyc'))} style={[styles.card, { borderColor: colors.border }]}>
              <Text style={{ color: colors.text }}>{t('aff.kycNotice')}</Text>
              <Text style={{ color: colors.tint, fontWeight: '700', marginTop: 4 }}>{t('aff.kycCta')}</Text>
            </Pressable>
          ) : null}

          <View style={styles.grid}>
            {[
              [t('aff.code'), s.code || '—'],
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
          {affiliateServerWindow(s.config).holdHours != null ? (
            <Text style={[muted, { fontSize: 12, marginBottom: 12 }]}>
              {t('aff.pendingHint', { hours: affiliateServerWindow(s.config).holdHours as number })}
            </Text>
          ) : (
            <Text style={[muted, { fontSize: 12, marginBottom: 12 }]}>{t('aff.pendingUnknown')}</Text>
          )}
          {s.commission.pitWithheld ? (
            <Text style={[muted, { fontSize: 12, marginBottom: 12 }]}>
              {t('aff.pitWithheld', { amount: formatMoney(s.commission.pitWithheld, cur) })}
            </Text>
          ) : null}

          {affiliateLinkGate({ kycStatus: s.kycStatus, code: s.code, linkReady: s.linkReady }).canCreateLink ? (
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
          ) : affiliateLinkGate({ kycStatus: s.kycStatus, code: s.code, linkReady: s.linkReady }).code === 'ELECTRONIC_IDENTITY_NOT_IMPLEMENTED' ? (
            <Text style={[muted, { marginBottom: 12, lineHeight: 20 }]}>{t('aff.err.ELECTRONIC_IDENTITY_NOT_IMPLEMENTED')}</Text>
          ) : null}

          {w ? (
            <View style={[styles.card, { borderColor: colors.border }]}>
              <Text style={[styles.h, { color: colors.text }]}>{t('aff.wd.title')}</Text>
              <Text style={[muted, { lineHeight: 20 }]}>{t('aff.wd.rule')}</Text>
              {w.pitCommitmentApplied ? (
                <Text style={[muted, { marginTop: 6, lineHeight: 20 }]}>{t('aff.wd.exempt')}</Text>
              ) : pitRate > 0 ? (
                <Text style={[muted, { marginTop: 6, lineHeight: 20 }]}>
                  {t('aff.wd.serverRate', { rate: Math.round(pitRate * 1000) / 10 })}
                </Text>
              ) : null}
              <Text style={{ color: colors.text, marginTop: 8 }}>{t('aff.wd.available', { amount: vndLabel(w.availableVnd) })}</Text>
              {!(Number(w.available) > 0) || !(Number(w.availableVnd) > 0) ? (
                <Text style={[muted, { marginTop: 6 }]}>{t('aff.wd.none')}</Text>
              ) : (
                <>
                  <Input
                    label={t('aff.wd.amount')}
                    value={amountSource}
                    onChangeText={(value) => {
                      setVndTouched(true);
                      setVndText(value);
                      setWdMsg('');
                    }}
                    keyboardType="number-pad"
                    autoCapitalize="none"
                  />
                  <Button
                    title={t('aff.wd.submit')}
                    loading={wdBusy}
                    disabled={wdBusy || !withdrawQuote?.ok || s.payoutReady === false}
                    onPress={() => void requestWithdraw()}
                  />
                  {withdrawQuote && !withdrawQuote.ok ? (
                    <Text style={{ color: colors.textSecondary, marginTop: 4 }}>{t(`aff.wd.${withdrawQuote.code}`)}</Text>
                  ) : withdrawQuote && pitRate > 0 ? (
                    <Text style={[muted, { marginTop: 4, lineHeight: 20 }]}>
                      {t('aff.wd.preview', {
                        gross: vndLabel(withdrawQuote.amountVnd),
                        pit: vndLabel(withdrawQuote.amountVnd * pitRate),
                        net: vndLabel(withdrawQuote.amountVnd - withdrawQuote.amountVnd * pitRate),
                      })}
                    </Text>
                  ) : withdrawQuote ? (
                    <Text style={[muted, { marginTop: 4 }]}>{t('aff.wd.previewPlain', { gross: vndLabel(withdrawQuote.amountVnd) })}</Text>
                  ) : null}
                </>
              )}
              {wdMsg ? <Text style={{ color: colors.text, marginTop: 8, lineHeight: 20 }}>{wdMsg}</Text> : null}
              {payoutRequestIsTransfer() ? null : (
                <Text style={[muted, { marginTop: 6, lineHeight: 20 }]}>{t('aff.roles.notTransfer')}</Text>
              )}
            </View>
          ) : null}

          <View style={[styles.card, { borderColor: colors.border }]}>
            <Text style={[styles.h, { color: colors.text }]}>{t('aff.cert.title')}</Text>
            {certQ.isError || !ownPitSummary(certQ.data).known ? (
              <Text style={[muted, { lineHeight: 20 }]}>{t('aff.cert.missing')}</Text>
            ) : (
              <Text style={[muted, { lineHeight: 20 }]}>
                {t('aff.cert.figures', {
                  year: ownPitSummary(certQ.data).year ?? '—',
                  income: ownPitSummary(certQ.data).totalIncomeVnd ?? '—',
                  pit: ownPitSummary(certQ.data).totalPitWithheldVnd ?? '—',
                  payments: ownPitSummary(certQ.data).payments ?? '—',
                })}
              </Text>
            )}
            <Text style={[muted, { marginTop: 6, lineHeight: 20 }]}>{t('aff.cert.disclaimer')}</Text>
            <Text style={[muted, { marginTop: 6, lineHeight: 20 }]}>
              {t('aff.roles.identity', {
                status: affiliateIdentityReady({ kycStatus: s.kycStatus }).electronicIdentityVerified
                  ? t('sell.review.ekyc.verified')
                  : t(`kyc.status.${s.kycStatus || 'none'}`),
              })}
            </Text>
          </View>

          {s.pitCommitment ? (
            <View style={[styles.card, { borderColor: colors.border }]}>
              <Text style={[styles.h, { color: colors.text }]}>{t('aff.pit08.title')}</Text>
              <Text style={muted}>{t('aff.pit08.status', { status: t(`aff.pit08.st.${s.pitCommitment.status}`) })}</Text>
              {s.pitCommitment.activeForCurrentYear ? (
                <Text style={[muted, { marginTop: 4 }]}>{t('aff.pit08.active', { year: s.pitCommitment.currentYear })}</Text>
              ) : null}
              {s.pitCommitment.status === 'rejected' && s.pitCommitment.rejectReason ? (
                <Text style={{ color: '#c0392b', marginTop: 4 }}>{s.pitCommitment.rejectReason}</Text>
              ) : null}
              <Pressable onPress={() => void openWeb(webUrl('/affiliate', language))} style={{ minHeight: 44, justifyContent: 'center' }}>
                <Text style={{ color: colors.tint, fontWeight: '700' }}>{t('aff.pit08.upload')}</Text>
              </Pressable>
            </View>
          ) : null}

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
                <Text style={[muted, { fontSize: 12 }]}>{t(`aff.state.${commissionViewState(r.state)}`)}</Text>
              </View>
            </View>
          ))}

          <Text style={[styles.h, { color: colors.text, marginTop: 16 }]}>{t('aff.rulesTitle')}</Text>
          {[
            t('aff.rule.kyc'),
            t('aff.rule.rate'),
            ...(affiliateServerWindow(s.config).attributionDays != null
              ? [t('aff.rule.window', { days: affiliateServerWindow(s.config).attributionDays as number })]
              : [t('aff.rule.windowUnknown')]),
            t('aff.rule.self'),
            ...(affiliateServerWindow(s.config).holdHours != null
              ? [t('aff.rule.hold', { hours: affiliateServerWindow(s.config).holdHours as number })]
              : [t('aff.rule.holdUnknown')]),
            t('aff.rule.refund'),
            t('aff.dispute.note'),
            t('aff.rule.pit'),
            t('aff.rule.pitCert'),
            t('aff.rule.banned'),
          ].map((line) => (
            <Text key={line} style={[muted, { marginBottom: 4, lineHeight: 19 }]}>
              • {line}
            </Text>
          ))}
          <Pressable onPress={() => void openLegal('chinh-sach-affiliate', language)} style={{ minHeight: 44, justifyContent: 'center' }}>
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
