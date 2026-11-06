import React, { useState } from 'react';
import { Alert, Text, View } from 'react-native';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import { gpuRentalApi } from '@/api';
import { trainingWorkspaceApi } from '@/api/training-workspace';
import { sharedTrainingApi } from '@/api/studio';
import { useT, useTheme } from '@/hooks/useT';
import { Button } from '@/components/ui/Button';
import { Card, Chips, Field, PromoBadge, StudioScreen } from '@/components/studio/kit';

const TASK: Record<string, string> = { raw: 'llm-sft', audio: 'speech-recognition', video: 'action-recognition' };

export default function SharedTraining() {
  const { colors } = useTheme();
  const { t } = useT();
  const router = useRouter();
  const qc = useQueryClient();
  const opts = useQuery({ queryKey: ['train-gpu-options'], queryFn: sharedTrainingApi.options });
  const ds = useQuery({ queryKey: ['train-datasets'], queryFn: sharedTrainingApi.datasets });
  const jobs = useQuery({ queryKey: ['train-jobs'], queryFn: sharedTrainingApi.jobs, refetchInterval: 10000 });
  const [mode, setMode] = useState<'shared' | 'new' | 'existing'>('shared');
  const [offerId, setOfferId] = useState(''); const [rentalId, setRentalId] = useState(''); const [volumeId, setVolumeId] = useState('');
  const [volumeName, setVolumeName] = useState('Training'); const [volumeSize, setVolumeSize] = useState('20'); const [dc, setDc] = useState('');
  const rentals = useQuery({ queryKey: ['train-rentals'], queryFn: gpuRentalApi.list, refetchInterval: 15000 });
  const storage = useQuery({ queryKey: ['train-volumes'], queryFn: trainingWorkspaceApi.volumes });
  const catalog = useQuery({ queryKey: ['train-workspace-offers'], queryFn: trainingWorkspaceApi.offers });
  const volume = storage.data?.volumes.find(v => v.id === volumeId);
  const offers = (catalog.data?.offers || []).flatMap(o => {
    if (!volume) return [o];
    const secure = o.clouds?.find(c => c.type === 'secure' && c.dataCenters.some(d => d.id === volume.dataCenterId && d.availability !== 'unknown'));
    return secure ? [{ ...o, pricePerHour: secure.networkVolumePricePerHour }] : [];
  });
  async function createVolume() {
    const sizeGb = Number(volumeSize), lim = storage.data?.limits;
    if (!lim || !dc || !Number.isInteger(sizeGb) || sizeGb < lim.sizeMin || sizeGb > lim.sizeMax) { setMsg('Chọn trung tâm dữ liệu và dung lượng hợp lệ.'); return; }
    Alert.alert(t('popup.training.volumeTitle'), t('popup.training.volumeCost', { price: `$${(sizeGb * lim.pricePerGbMonth).toFixed(2)}` }), [
      { text: t('common.cancel'), style: 'cancel' }, { text: t('popup.training.createVolume'), onPress: () => { void (async () => { setBusy(true); try { const r = await trainingWorkspaceApi.createVolume({ name: volumeName, sizeGb, dataCenterId: dc }); setVolumeId(r.volume.id); setOfferId(''); await qc.invalidateQueries({ queryKey: ['train-volumes'] }); } catch (e) { setMsg((e as Error).message); } finally { setBusy(false); } })(); } },
    ]);
  }
  const [datasetId, setDatasetId] = useState('');
  const [msg, setMsg] = useState('');
  const [busy, setBusy] = useState(false);
  const list = ds.data?.datasets || [];
  const selectedDatasetId = datasetId || list[0]?.id || '';
  const sh = opts.data?.shared;
  const promo = opts.data?.promo?.active;
  const minutes = opts.data?.limits?.maxMinutes ?? sh?.maxMinutes ?? 30;
  async function start() {
    const d = list.find((x) => x.id === selectedDatasetId);
    if (!d || !d.fileCount || (mode === 'shared' ? !sh : mode === 'new' ? !offerId : !rentalId)) return;
    setBusy(true); setMsg('');
    try {
      await sharedTrainingApi.create({ source: d.source, task: TASK[d.source] || 'custom', datasetId: d.id, offerId: mode === 'shared' ? sh?.id : mode === 'new' ? offerId : undefined, rentalId: mode === 'existing' ? rentalId : undefined, volumeId: mode === 'new' ? volumeId || undefined : undefined, autoStop: mode !== 'existing' });
      setMsg(mode === 'existing' ? 'Đã gửi job lên GPU đang thuê; không tạo thêm máy.' : 'Đã gửi job huấn luyện.');
      void qc.invalidateQueries({ queryKey: ['train-jobs'] });
    } catch (e) { setMsg((e as Error)?.message || 'Không tạo được job.'); }
    setBusy(false);
  }
  return (
    <StudioScreen hideQuota title="Huấn luyện model" subtitle="GPU dùng chung, GPU thuê mới hoặc máy bạn đang thuê. Dữ liệu đồng bộ với web.">
      <Card>
        {sh ? (
          <>
            <PromoBadge active={promo} />
            <Text testID="train-shared" style={{ color: colors.text, fontWeight: '700' }}>{sh.name} · {sh.memoryGb} GB · {promo ? 'Miễn phí giai đoạn đầu' : `$${sh.pricePerHour}/giờ`}</Text>
            <Text style={{ color: colors.textSecondary }}>{promo ? `Miễn phí tối đa ${minutes} phút mỗi job trong giai đoạn đầu.` : `Tối đa ${minutes} phút mỗi job.`}</Text>
          </>
        ) : <Text style={{ color: colors.textSecondary }}>{opts.isLoading ? 'Đang tải…' : 'GPU dùng chung đang tạm dừng.'}</Text>}
      </Card>

      <Card>
        <Chips value={mode} onChange={setMode} options={[{ value: 'shared' as const, label: 'GPU dùng chung' }, { value: 'new' as const, label: 'Thuê GPU mới' }, { value: 'existing' as const, label: 'GPU đang thuê' }]} />
        {mode === 'existing' ? <>
          <Text style={{ color: colors.textSecondary }}>Dùng phiên thuê hiện tại, không tạo thêm máy. Job lưu trong /workspace/training. Hủy job sẽ dừng GPU.</Text>
          <Chips value={rentalId} onChange={setRentalId} options={(rentals.data?.rentals || []).filter(r => r.status === 'running' && r.ready).map(r => ({ value: r.id, label: r.name + ' · ' + r.gpu.name + ' · $' + r.pricePerHour.toFixed(4) + '/giờ' }))} />
        </> : null}
        {mode === 'new' ? <>
          <Text style={{ color: colors.textSecondary }}>GPU phải ở cùng trung tâm dữ liệu của ổ network. Giá ổ được tính riêng.</Text>
          <Chips value={offerId} onChange={setOfferId} options={offers.map(o => ({ value: o.id, label: o.name + ' · $' + o.pricePerHour.toFixed(4) + '/giờ' }))} />
          <Chips value={volumeId} onChange={v => { setVolumeId(v); setOfferId(''); }} options={[{ value: '', label: 'Ổ máy GPU (mất khi xóa máy)' }, ...(storage.data?.volumes || []).filter(v => v.status === 'active' && !v.attachedRentalId).map(v => ({ value: v.id, label: v.name + ' · ' + v.sizeGb + ' GB · ' + v.dataCenterId + ' · $' + v.pricePerMonth.toFixed(2) + '/tháng' }))]} />
          <Text style={{ color: colors.textSecondary }}>Ổ network giữ dữ liệu khi xóa GPU và tính phí đến khi bạn xóa ổ.</Text>
          <Field label="Tên ổ network mới" value={volumeName} onChange={setVolumeName} />
          <Field label="Dung lượng (GB)" value={volumeSize} onChange={setVolumeSize} />
          <Chips value={dc} onChange={setDc} options={(catalog.data?.dataCenters || []).map(d => ({ value: d.id, label: d.id + ' · ' + d.location }))} />
          <Button title="Tạo ổ network" disabled={busy || !dc || !storage.data} variant="outline" onPress={createVolume} />
        </> : null}
      </Card>
      <Card>
        <Text style={{ color: colors.text, fontWeight: '700' }}>Bộ dữ liệu</Text>
        {list.length ? <Chips value={selectedDatasetId} onChange={setDatasetId} options={list.map((d) => ({ value: d.id, label: `${d.name} (${d.fileCount})` }))} />
          : <Text style={{ color: colors.textSecondary }}>Bạn chưa có bộ dữ liệu. Tạo trên web tại aimarkets.vn/training.</Text>}
        <Button title={busy ? 'Đang gửi…' : 'Bắt đầu huấn luyện'} disabled={busy || !selectedDatasetId || (mode === 'shared' ? !sh : mode === 'new' ? !offerId : !rentalId)} onPress={start} />
        {msg ? <Text style={{ color: colors.text }}>{msg}</Text> : null}
      </Card>
      {(jobs.data || []).slice(0, 5).map((jb) => (
        <Card key={jb.jobId}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
            <Text style={{ color: colors.text, fontWeight: '600' }}>{jb.datasetName || jb.task}</Text>
            <Text style={{ color: colors.textSecondary }}>{jb.status}{jb.shared ? ' · 5090' : ''}</Text>
          </View>
          <Text style={{ color: colors.textSecondary, fontSize: 12 }}>{jb.stage} · {Math.round((jb.progress || 0) * (jb.progress <= 1 ? 100 : 1))}%{jb.freePromo ? ' · 🎁 miễn phí' : ''}</Text>
        </Card>
      ))}
      <Button title="Mở GPU & dữ liệu" variant="outline" onPress={() => router.push('/gpu' as never)} style={{ marginTop: 14 }} />
    </StudioScreen>
  );
}
