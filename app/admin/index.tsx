import React, { useMemo, useState } from 'react';
import { ActivityIndicator, Alert, Linking, Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Stack } from 'expo-router';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { adminApi } from '@/api';
import type { AdminDailyPoint, AdminGranularity, AdminOverview, Order } from '@/api/types';
import { useAuth } from '@/hooks/useAuth';
import { useTheme, useT } from '@/hooks/useT';
import { Screen } from '@/components/ui/Screen';
import { Chip } from '@/components/ui/Chip';
import { Button } from '@/components/ui/Button';
import { EmptyState } from '@/components/ui/EmptyState';
import { LoginPrompt } from '@/components/ui/LoginPrompt';
import { BarChart, ChartLine, Donut, MetricKey, RevenueChart } from '@/components/admin/AdminCharts';
import { formatDate, formatMoney } from '@/utils/format';
import { getErrorMessage } from '@/lib/errors';

type Tab = 'overview' | 'shops' | 'people' | 'ops' | 'disputes';
const TABS: Tab[] = ['overview', 'shops', 'people', 'ops', 'disputes'];
const GRANULARITIES: AdminGranularity[] = ['day', 'week', 'month'];
const BAR_METRICS: MetricKey[] = ['orders', 'deposits', 'users'];
const MONEY_METRICS = new Set<MetricKey>(['gross', 'platformFee', 'sellerNet', 'deposits']);
const WEB = 'https://aimarkets.vn';

const OPS = [
  { key: 'finance', path: '/admin/finance' },
  { key: 'kyc', path: '/admin/kyc' },
  { key: 'purges', path: '/admin/agent-purges' },
  { key: 'complaints', path: '/admin/complaints' },
] as const;

