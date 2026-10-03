import React, { useMemo, useState } from 'react';
import { ActivityIndicator, Alert, Linking, Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { WebView } from 'react-native-webview';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { builderApi, chatApi, hireApi, walletApi } from '@/api';
import type { HireMilestone, HireProject, HireTerminateReason } from '@/api/types';
import { href } from '@/lib/href';
import { useAuth } from '@/hooks/useAuth';
import { useTheme, useT } from '@/hooks/useT';
import { Screen } from '@/components/ui/Screen';
import { Button } from '@/components/ui/Button';
import { Chip } from '@/components/ui/Chip';
import { Input } from '@/components/ui/Input';
import { LoginPrompt } from '@/components/ui/LoginPrompt';
import { formatDate, formatMoney } from '@/utils/format';
import { ApiError, getErrorMessage } from '@/lib/errors';
import { categoryLabel } from '@/constants/categories';
import { hireStatusColor, rowsTotal, splitMilestones, toDrafts, type MilestoneRow } from '@/lib/hire';

const TERMINATE_REASONS: HireTerminateReason[] = ['not_as_requested', 'late', 'other'];

function confirmAsync(message: string, okLabel: string, cancelLabel: string, destructive = false): Promise<boolean> {
  return new Promise((resolve) => {
    Alert.alert('', message, [
      { text: cancelLabel, style: 'cancel', onPress: () => resolve(false) },
      { text: okLabel, style: destructive ? 'destructive' : 'default', onPress: () => resolve(true) },
    ]);
  });
}

export default function HireProjectScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const qc = useQueryClient();
  const { colors } = useTheme();
  const { t, language } = useT();
  const { isAuthenticated } = useAuth();

  const q = useQuery({
    queryKey: ['hire', 'one', id],
    queryFn: () => hireApi.one(String(id)),
    enabled: isAuthenticated && !!id,
  });
  const p = q.data;
  const role = p?.role || null;
  const current = useMemo<HireMilestone | null>(
    () => p?.milestones.find((m) => m.id === p.currentMilestoneId) || null,
    [p],
  );

  const wallet = useQuery({
    queryKey: ['wallet-summary'],
    queryFn: () => walletApi.summary(),
    enabled: role === 'buyer' && (p?.status === 'quoted' || p?.status === 'active'),
  });
  const builderProjects = useQuery({
    queryKey: ['builder', 'projects'],
    queryFn: builderApi.list,
    enabled: role === 'seller' && p?.status === 'active' && !!p?.demoKind,
  });
  const demoProjects = useMemo(
    () => (builderProjects.data?.projects || []).filter((b) => b.kind === p?.demoKind),
    [builderProjects.data, p?.demoKind],
  );

  const [busy, setBusy] = useState(false);
  const [actionError, setActionError] = useState('');
  const [walletShort, setWalletShort] = useState(false);
  const [quoteAmount, setQuoteAmount] = useState('');
  const [quoteNote, setQuoteNote] = useState('');
  const [declineNote, setDeclineNote] = useState('');
  const [counterAmount, setCounterAmount] = useState('');
  const [counterNote, setCounterNote] = useState('');
  const [rows, setRows] = useState<MilestoneRow[]>([]);
  const [demoBuilderId, setDemoBuilderId] = useState('');
  const [demoUrl, setDemoUrl] = useState('');
  const [demoNote, setDemoNote] = useState('');
  const [showRevision, setShowRevision] = useState(false);
  const [revisionNote, setRevisionNote] = useState('');
  const [showTerminate, setShowTerminate] = useState(false);
  const [terminateReason, setTerminateReason] = useState<HireTerminateReason>('not_as_requested');
  const [terminateNote, setTerminateNote] = useState('');

  const defaultTitle = (n: number) => t('hire.ms.defaultTitle', { n });
  const resetRows = (count: number) => {
    if (!p) return;
    setRows(splitMilestones(p.quote.amount || 0, count, p.desiredDeadline, defaultTitle));
  };

  const syncKey = p ? `${p.id}:${p.status}:${p.quote.amount}:${p.quote.at}` : '';
  const [syncedKey, setSyncedKey] = useState('');
  if (p && syncKey !== syncedKey) {
    setSyncedKey(syncKey);
    setQuoteAmount(String(p.quote.amount || p.budget || p.listPrice || ''));
    setCounterAmount(p.quote.amount ? String(p.quote.amount) : '');
    if (p.role === 'buyer' && p.status === 'quoted') {
      setRows(splitMilestones(p.quote.amount || 0, 3, p.desiredDeadline, defaultTitle));
    }
  }
  const pickedBuilderId = demoBuilderId || demoProjects[0]?.id || '';

  if (!isAuthenticated) {
    return (
      <Screen>
        <Stack.Screen options={{ title: t('hire.list.title') }} />
        <LoginPrompt />
      </Screen>
    );
  }

  if (!p) {
    return (
      <Screen>
        <Stack.Screen options={{ title: t('hire.list.title') }} />
        <View style={styles.center}>
          {q.isError ? (
            <Text style={{ color: colors.danger }}>{getErrorMessage(q.error, language)}</Text>
          ) : (
            <ActivityIndicator color={colors.tint} />
          )}
        </View>
      </Screen>
    );
  }

  const cur = p.currency;
  const money = (n: number) => formatMoney(n, cur);
  const total = p.quote.amount || 0;
  const sum = rowsTotal(rows);
  const rowsMatch = Math.abs(sum - total) < 0.01;
  const drafts = toDrafts(rows);

  const run = async (call: () => Promise<HireProject>, after?: () => void) => {
    if (busy) return;
    setBusy(true);
    setActionError('');
    setWalletShort(false);
    try {
      const next = await call();
      qc.setQueryData(['hire', 'one', id], next);
      void qc.invalidateQueries({ queryKey: ['hire', 'list'] });
      after?.();
    } catch (err) {
      if (err instanceof ApiError && (err.code === 'INSUFFICIENT_WALLET' || err.code === 'PAYOUT_HELD')) {
        const amount = err.details?.amount;
        setActionError(t('hire.err.wallet', { amount: typeof amount === 'number' ? money(amount) : String(amount ?? '') }));
        setWalletShort(true);
      } else {
        setActionError(getErrorMessage(err, language) || t('hire.err.generic'));
      }
    } finally {
      setBusy(false);
    }
  };

  const ask = (key: string, params?: Record<string, string | number>, destructive = false) =>
    confirmAsync(t(key, params), 'OK', t('common.cancel'), destructive);

  const sendQuote = () => {
    const amount = Number(quoteAmount);
    if (!(amount > 0)) return;
    void run(() => hireApi.quote(p.id, amount, quoteNote.trim()), () => setQuoteNote(''));
  };
  const decline = async () => {
    if (!(await ask('hire.confirm.decline', undefined, true))) return;
    void run(() => hireApi.decline(p.id, declineNote.trim()));
  };
  const sendCounter = () => {
    const amount = Number(counterAmount);
    if (!(amount > 0)) return;
    void run(() => hireApi.counter(p.id, amount, counterNote.trim()), () => setCounterNote(''));
  };
  const cancel = async () => {
    if (!(await ask('hire.confirm.cancel', undefined, true))) return;
    void run(() => hireApi.cancel(p.id));
  };
  const accept = () => {
    if (!rowsMatch || !drafts) return;
    void run(() => hireApi.accept(p.id, drafts));
  };
  const submitDemo = () => {
    void run(
      () =>
        hireApi.submit(p.id, {
          builderProjectId: p.demoKind ? pickedBuilderId || undefined : undefined,
          demoUrl: demoUrl.trim() || undefined,
          note: demoNote.trim(),
        }),
      () => {
        setDemoUrl('');
        setDemoNote('');
      },
    );
  };
  const approve = async () => {
    if (!current) return;
    if (!(await ask('hire.confirm.approve', { phase: current.index + 1, amount: money(current.amount) }))) return;
    void run(() => hireApi.approve(p.id), () => void qc.invalidateQueries({ queryKey: ['wallet-summary'] }));
  };
  const requestRevision = () => {
    if (revisionNote.trim().length < 8) return;
    void run(() => hireApi.revision(p.id, revisionNote.trim()), () => {
      setRevisionNote('');
      setShowRevision(false);
    });
  };
  const terminate = async () => {
    if (terminateNote.trim().length < 8) return;
    if (!(await ask('hire.confirm.terminate', undefined, true))) return;
    void run(() => hireApi.terminate(p.id, terminateReason, terminateNote.trim()), () => setShowTerminate(false));
  };
  const openChat = async () => {
    try {
      const c = await chatApi.start({ productId: p.productId });
      router.push(href(`/chat/${c.id}`));
    } catch (err) {
      setActionError(getErrorMessage(err, language));
    }
  };

  const withPreview = p.milestones.filter((m) => m.previewUrl);
  const previewSource = current?.previewUrl ? current : withPreview[withPreview.length - 1];
  const otherName = role === 'seller' ? `${t('hire.list.client')}: ${p.buyerName}` : `${t('hire.list.provider')}: ${p.sellerName}`;
  const negotiating = p.status === 'requested' || p.status === 'quoted';

  const card = [styles.card, { backgroundColor: colors.cardBackground, borderColor: colors.border }];
  const h = [styles.h, { color: colors.text }];
  const muted = { color: colors.textSecondary, lineHeight: 20 };

  return (
    <Screen>
      <Stack.Screen options={{ title: p.productName }} />
      <ScrollView
        contentContainerStyle={{ paddingBottom: 48 }}
        keyboardShouldPersistTaps="handled"
        refreshControl={<RefreshControl refreshing={q.isRefetching} onRefresh={() => q.refetch()} tintColor={colors.tint} />}
      >
        <View style={card}>
          <View style={styles.row}>
            <Text style={[styles.cat, { color: colors.tint }]} numberOfLines={1}>
              {categoryLabel(p.category, t, p.category)}
            </Text>
            <Text style={[styles.status, { color: hireStatusColor(p.status, colors) }]}>{t(`hire.status.${p.status}`)}</Text>
          </View>
          <Pressable onPress={() => p.productSlug && router.push(href(`/product/${p.productSlug}`))}>
            <Text style={[styles.title, { color: colors.text }]}>{p.productName}</Text>
          </Pressable>
          <Text style={muted}>
            {role ? t(`hire.role.${role}`) : ''} · {otherName}
          </Text>
          {p.milestones.length ? (
            <Text style={{ color: colors.text, fontWeight: '700', marginTop: 8 }}>
              {t('hire.ms.paid', { paid: money(p.paidTotal), total: money(total) })}
            </Text>
          ) : null}
          {role === 'buyer' ? (
            <View style={{ flexDirection: 'row', gap: 8, marginTop: 12 }}>
              <Button title={t('hire.chat')} variant="outline" onPress={() => void openChat()} style={{ flex: 1 }} />
            </View>
          ) : null}
        </View>

        {actionError ? (
          <View style={[card, { borderColor: colors.danger }]}>
            <Text style={{ color: colors.danger, lineHeight: 20 }}>{actionError}</Text>
            {walletShort ? (
              <Button title={t('hire.topup')} variant="outline" onPress={() => router.push('/wallet')} style={{ marginTop: 10 }} />
            ) : null}
          </View>
        ) : null}

        <View style={card}>
          <Text style={h}>{t('hire.req.brief')}</Text>
          <Text style={{ color: colors.text, lineHeight: 21 }}>{p.brief}</Text>
          <Text style={[muted, { marginTop: 8, fontSize: 13 }]}>
            {t('hire.req.budget')}: {p.budget ? money(p.budget) : '—'} · {t('hire.req.deadline')}:{' '}
            {p.desiredDeadline ? formatDate(p.desiredDeadline, language) : '—'}
          </Text>
          <Text style={[muted, { fontSize: 13 }]}>
            {t('hire.req.listPrice')}: {money(p.listPrice)}
          </Text>
        </View>

        {negotiating ? (
          <View style={card}>
            <Text style={h}>{t('hire.quote.title')}</Text>
            {p.quote.amount ? (
              <>
                <Text style={muted}>{t(p.quote.by === 'buyer' ? 'hire.quote.byBuyer' : 'hire.quote.bySeller')}</Text>
                <Text style={{ color: colors.text, fontSize: 22, fontWeight: '800', marginTop: 2 }}>{money(p.quote.amount)}</Text>
                {p.quote.note ? <Text style={[muted, { marginTop: 4 }]}>{p.quote.note}</Text> : null}
              </>
            ) : (
              <Text style={muted}>{t(role === 'buyer' ? 'hire.quote.waiting' : 'hire.quote.none')}</Text>
            )}

            {role === 'seller' ? (
              <View style={{ marginTop: 14 }}>
                <Input
                  label={t('hire.quote.amount')}
                  value={quoteAmount}
                  onChangeText={setQuoteAmount}
                  keyboardType="decimal-pad"
                />
                <Input
                  label={t('hire.quote.note')}
                  placeholder={t('hire.quote.notePh')}
                  value={quoteNote}
                  onChangeText={setQuoteNote}
                  multiline
                  maxLength={2000}
                />
                <Button
                  title={t(p.quote.amount ? 'hire.quote.requote' : 'hire.quote.send')}
                  loading={busy}
                  disabled={!(Number(quoteAmount) > 0)}
                  onPress={sendQuote}
                />
                <Input
                  placeholder={t('hire.quote.notePh')}
                  value={declineNote}
                  onChangeText={setDeclineNote}
                  style={{ marginTop: 14 }}
                  maxLength={300}
                />
                <Button title={t('hire.quote.decline')} variant="outline" disabled={busy} onPress={() => void decline()} />
              </View>
            ) : null}

            {role === 'buyer' && p.status === 'quoted' ? (
              <View style={{ marginTop: 16 }}>
                <Text style={h}>{t('hire.accept.title')}</Text>
                <Text style={[muted, { marginBottom: 10 }]}>{t('hire.accept.lead')}</Text>
                {rows.map((r, i) => (
                  <View key={i} style={[styles.msRow, { borderColor: colors.border }]}>
                    <Input
                      label={`${t('hire.ms.title')} ${i + 1}`}
                      placeholder={t('hire.ms.title.ph')}
                      value={r.title}
                      onChangeText={(v) => setRows((list) => list.map((x, j) => (j === i ? { ...x, title: v } : x)))}
                      maxLength={200}
                    />
                    <View style={{ flexDirection: 'row', gap: 8 }}>
                      <View style={{ flex: 1 }}>
                        <Input
                          label={t('hire.ms.amount')}
                          value={r.amount}
                          onChangeText={(v) => setRows((list) => list.map((x, j) => (j === i ? { ...x, amount: v } : x)))}
                          keyboardType="decimal-pad"
                        />
                      </View>
                      <View style={{ flex: 1 }}>
                        <Input
                          label={t('hire.ms.dueAt')}
                          value={r.due}
                          onChangeText={(v) => setRows((list) => list.map((x, j) => (j === i ? { ...x, due: v } : x)))}
                          autoCapitalize="none"
                          maxLength={10}
                        />
                      </View>
                    </View>
                  </View>
                ))}
                <View style={{ flexDirection: 'row', gap: 8, marginBottom: 10 }}>
                  <Button
                    title={t('hire.accept.removePhase')}
                    variant="outline"
                    disabled={rows.length <= 1}
                    onPress={() => resetRows(rows.length - 1)}
                    style={{ flex: 1 }}
                  />
                  <Button
                    title={t('hire.accept.addPhase')}
                    variant="outline"
                    disabled={rows.length >= 10}
                    onPress={() => resetRows(rows.length + 1)}
                    style={{ flex: 1 }}
                  />
                </View>
                <Text style={{ color: rowsMatch ? colors.success : colors.danger, fontWeight: '700' }}>
                  {t('hire.accept.sum', { sum: money(sum), total: money(total) })}
                </Text>
                {wallet.data ? (
                  <Text style={[muted, { marginTop: 4 }]}>{t('hire.accept.wallet', { amount: money(wallet.data.available) })}</Text>
                ) : null}
                <Button
                  title={t('hire.accept.submit')}
                  loading={busy}
                  disabled={!rowsMatch || !drafts}
                  onPress={accept}
                  style={{ marginTop: 12 }}
                />

                <Text style={[h, { marginTop: 20 }]}>{t('hire.counter.title')}</Text>
                <Input value={counterAmount} onChangeText={setCounterAmount} keyboardType="decimal-pad" label={t('hire.quote.amount')} />
                <Input
                  label={t('hire.quote.note')}
                  placeholder={t('hire.quote.notePh')}
                  value={counterNote}
                  onChangeText={setCounterNote}
                  multiline
                  maxLength={2000}
                />
                <Button
                  title={t('hire.counter.send')}
                  variant="outline"
                  disabled={busy || !(Number(counterAmount) > 0)}
                  onPress={sendCounter}
                />
              </View>
            ) : null}

            {role === 'buyer' ? (
              <Button title={t('hire.quote.cancel')} variant="outline" disabled={busy} onPress={() => void cancel()} style={{ marginTop: 12 }} />
            ) : null}
          </View>
        ) : null}

        {p.milestones.length ? (
          <View style={card}>
            <Text style={h}>{t('hire.ms.title')}</Text>
            <Text style={[muted, { fontSize: 12, marginBottom: 8 }]}>{t('hire.ms.holdNote')}</Text>
            {p.milestones.map((m) => (
              <View key={m.id} style={[styles.msItem, { borderColor: colors.border }]}>
                <View style={styles.row}>
                  <Text style={{ color: colors.text, fontWeight: '700', flex: 1 }} numberOfLines={2}>
                    {m.index + 1}. {m.title}
                  </Text>
                  <Text style={{ color: colors.text, fontWeight: '800' }}>{money(m.amount)}</Text>
                </View>
                <Text style={{ color: m.status === 'approved' ? colors.success : m.status === 'cancelled' ? colors.danger : colors.tint, fontSize: 12, fontWeight: '800', marginTop: 4 }}>
                  {t(`hire.ms.status.${m.status}`)}
                  {m.overdue ? ` · ${t('hire.ms.overdue')}` : ''}
                </Text>
                <Text style={[muted, { fontSize: 12 }]}>
                  {t('hire.ms.due')} {formatDate(m.dueAt, language)}
                  {m.approvedAt ? ` · ${t('hire.ms.approvedAt')} ${formatDate(m.approvedAt, language)}` : ''}
                  {m.revisionCount ? ` · ${t('hire.ms.revisions', { n: m.revisionCount })}` : ''}
                </Text>
                {m.revisionNote && m.status !== 'approved' ? (
                  <Text style={{ color: colors.danger, fontSize: 13, marginTop: 4 }}>
                    {t('hire.ms.revisionAsked')}: {m.revisionNote}
                  </Text>
                ) : null}
                {m.demoNote ? <Text style={[muted, { fontSize: 13, marginTop: 4 }]}>{m.demoNote}</Text> : null}
                {m.demoUrl ? (
                  <Pressable onPress={() => void Linking.openURL(m.demoUrl)}>
                    <Text style={{ color: colors.tint, marginTop: 4 }} numberOfLines={1}>
                      {m.demoUrl}
                    </Text>
                  </Pressable>
                ) : null}
              </View>
            ))}
          </View>
        ) : null}

        {previewSource?.previewUrl ? (
          <View style={card}>
            <View style={styles.row}>
              <Text style={h}>{t('hire.demo.live')}</Text>
              <Pressable onPress={() => void Linking.openURL(previewSource.previewUrl)} hitSlop={8}>
                <Text style={{ color: colors.tint, fontWeight: '700' }}>{t('hire.demo.openTab')}</Text>
              </Pressable>
            </View>
            <View style={[styles.preview, { borderColor: colors.border }]}>
              <WebView
                source={{ uri: previewSource.previewUrl }}
                originWhitelist={['*']}
                javaScriptEnabled
                domStorageEnabled
                setSupportMultipleWindows={false}
                nestedScrollEnabled
                style={{ flex: 1 }}
              />
            </View>
          </View>
        ) : null}

        {p.status === 'active' && role === 'seller' && current ? (
          <View style={card}>
            {current.status === 'in_progress' ? (
              <>
                <Text style={h}>{t('hire.demo.title', { n: current.index + 1 })}</Text>
                {p.demoKind ? (
                  <>
                    <Text style={[muted, { marginBottom: 8 }]}>{t('hire.demo.builderLead')}</Text>
                    {demoProjects.length ? (
                      <View style={styles.chips}>
                        {demoProjects.map((b) => (
                          <Chip key={b.id} label={b.name} active={pickedBuilderId === b.id} onPress={() => setDemoBuilderId(b.id)} />
                        ))}
                      </View>
                    ) : builderProjects.isLoading ? (
                      <ActivityIndicator color={colors.tint} />
                    ) : (
                      <Text style={[muted, { marginBottom: 8 }]}>{t('hire.demo.noBuilder')} AI App Builder.</Text>
                    )}
                    <Button
                      title={t('hire.demo.openBuilder')}
                      variant="outline"
                      onPress={() => router.push(href('/builder'))}
                      style={{ marginBottom: 12 }}
                    />
                  </>
                ) : (
                  <Input
                    label={t('hire.demo.url')}
                    placeholder="https://"
                    value={demoUrl}
                    onChangeText={setDemoUrl}
                    autoCapitalize="none"
                    keyboardType="url"
                  />
                )}
                <Input
                  label={t('hire.demo.note')}
                  placeholder={t('hire.demo.notePh')}
                  value={demoNote}
                  onChangeText={setDemoNote}
                  multiline
                  numberOfLines={4}
                  textAlignVertical="top"
                  style={{ minHeight: 96 }}
                  maxLength={4000}
                />
                <Button
                  title={t('hire.demo.submit')}
                  loading={busy}
                  disabled={p.demoKind ? !pickedBuilderId : !demoUrl.trim()}
                  onPress={submitDemo}
                />
              </>
            ) : (
              <Text style={muted}>{t('hire.demo.waitingBuyer')}</Text>
            )}
          </View>
        ) : null}

        {p.status === 'active' && role === 'buyer' && current ? (
          <View style={card}>
            {current.status === 'submitted' ? (
              <>
                <Text style={h}>{t('hire.review.title', { n: current.index + 1 })}</Text>
                <Text style={[muted, { marginBottom: 12 }]}>
                  {t('hire.review.lead', { amount: current.amount, currency: cur })}
                </Text>
                <Button
                  title={t('hire.review.approve', { amount: current.amount, currency: cur })}
                  loading={busy}
                  onPress={() => void approve()}
                />
                <Button
                  title={t('hire.review.revision')}
                  variant="outline"
                  onPress={() => setShowRevision((v) => !v)}
                  style={{ marginTop: 8 }}
                />
                {showRevision ? (
                  <View style={{ marginTop: 10 }}>
                    <Input
                      placeholder={t('hire.review.revisionPh')}
                      value={revisionNote}
                      onChangeText={setRevisionNote}
                      multiline
                      numberOfLines={3}
                      textAlignVertical="top"
                      style={{ minHeight: 80 }}
                      maxLength={2000}
                    />
                    <Button
                      title={t('hire.review.sendRevision')}
                      variant="outline"
                      disabled={busy || revisionNote.trim().length < 8}
                      onPress={requestRevision}
                    />
                  </View>
                ) : null}
              </>
            ) : (
              <Text style={muted}>{t('hire.demo.waitingSeller', { n: current.index + 1 })}</Text>
            )}
          </View>
        ) : null}

        {p.status === 'active' && role === 'buyer' ? (
          <View style={card}>
            <Pressable onPress={() => setShowTerminate((v) => !v)}>
              <Text style={{ color: colors.danger, fontWeight: '700' }}>{t('hire.term.open')}</Text>
            </Pressable>
            {showTerminate ? (
              <View style={{ marginTop: 10 }}>
                <Text style={[muted, { marginBottom: 10 }]}>{t('hire.term.lead')}</Text>
                <View style={styles.chips}>
                  {TERMINATE_REASONS.map((r) => {
                    const disabled = r === 'late' && !current?.overdue;
                    return (
                      <Chip
                        key={r}
                        label={t(`hire.term.reason.${r}`)}
                        active={terminateReason === r}
                        onPress={() => !disabled && setTerminateReason(r)}
                      />
                    );
                  })}
                </View>
                <Input
                  placeholder={t('hire.term.notePh')}
                  value={terminateNote}
                  onChangeText={setTerminateNote}
                  multiline
                  numberOfLines={3}
                  textAlignVertical="top"
                  style={{ minHeight: 80 }}
                  maxLength={2000}
                />
                <Button
                  title={t('hire.term.submit')}
                  variant="danger"
                  disabled={busy || terminateNote.trim().length < 8}
                  onPress={() => void terminate()}
                />
              </View>
            ) : null}
          </View>
        ) : null}

        {p.status === 'terminated' ? (
          <View style={card}>
            <Text style={h}>{t('hire.status.terminated')}</Text>
            {p.terminationReason ? <Text style={muted}>{t(`hire.term.reason.${p.terminationReason}`)}</Text> : null}
            {p.terminationNote ? <Text style={[muted, { marginTop: 4 }]}>{p.terminationNote}</Text> : null}
            {p.complaintId ? (
              <Button
                title={t('hire.term.complaint')}
                variant="outline"
                onPress={() => router.push(href(`/complaint/${p.complaintId}`))}
                style={{ marginTop: 10 }}
              />
            ) : (
              <Text style={[muted, { marginTop: 6 }]}>{t('hire.term.noCharge')}</Text>
            )}
          </View>
        ) : null}

        {p.status === 'completed' ? (
          <View style={card}>
            <Text style={{ color: colors.success, fontWeight: '700' }}>{t('hire.done.lead')}</Text>
          </View>
        ) : null}

        {p.events.length ? (
          <View style={card}>
            <Text style={h}>{t('hire.timeline')}</Text>
            {[...p.events].reverse().map((e, i) => (
              <View key={`${e.at}-${i}`} style={{ marginBottom: 8 }}>
                <Text style={{ color: colors.text, fontWeight: '600' }}>
                  {t(`hire.event.${e.action}`)} · {e.actor}
                </Text>
                <Text style={{ color: colors.textSecondary, fontSize: 12 }}>{formatDate(e.at, language)}</Text>
                {e.note ? <Text style={[muted, { fontSize: 13 }]}>{e.note}</Text> : null}
              </View>
            ))}
          </View>
        ) : null}

        <Text style={[muted, { fontSize: 12, marginTop: 4 }]}>{t('hire.escrowFooter')}</Text>
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  card: { borderWidth: 1, borderRadius: 16, padding: 14, marginTop: 12 },
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  cat: { fontSize: 11, fontWeight: '800', textTransform: 'uppercase', letterSpacing: 0.5, flexShrink: 1 },
  status: { fontSize: 11, fontWeight: '800', textTransform: 'uppercase' },
  title: { fontSize: 20, fontWeight: '700', marginTop: 6, marginBottom: 4 },
  h: { fontSize: 16, fontWeight: '800', marginBottom: 8 },
  msRow: { borderWidth: 1, borderRadius: 12, padding: 10, marginBottom: 10 },
  msItem: { borderTopWidth: 1, paddingVertical: 10 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 12 },
  preview: { height: 520, borderWidth: 1, borderRadius: 12, overflow: 'hidden', marginTop: 8 },
});
