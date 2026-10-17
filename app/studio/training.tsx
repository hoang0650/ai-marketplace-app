import React, { useEffect, useState } from 'react';
import { Text, View } from 'react-native';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import { sharedTrainingApi } from '@/api/studio';
import { useTheme } from '@/hooks/useT';
import { Button } from '@/components/ui/Button';
import { Card, Chips, PromoBadge, StudioScreen } from '@/components/studio/kit';

const TASK: Record<string, string> = { raw: 'llm-sft', audio: 'speech-recognition', video: 'action-recognition' };

export default function SharedTraining() {
  const { colors } = useTheme();
  const router = useRouter();
  const qc = useQueryClient();
  const opts = useQuery({ queryKey: ['train-gpu-options'], queryFn: sharedTrainingApi.options });
  const ds = useQuery({ queryKey: ['train-datasets'], queryFn: sharedTrainingApi.datasets });
  const jobs = useQuery({ queryKey: ['train-jobs'], queryFn: sharedTrainingApi.jobs, refetchInterval: 10000 });
  const [datasetId, setDatasetId] = useState('');
  const [msg, setMsg] = useState('');
  const [busy, setBusy] = useState(false);
  const list = ds.data?.datasets || [];
  useEffect(() => { if (!datasetId && list[0]) setDatasetId(list[0].id); }, [list, datasetId]);
  const sh = opts.data?.shared;
  const promo = opts.data?.promo?.active;
  const minutes = opts.data?.limits?.maxMinutes ?? sh?.maxMinutes ?? 30;
  async function start() {
    const d = list.find((x) => x.id === datasetId);
    if (!d || !sh) return;
    setBusy(true); setMsg('');
    try {
      await sharedTrainingApi.create({ source: d.source, task: TASK[d.source] || 'custom', datasetId: d.id, offerId: sh.id, autoStop: true });
      setMsg('Đã gửi job vào hàng đợi GPU 5090.');
      void qc.invalidateQueries({ queryKey: ['train-jobs'] });
    } catch (e) { setMsg((e as Error)?.message || 'Không tạo được job.'); }
    setBusy(false);
  }
  return (
    <StudioScreen title="Huấn luyện trên RTX 5090" subtitle="GPU 5090 dùng chung của AI Markets: mỗi lần chạy một job nặng, có hàng đợi.">
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
        <Text style={{ color: colors.text, fontWeight: '700' }}>Bộ dữ liệu</Text>
        {list.length ? <Chips value={datasetId} onChange={setDatasetId} options={list.map((d) => ({ value: d.id, label: `${d.name} (${d.fileCount})` }))} />
          : <Text style={{ color: colors.textSecondary }}>Bạn chưa có bộ dữ liệu. Tạo trên web tại aimarkets.vn/training.</Text>}
        <Button title={busy ? 'Đang gửi…' : 'Bắt đầu huấn luyện'} disabled={busy || !sh || !datasetId} onPress={start} />
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