export default function AdminScreen() {
  const { colors } = useTheme();
  const { t, language } = useT();
  const { isAuthenticated, isAdmin } = useAuth();
  const qc = useQueryClient();
  const [tab, setTab] = useState<Tab>('overview');
  const [granularity, setGranularity] = useState<AdminGranularity>('day');
  const [barMetric, setBarMetric] = useState<MetricKey>('orders');

  const enabled = isAuthenticated && isAdmin;
  const overview = useQuery({ queryKey: ['admin', 'overview'], queryFn: adminApi.overview, enabled });
  const disputes = useQuery({ queryKey: ['admin', 'disputes'], queryFn: adminApi.disputes, enabled });
  const periodQ = useQuery({
    queryKey: ['admin', 'series', granularity],
    queryFn: () => adminApi.revenueSeries(granularity),
    enabled: enabled && granularity !== 'day',
  });
  const resolve = useMutation({
    mutationFn: ({ id, resolution }: { id: string; resolution: 'seller' | 'buyer' }) => adminApi.resolveDispute(id, resolution),
    onSuccess: () => void qc.invalidateQueries({ queryKey: ['admin'] }),
    onError: (err) => Alert.alert(t('admin.error'), getErrorMessage(err, language)),
  });

  if (!isAuthenticated) {
    return (
      <Screen>
        <Stack.Screen options={{ title: t('admin.title') }} />
        <LoginPrompt />
      </Screen>
    );
  }
  if (!isAdmin) {
    return (
      <Screen>
        <Stack.Screen options={{ title: t('admin.title') }} />
        <EmptyState title={t('admin.forbidden')} />
      </Screen>
    );
  }

  const d = overview.data;
  const cur = d?.currency || 'USD';
  const money = (v: number) => formatMoney(v || 0, cur);
  const openDisputes = (disputes.data || []).filter((o) => o.disputeStatus === 'open').length;
  const series: AdminDailyPoint[] = (granularity === 'day' ? d?.series : periodQ.data?.series) || [];

  const refresh = () => {
    void overview.refetch();
    void disputes.refetch();
    if (granularity !== 'day') void periodQ.refetch();
  };

  const confirmResolve = (o: Order, resolution: 'seller' | 'buyer') => {
    Alert.alert(t(resolution === 'seller' ? 'admin.disputes.keep' : 'admin.disputes.refund'), o.productName, [
      { text: t('common.cancel'), style: 'cancel' },
      { text: t('admin.confirm'), onPress: () => resolve.mutate({ id: o.id, resolution }) },
    ]);
  };

  return (
    <Screen>
      <Stack.Screen options={{ title: t('admin.title') }} />
      <ScrollView
        contentContainerStyle={{ paddingBottom: 40 }}
        refreshControl={<RefreshControl refreshing={overview.isRefetching} onRefresh={refresh} tintColor={colors.tint} />}
      >
        <Text style={[styles.lede, { color: colors.textSecondary }]}>{t('admin.lede')}</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.tabs}>
          {TABS.map((k) => (
            <Chip
              key={k}
              label={k === 'disputes' && openDisputes ? `${t(`admin.tab.${k}`)} (${openDisputes})` : t(`admin.tab.${k}`)}
              active={tab === k}
              onPress={() => setTab(k)}
            />
          ))}
        </ScrollView>

        {overview.isError ? (
          <Text style={{ color: colors.danger, marginBottom: 8 }}>{getErrorMessage(overview.error, language)}</Text>
        ) : null}
        {overview.isLoading || !d ? (
          <ActivityIndicator color={colors.tint} style={{ marginTop: 24 }} />
        ) : (
          <>
            {tab === 'overview' ? (
              <OverviewTab
                d={d}
                money={money}
                series={series}
                seriesLoading={granularity !== 'day' && periodQ.isLoading}
                granularity={granularity}
                setGranularity={setGranularity}
                barMetric={barMetric}
                setBarMetric={setBarMetric}
              />
            ) : null}

            {tab === 'shops' ? (
              <Card title={t('admin.shops.title')} hint={t('admin.shops.hint')}>
                {d.shops.length ? (
                  d.shops.map((s) => (
                    <View key={s.sellerId} style={[styles.row, { borderColor: colors.border }]}>
                      <View style={styles.between}>
                        <Text style={[styles.strong, { color: colors.text, flex: 1 }]} numberOfLines={1}>
                          {s.shopName}
                        </Text>
                        <Text style={[styles.strong, { color: colors.text }]}>{money(s.grossRevenue)}</Text>
                      </View>
                      <Text style={[styles.sub, { color: colors.textSecondary }]}>
                        {t('admin.shops.orders', { n: s.orders })} · {t('admin.metric.platformFee')} {money(s.platformFee)} ·{' '}
                        {t('admin.metric.playFee')} {money(s.playStoreFeeAmount || 0)} · {t('admin.metric.appFee')}{' '}
                        {money(s.appStoreFeeAmount || 0)}
                      </Text>
                      <Text style={[styles.sub, { color: colors.success }]}>
                        {t('admin.metric.sellerNet')}: {money(s.sellerNet)}
                      </Text>
                    </View>
                  ))
                ) : (
                  <Text style={{ color: colors.textSecondary }}>{t('admin.shops.empty')}</Text>
                )}
              </Card>
            ) : null}

            {tab === 'people' ? (
              <>
                <Card title={t('admin.people.users')}>
                  {d.usersList.map((u) => (
                    <Pressable
                      key={u.id}
                      onPress={() => void Linking.openURL(`${WEB}/admin/users/${u.id}`)}
                      style={[styles.row, styles.between, { borderColor: colors.border }]}
                    >
                      <Text style={{ color: colors.text, flex: 1 }} numberOfLines={1}>
                        {u.name}
                      </Text>
                      <Text style={[styles.sub, { color: colors.textSecondary }]}>
                        {u.role} · {u.accountStatus || 'active'}
                      </Text>
                    </Pressable>
                  ))}
                </Card>
                <Card title={t('admin.people.products')}>
                  {d.productsList.map((p) => (
                    <Pressable
                      key={p.id}
                      onPress={() => void Linking.openURL(`${WEB}/admin/products/${p.id}`)}
                      style={[styles.row, styles.between, { borderColor: colors.border }]}
                    >
                      <Text style={{ color: colors.text, flex: 1 }} numberOfLines={1}>
                        {p.name}
                      </Text>
                      <Text style={[styles.sub, { color: colors.textSecondary }]}>
                        {p.category} · {t('admin.people.sold', { n: p.salesCount || 0 })}
                      </Text>
                    </Pressable>
                  ))}
                </Card>
              </>
            ) : null}

            {tab === 'ops'
              ? OPS.map((op) => (
                  <Card key={op.key} title={t(`admin.ops.${op.key}`)} hint={t(`admin.ops.${op.key}.desc`)}>
                    <Button title={t('admin.ops.openWeb')} variant="outline" onPress={() => void Linking.openURL(`${WEB}${op.path}`)} />
                  </Card>
                ))
              : null}

            {tab === 'disputes' ? (
              <Card title={t('admin.tab.disputes')} hint={t('admin.disputes.hint')}>
                {disputes.isLoading ? <ActivityIndicator color={colors.tint} /> : null}
                {(disputes.data || []).map((o) => (
                  <View key={o.id} style={[styles.row, { borderColor: colors.border }]}>
                    <Text style={[styles.strong, { color: colors.text }]}>
                      {o.productName} · {formatMoney(o.amount, o.currency)}
                    </Text>
                    <Text style={[styles.sub, { color: colors.textSecondary }]}>
                      {o.disputeStatus} · {o.disputeReason}
                    </Text>
                    <Text style={[styles.sub, { color: colors.textSecondary }]}>
                      {t('admin.disputes.held', {
                        amount: formatMoney(o.sellerNet || 0, o.currency),
                        date: formatDate(o.disputeOpenedAt, language),
                      })}
                    </Text>
                    {o.disputeStatus === 'open' ? (
                      <View style={styles.actions}>
                        <Button
                          title={t('admin.disputes.keep')}
                          disabled={resolve.isPending}
                          onPress={() => confirmResolve(o, 'seller')}
                          style={{ flex: 1 }}
                        />
                        <Button
                          title={t('admin.disputes.refund')}
                          variant="outline"
                          disabled={resolve.isPending}
                          onPress={() => confirmResolve(o, 'buyer')}
                          style={{ flex: 1 }}
                        />
                      </View>
                    ) : null}
                  </View>
                ))}
                {!disputes.isLoading && !(disputes.data || []).length ? (
                  <Text style={{ color: colors.textSecondary }}>{t('admin.disputes.empty')}</Text>
                ) : null}
              </Card>
            ) : null}
          </>
        )}
      </ScrollView>
    </Screen>
  );
}

