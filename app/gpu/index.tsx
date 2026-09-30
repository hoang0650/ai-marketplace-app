import React, { useState } from 'react';
import { Alert, Pressable, RefreshControl, ScrollView, Text, TextInput, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { gpuRentalApi } from '@/api';
import type { GpuOffer, GpuRental } from '@/api/types';
import { ApiError, getErrorMessage } from '@/lib/errors';
import { href } from '@/lib/href';
import { useAuth } from '@/hooks/useAuth';
import { useTheme, useT } from '@/hooks/useT';
import { Screen } from '@/components/ui/Screen';
import { LoginPrompt } from '@/components/ui/LoginPrompt';
import { Button } from '@/components/ui/Button';
import { displayFont } from '@/constants/fonts';
import { formatDate, formatMoney } from '@/utils/format';

const GOLD = '#c9a961';

function isBooting(r: GpuRental) {
  return r.status === 'creating' || (r.status === 'running' && !r.ready);
}

export default function GpuRentScreen() {
  const router = useRouter();
  const qc = useQueryClient();
  const { isAuthenticated } = useAuth();
  const { colors } = useTheme();
  const { t, language } = useT();
  const [selected, setSelected] = useState<GpuOffer | null>(null);
  const [name, setName] = useState('');
  const [error, setError] = useState('');

  const offers = useQuery({ queryKey: ['gpu-offers'], queryFn: gpuRentalApi.offers, enabled: isAuthenticated });
  const rentals = useQuery({
    queryKey: ['gpu-rentals'],
    queryFn: async () => {
      const res = await gpuRentalApi.list();
      // Pull live status for machines still booting.
      const rows = await Promise.all(
        (res.rentals || []).map((r) => (isBooting(r) ? gpuRentalApi.one(r.id).then((x) => x.rental).catch(() => r) : r)),
      );
      return rows;
    },
    enabled: isAuthenticated,
    refetchInterval: (q) => ((q.state.data || []).some(isBooting) ? 8000 : false),
  });

  const fail = (e: unknown) => {
    const code = e instanceof ApiError ? e.code : '';
    const key = `gpu.err.${code}`;
    const msg = code ? t(key) : '';
    setError(msg && msg !== key ? msg : getErrorMessage(e, language));
  };

  const refreshAll = () => {
    void qc.invalidateQueries({ queryKey: ['gpu-rentals'] });
    void qc.invalidateQueries({ queryKey: ['gpu-offers'] });
  };

  const create = useMutation({
    mutationFn: (o: GpuOffer) =>
      gpuRentalApi.create({ offerId: o.id, name: name.trim() || undefined, volumeGb: offers.data?.limits.volumeGb.default }),
    onSuccess: () => {
      setSelected(null);
      setName('');
      setError('');
      refreshAll();
    },
    onError: fail,
  });

  const action = useMutation({
    mutationFn: ({ id, kind }: { id: string; kind: 'start' | 'stop' | 'remove' }) => gpuRentalApi[kind](id),
    onSuccess: () => {
      setError('');
      refreshAll();
    },
    onError: fail,
  });

  if (!isAuthenticated) return <LoginPrompt />;

  const limits = offers.data?.limits;
  const available = offers.data?.wallet.available ?? 0;
  const prepayHours = limits?.minPrepayHours ?? 1;
  const canAfford = selected ? available + 1e-9 >= selected.pricePerHour * prepayHours : false;

  const confirmStop = (r: GpuRental) =>
    Alert.alert(t('gpu.rent.stop'), t('gpu.rent.confirmStop'), [
      { text: t('common.cancel'), style: 'cancel' },
      { text: t('gpu.rent.stop'), onPress: () => action.mutate({ id: r.id, kind: 'stop' }) },
    ]);
  const confirmDelete = (r: GpuRental) =>
    Alert.alert(t('gpu.rent.delete'), t('gpu.rent.confirmDelete', { name: r.name }), [
      { text: t('common.cancel'), style: 'cancel' },
      { text: t('gpu.rent.delete'), style: 'destructive', onPress: () => action.mutate({ id: r.id, kind: 'remove' }) },
    ]);
  const openWorkspace = (r: GpuRental, target: 'lab' | 'terminal') =>
    router.push(href(`/gpu/workspace?id=${encodeURIComponent(r.id)}&target=${target}`));

  const statusLabel = (r: GpuRental) =>
    r.status === 'running' && !r.ready ? t('gpu.rent.status.booting') : t(`gpu.rent.status.${r.status}`);
  const statusColor = (r: GpuRental) =>
    r.status === 'running' && r.ready ? '#34d399' : isBooting(r) ? '#38bdf8' : r.status === 'stopped' ? '#fbbf24' : colors.textSecondary;

  return (
    <Screen padded={false}>
      <ScrollView
        contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 40 }}
        refreshControl={
          <RefreshControl refreshing={offers.isFetching || rentals.isFetching} onRefresh={refreshAll} />
        }
      >
        <Text style={{ color: colors.text, fontSize: 28, fontFamily: displayFont, fontWeight: '600', marginTop: 8 }}>
          {t('gpu.rent.title')}
        </Text>
        <Text style={{ color: colors.textSecondary, marginTop: 8, lineHeight: 21, fontSize: 14 }}>{t('gpu.rent.subtitle')}</Text>

        <View
          style={{
            marginTop: 14,
            flexDirection: 'row',
            justifyContent: 'space-between',
            alignItems: 'center',
            borderWidth: 1,
            borderColor: colors.border,
            borderRadius: 14,
            padding: 14,
          }}
        >
          <View>
            <Text style={{ color: colors.textSecondary, fontSize: 12 }}>{t('gpu.rent.balance')}</Text>
            <Text style={{ color: colors.text, fontSize: 20, fontWeight: '800', marginTop: 2 }}>{formatMoney(available)}</Text>
          </View>
          <Pressable onPress={() => router.push('/wallet')}>
            <Text style={{ color: GOLD, fontWeight: '700' }}>{t('gpu.rent.topUp')}</Text>
          </Pressable>
        </View>

        {error ? <Text style={{ color: colors.danger, marginTop: 12, lineHeight: 20 }}>{error}</Text> : null}

        <Text style={{ color: colors.text, fontSize: 18, fontWeight: '700', marginTop: 24 }}>{t('gpu.rent.chooseGpu')}</Text>
        {offers.isLoading ? (
          <Text style={{ color: colors.textSecondary, marginTop: 8 }}>{t('gpu.rent.loading')}</Text>
        ) : (offers.data?.offers || []).length === 0 ? (
          <Text style={{ color: colors.textSecondary, marginTop: 8 }}>{t('gpu.rent.noOffers')}</Text>
        ) : (
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginTop: 10 }}>
            {(offers.data?.offers || []).map((o) => {
              const active = selected?.id === o.id;
              return (
                <Pressable
                  key={o.id}
                  onPress={() => {
                    setSelected(o);
                    if (!name) setName(`${o.name} workspace`);
                  }}
                  style={{
                    width: '48%',
                    borderWidth: active ? 2 : 1,
                    borderColor: active ? GOLD : colors.border,
                    borderRadius: 14,
                    padding: 12,
                  }}
                >
                  <Text style={{ color: colors.text, fontWeight: '700' }}>{o.name}</Text>
                  <Text style={{ color: colors.textSecondary, fontSize: 12, marginTop: 2 }}>{o.memoryGb} GB VRAM</Text>
                  <Text style={{ color: colors.text, fontWeight: '800', fontSize: 16, marginTop: 8 }}>
                    {formatMoney(o.pricePerHour)}
                    <Text style={{ color: colors.textSecondary, fontSize: 12, fontWeight: '400' }}>/{t('gpu.rent.hour')}</Text>
                  </Text>
                  <Text style={{ color: o.availability === 'high' ? '#34d399' : '#fbbf24', fontSize: 12, marginTop: 4 }}>
                    {t(`gpu.rent.avail.${o.availability}`)}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        )}

        {selected ? (
          <View style={{ marginTop: 14, gap: 10 }}>
            <TextInput
              value={name}
              onChangeText={setName}
              maxLength={80}
              placeholder={t('gpu.rent.name')}
              placeholderTextColor={colors.textSecondary}
              style={{
                borderWidth: 1,
                borderColor: colors.border,
                borderRadius: 12,
                paddingHorizontal: 12,
                minHeight: 46,
                color: colors.text,
              }}
            />
            <Button
              title={t('gpu.rent.rent')}
              loading={create.isPending}
              disabled={!canAfford}
              onPress={() => create.mutate(selected)}
            />
            <Text style={{ color: colors.textSecondary, fontSize: 12, lineHeight: 18 }}>
              {t('gpu.rent.billingNote', { hours: prepayHours, grace: limits?.terminateGraceHours ?? 24 })}
            </Text>
            {!canAfford ? (
              <Pressable onPress={() => router.push('/wallet')}>
                <Text style={{ color: '#fbbf24', lineHeight: 20 }}>
                  {t('gpu.rent.needBalance', { amount: formatMoney(selected.pricePerHour * prepayHours) })} {t('gpu.rent.topUp')} →
                </Text>
              </Pressable>
            ) : null}
          </View>
        ) : null}

        <Text style={{ color: colors.text, fontSize: 18, fontWeight: '700', marginTop: 28 }}>{t('gpu.rent.myMachines')}</Text>
        {(rentals.data || []).length === 0 ? (
          <Text style={{ color: colors.textSecondary, marginTop: 8 }}>{t('gpu.rent.empty')}</Text>
        ) : (
          (rentals.data || []).map((r) => (
            <View key={r.id} style={{ borderWidth: 1, borderColor: colors.border, borderRadius: 14, padding: 14, marginTop: 10, gap: 6 }}>
              <Text style={{ color: colors.text, fontWeight: '700' }}>{r.name}</Text>
              <Text style={{ color: colors.textSecondary, fontSize: 12 }}>
                {r.gpu.name} · {r.gpu.memoryGb} GB VRAM · {r.volumeGb} GB /workspace
              </Text>
              <Text style={{ fontSize: 12 }}>
                <Text style={{ color: statusColor(r), fontWeight: '700' }}>{statusLabel(r)}</Text>
                <Text style={{ color: colors.textSecondary }}>
                  {'  '}
                  {formatMoney(r.status === 'stopped' ? r.stoppedPricePerHour : r.pricePerHour)}/{t('gpu.rent.hour')} · {t('gpu.rent.spent')}{' '}
                  {formatMoney(r.billedTotal)}
                </Text>
              </Text>
              {r.stoppedReason === 'insufficient_funds' && r.terminateAfter && r.status !== 'terminated' ? (
                <Text style={{ color: '#fbbf24', fontSize: 12, lineHeight: 18 }}>
                  {t('gpu.rent.fundsStopped', { date: formatDate(r.terminateAfter, language) })}
                </Text>
              ) : null}
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 6 }}>
                {r.status === 'running' ? (
                  <>
                    <Button title="JupyterLab" disabled={!r.ready} onPress={() => openWorkspace(r, 'lab')} style={{ flexGrow: 1 }} />
                    <Button
                      title="Terminal"
                      variant="dark"
                      disabled={!r.ready}
                      onPress={() => openWorkspace(r, 'terminal')}
                      style={{ flexGrow: 1 }}
                    />
                    <Button title={t('gpu.rent.stop')} variant="outline" onPress={() => confirmStop(r)} style={{ flexGrow: 1 }} />
                  </>
                ) : null}
                {r.status === 'stopped' || r.status === 'error' ? (
                  <Button
                    title={t('gpu.rent.start')}
                    loading={action.isPending && action.variables?.id === r.id}
                    onPress={() => action.mutate({ id: r.id, kind: 'start' })}
                    style={{ flexGrow: 1 }}
                  />
                ) : null}
                {r.status !== 'terminated' ? (
                  <Button title={t('gpu.rent.delete')} variant="danger" onPress={() => confirmDelete(r)} style={{ flexGrow: 1 }} />
                ) : null}
              </View>
            </View>
          ))
        )}
      </ScrollView>
    </Screen>
  );
}