function OverviewTab({
  d,
  money,
  series,
  seriesLoading,
  granularity,
  setGranularity,
  barMetric,
  setBarMetric,
}: {
  d: AdminOverview;
  money: (v: number) => string;
  series: AdminDailyPoint[];
  seriesLoading: boolean;
  granularity: AdminGranularity;
  setGranularity: (g: AdminGranularity) => void;
  barMetric: MetricKey;
  setBarMetric: (m: MetricKey) => void;
}) {
  const { colors } = useTheme();
  const { t } = useT();
  const range = t(`admin.range.${granularity}`);
  const unit = t(`admin.unit.${granularity}`);

  const lines: ChartLine[] = [
    { key: 'gross', label: t('admin.metric.gross'), color: colors.text },
    { key: 'sellerNet', label: t('admin.metric.sellerNet'), color: '#0f766e' },
    { key: 'platformFee', label: t('admin.metric.platformFee'), color: colors.tint },
  ];
  const barColor: Record<string, string> = { orders: '#3730a3', deposits: '#0f766e', users: colors.tint };

  const totals = useMemo(() => {
    const out = { gross: 0, platformFee: 0, sellerNet: 0, orders: 0, deposits: 0, users: 0 };
    for (const p of series) for (const k of Object.keys(out) as MetricKey[]) out[k] += p[k];
    return out;
  }, [series]);

  const fmt = (key: MetricKey) => (v: number) => (MONEY_METRICS.has(key) ? money(v) : String(v));

  const label = (date: string, long = false) => {
    const [y, m, dd] = date.split('-');
    if (granularity === 'month') return long ? t('admin.month', { m, y }) : `${m}/${y.slice(2)}`;
    if (granularity === 'week' && long) {
      const end = new Date(`${date}T00:00:00Z`);
      end.setUTCDate(end.getUTCDate() + 6);
      const [ey, em, ed] = end.toISOString().slice(0, 10).split('-');
      return t('admin.week', { start: `${dd}/${m}`, end: `${ed}/${em}/${ey}` });
    }
    return long ? `${dd}/${m}/${y}` : `${dd}/${m}`;
  };

  const gross = Math.max(0, d.totalGrossRevenue || 0);
  const parts = [
    { label: t('admin.metric.platformFee'), value: d.platformFee || 0, color: colors.tint },
    { label: t('admin.metric.sellerNet'), value: d.sellerNet || 0, color: '#0f766e' },
    { label: t('admin.metric.playFee'), value: d.playStoreFees || 0, color: '#16a34a' },
    { label: t('admin.metric.appFee'), value: d.appStoreFees || 0, color: '#2563eb' },
  ];
  const used = parts.reduce((s, p) => s + p.value, 0);
  parts.push({ label: t('admin.metric.rest'), value: Math.max(0, gross - used), color: '#9ca3af' });
  const donutBase = Math.max(gross, used) || 1;
  const feeShare = gross ? ((d.platformFee || 0) / gross) * 100 : 0;

  const kpis = [
    { label: t('admin.metric.gross'), value: money(d.totalGrossRevenue), hint: t('admin.kpi.paidOrders', { n: d.paidOrders }) },
    { label: t('admin.metric.platformFee'), value: money(d.platformFee), hint: t('admin.kpi.feeHint', { rate: Math.round(d.platformFeeRate * 100) }) },
    { label: t('admin.metric.sellerNet'), value: money(d.sellerNet), hint: t('admin.kpi.sellerNetHint') },
    { label: t('admin.kpi.storeFees'), value: money(d.storeFees || 0), hint: t('admin.kpi.storeFeesHint') },
    { label: t('admin.metric.playFee'), value: money(d.playStoreFees || 0) },
    { label: t('admin.metric.appFee'), value: money(d.appStoreFees || 0) },
    { label: t('admin.metric.deposits'), value: money(d.buyerDeposits), hint: t('admin.kpi.depositCount', { n: d.buyerDepositCount }) },
    { label: t('admin.kpi.users'), value: String(d.users) },
    { label: t('admin.kpi.creators'), value: String(d.creators) },
    { label: t('admin.kpi.products'), value: String(d.products) },
    { label: t('admin.kpi.orders'), value: String(d.orders) },
  ];

  const rows = series
    .map((p, i) => ({ p, change: i > 0 && series[i - 1].gross ? ((p.gross - series[i - 1].gross) / series[i - 1].gross) * 100 : null }))
    .reverse();

  return (
    <>
      <View style={styles.kpis}>
        {kpis.map((k) => (
          <View key={k.label} style={[styles.kpi, { backgroundColor: colors.cardBackground, borderColor: colors.border }]}>
            <Text style={[styles.kpiLabel, { color: colors.textSecondary }]} numberOfLines={1}>
              {k.label}
            </Text>
            <Text style={[styles.kpiValue, { color: colors.text }]} numberOfLines={1} adjustsFontSizeToFit>
              {k.value}
            </Text>
            {k.hint ? (
              <Text style={[styles.sub, { color: colors.textSecondary }]} numberOfLines={2}>
                {k.hint}
              </Text>
            ) : null}
          </View>
        ))}
      </View>

      {d.series?.length ? (
        <>
          <View style={styles.periodBar}>
            <Text style={{ color: colors.textSecondary }}>{t('admin.period.by')}</Text>
            {GRANULARITIES.map((g) => (
              <Chip key={g} label={t(`admin.period.${g}`)} active={granularity === g} onPress={() => setGranularity(g)} />
            ))}
            {seriesLoading ? <ActivityIndicator color={colors.tint} /> : null}
          </View>

          <Card title={t('admin.chart.revenue', { range })} hint={t('admin.chart.revenueHint', { unit })}>
            <View style={styles.legend}>
              {lines.map((l) => (
                <Text key={l.key} style={[styles.sub, { color: colors.textSecondary }]}>
                  <Text style={{ color: l.color }}>● </Text>
                  {l.label} · {money(totals[l.key])}
                </Text>
              ))}
            </View>
            <RevenueChart series={series} lines={lines} label={label} format={money} />
          </Card>

          <Card title={t('admin.chart.activity', { range })} hint={t('admin.chart.total', { value: fmt(barMetric)(totals[barMetric]) })}>
            <View style={styles.legend}>
              {BAR_METRICS.map((m) => (
                <Chip key={m} label={t(`admin.metric.${m}`)} active={barMetric === m} onPress={() => setBarMetric(m)} />
              ))}
            </View>
            <BarChart series={series} metric={barMetric} color={barColor[barMetric]} label={label} format={fmt(barMetric)} />
          </Card>
        </>
      ) : null}

      <Card title={t('admin.chart.gmvMix')} hint={t('admin.chart.gmvMixHint', { value: money(d.totalGrossRevenue) })}>
        <Donut parts={parts} total={gross} center={`${feeShare.toFixed(1)}%`} caption={t('admin.chart.feeShare')} />
        {parts
          .filter((p) => p.value > 0)
          .map((p) => (
            <View key={p.label} style={[styles.between, { marginTop: 6 }]}>
              <Text style={{ color: colors.text, flex: 1 }} numberOfLines={1}>
                <Text style={{ color: p.color }}>● </Text>
                {p.label}
              </Text>
              <Text style={[styles.sub, { color: colors.textSecondary }]}>
                {money(p.value)} · {((p.value / donutBase) * 100).toFixed(1)}%
              </Text>
            </View>
          ))}
      </Card>

      {series.length ? (
        <Card title={t('admin.table.title', { unit })} hint={t('admin.table.hint', { unit })}>
          {rows.map(({ p, change }) => (
            <View key={p.date} style={[styles.row, { borderColor: colors.border }]}>
              <View style={styles.between}>
                <Text style={[styles.strong, { color: colors.text }]}>{label(p.date, true)}</Text>
                <Text style={[styles.strong, { color: colors.text }]}>
                  {money(p.gross)}
                  {change !== null ? (
                    <Text style={{ fontSize: 11, color: change > 0 ? colors.success : change < 0 ? colors.danger : colors.textSecondary }}>
                      {'  '}
                      {change > 0 ? '+' : ''}
                      {change.toFixed(0)}%
                    </Text>
                  ) : null}
                </Text>
              </View>
              <Text style={[styles.sub, { color: colors.textSecondary }]}>
                {t('admin.table.orders')} {p.orders} · {t('admin.metric.platformFee')} {money(p.platformFee)} ·{' '}
                {t('admin.metric.sellerNet')} {money(p.sellerNet)} · {t('admin.metric.deposits')} {money(p.deposits)} ·{' '}
                {t('admin.metric.users')} {p.users}
              </Text>
            </View>
          ))}
          <View style={[styles.row, { borderColor: colors.border, borderBottomWidth: 0 }]}>
            <View style={styles.between}>
              <Text style={[styles.strong, { color: colors.text }]}>{t('admin.table.total', { range })}</Text>
              <Text style={[styles.strong, { color: colors.text }]}>{money(totals.gross)}</Text>
            </View>
            <Text style={[styles.sub, { color: colors.textSecondary }]}>
              {t('admin.table.orders')} {totals.orders} · {t('admin.metric.platformFee')} {money(totals.platformFee)} ·{' '}
              {t('admin.metric.sellerNet')} {money(totals.sellerNet)} · {t('admin.metric.deposits')} {money(totals.deposits)} ·{' '}
              {t('admin.metric.users')} {totals.users}
            </Text>
          </View>
        </Card>
      ) : null}
    </>
  );
}

function Card({ title, hint, children }: { title: string; hint?: string; children: React.ReactNode }) {
  const { colors } = useTheme();
  return (
    <View style={[styles.card, { backgroundColor: colors.cardBackground, borderColor: colors.border }]}>
      <Text style={[styles.cardTitle, { color: colors.text }]}>{title}</Text>
      {hint ? <Text style={[styles.sub, { color: colors.textSecondary, marginBottom: 8 }]}>{hint}</Text> : null}
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  lede: { fontSize: 14, lineHeight: 20, marginTop: 4, marginBottom: 10 },
  tabs: { gap: 8, paddingBottom: 12 },
  kpis: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', rowGap: 10 },
  kpi: { width: '48.5%', borderWidth: 1, borderRadius: 14, padding: 12 },
  kpiLabel: { fontSize: 11, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.4 },
  kpiValue: { fontSize: 22, fontWeight: '800', marginTop: 4 },
  periodBar: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 8, marginTop: 16 },
  legend: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 8 },
  card: { borderWidth: 1, borderRadius: 16, padding: 14, marginTop: 14 },
  cardTitle: { fontSize: 17, fontWeight: '800', marginBottom: 2 },
  row: { borderBottomWidth: 1, paddingVertical: 10, gap: 3 },
  between: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  strong: { fontWeight: '700', fontSize: 14 },
  sub: { fontSize: 12, lineHeight: 17 },
  actions: { flexDirection: 'row', gap: 8, marginTop: 8 },
});
