import React, { useEffect, useRef, useState } from 'react';
import { Alert, Pressable, Text, View } from 'react-native';
import * as DocumentPicker from 'expo-document-picker';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import { filmV2Api, type FilmProjectV2, type FilmSceneV2, type VoiceSource } from '@/api/film-v2';
import { useTheme } from '@/hooks/useT';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/Button';
import { Card, Chips, Field, ResultVideo, StudioScreen } from './kit';

export default function FilmEditor() {
  const { colors } = useTheme(); const { isAuthenticated } = useAuth(); const router = useRouter(); const qc = useQueryClient();
  const [project, setProject] = useState<FilmProjectV2 | null>(null);
  const [dirty, setDirty] = useState(false); const [busy, setBusy] = useState(false); const [error, setError] = useState('');
  const lastWriteAt = useRef(0);
  const [picker, setPicker] = useState('');
  const config = useQuery({ queryKey: ['film-v2-config'], queryFn: filmV2Api.config, enabled: isAuthenticated });
  const projects = useQuery({ queryKey: ['film-v2-projects'], queryFn: filmV2Api.list, enabled: isAuthenticated });
  const voices = useQuery({ queryKey: ['film-v2-seller-voices'], queryFn: filmV2Api.voices, enabled: isAuthenticated });
  const live = useQuery({ queryKey: ['film-v2-project', project?.id], queryFn: () => filmV2Api.one(project!.id), enabled: !!project?.id && isAuthenticated && !busy, refetchInterval: dirty ? false : 5000 });
  useEffect(() => { if (live.data && !dirty && !busy && live.data.id === project?.id && live.dataUpdatedAt > lastWriteAt.current) setProject(live.data); }, [live.data, live.dataUpdatedAt, dirty, busy, project?.id]);
  const message = (e: unknown) => setError(e instanceof Error ? e.message : 'Không thể xử lý yêu cầu.');
  async function open(id?: string) {
    if (dirty) { setError('Hãy lưu dự án hiện tại trước.'); return; }
    try { setBusy(true); setProject(id ? await filmV2Api.one(id) : await filmV2Api.create()); setDirty(false); setError(''); void qc.invalidateQueries({ queryKey: ['film-v2-projects'] }); }
    catch (e) { message(e); } finally { setBusy(false); }
  }
  function update(patch: Partial<FilmProjectV2>) { setProject(p => p ? { ...p, ...patch } : p); setDirty(true); }
  function scene(index: number, patch: Partial<FilmSceneV2>) { if (project) update({ scenes: project.scenes.map((s, i) => i === index ? { ...s, ...patch } : s) }); }
  async function save() { if (!project) throw new Error('Chọn một dự án.'); await qc.cancelQueries({ queryKey: ['film-v2-project', project.id] }); const p = await filmV2Api.save(project); lastWriteAt.current = Date.now(); setProject(p); setDirty(false); return p; }
  async function estimate(render: boolean, index = 0) {
    try {
      setBusy(true); setError(''); const p = await save(); const sid = p.scenes[index]?.sid;
      const q = await filmV2Api.estimate(p.id, render ? [] : [sid]);
      const price = render ? q.render.price : q.items.find(i => i.sid === sid)?.price;
      if (price == null) throw new Error('Không lấy được báo giá.'); if (price > q.available) throw new Error('Số dư ví không đủ.');
      Alert.alert(render ? 'Xác nhận xuất phim' : 'Xác nhận tạo cảnh', `Chi phí: $${price.toFixed(6)}\nSố dư: $${q.available.toFixed(2)}`, [
        { text: 'Hủy', style: 'cancel', onPress: () => setBusy(false) },
        { text: 'Xác nhận', onPress: () => { void (async () => { try { const r = render ? await filmV2Api.render(p.id, price) : await filmV2Api.generate(p.id, sid, price); lastWriteAt.current = Date.now(); setProject(r.project); void qc.invalidateQueries({ queryKey: ['film-v2-project', p.id] }); } catch (e) { message(e); } finally { setBusy(false); } })(); } },
      ], { cancelable: false });
    } catch (e) { message(e); setBusy(false); }
  }
  async function uploadVoice(index: number) {
    try {
      const picked = await DocumentPicker.getDocumentAsync({ type: 'audio/*', copyToCacheDirectory: true }); if (picked.canceled) return;
      setBusy(true); const p = await save(); const f = picked.assets[0]; const blob = await (await fetch(f.uri)).blob();
      if (blob.size > 12 * 1024 ** 2) throw new Error('Giọng mẫu tối đa 12 MB.');
      const r = await filmV2Api.upload(p.id, { kind: 'audio', name: f.name, size: blob.size, contentType: f.mimeType || 'audio/mpeg' });
      if (!(await fetch(r.putUrl, { method: 'PUT', headers: r.headers, body: blob })).ok) throw new Error('Tải giọng mẫu thất bại.');
      const c = await filmV2Api.confirmUpload(p.id, r.upload.uid); if (c.upload.duration < 6 || c.upload.duration > 15) throw new Error('Giọng mẫu cần dài 6–15 giây.');
      const fresh = await filmV2Api.one(p.id); fresh.scenes[index] = { ...fresh.scenes[index], voiceSource: 'upload', voiceUploadId: r.upload.uid };
      lastWriteAt.current = Date.now(); setProject(await filmV2Api.save(fresh)); setDirty(false);
    } catch (e) { message(e); } finally { setBusy(false); }
  }
  const models = (index: number, kind: 'image' | 'video', id?: string) => {
    const list = config.data?.modelCatalog.filter(m => m.kind === kind) || []; const key = `${index}-${kind}`;
    const current = list.find(m => m.id === id) || list.find(m => m.available);
    const label = (m: typeof list[number]) => `${m.name} · ${m.marketplacePricing ? '$' + m.marketplacePricing.usageRate.toFixed(6) + '/' + m.marketplacePricing.usageUnit : 'Xem báo giá'}`;
    return <View style={{ gap: 6 }}><Button variant="outline" title={`${kind === 'video' ? 'Model video' : 'Model ảnh'}: ${current?.name || 'Đang tải…'}`} disabled={busy} onPress={() => setPicker(picker === key ? '' : key)} /><Text style={{ color: colors.textSecondary }}>{current ? label(current) : ''}</Text>
      {picker === key ? list.map(m => <Pressable key={m.id} disabled={!m.available || busy} onPress={() => { scene(index, kind === 'video' ? { videoModel: m.id } : { imageModel: m.id }); setPicker(''); }} style={{ padding: 12, borderRadius: 10, opacity: m.available ? 1 : 0.45 }}><Text style={{ color: colors.text }}>{label(m)}{m.available ? '' : ` · ${m.reason}`}</Text></Pressable>) : null}</View>;
  };
  const rendered = [...(project?.renders || [])].reverse().find(r => r.status === 'succeeded');
  return <StudioScreen hideQuota title="Làm phim AI" subtitle="Dự án đồng bộ với web. Chọn model, giọng đọc và xem báo giá trước khi tạo." testID="film-screen">
    <Card><Button title="+ Dự án mới" onPress={() => open()} disabled={busy} />{(projects.data?.items || []).map(p => <Pressable key={p.id} disabled={busy} onPress={() => open(p.id)} style={{ paddingVertical: 10 }}><Text style={{ color: colors.text }}>{p.title}{project?.id === p.id ? ' ✓' : ''}</Text></Pressable>)}</Card>
    {error ? <Card><Text accessibilityRole="alert" style={{ color: '#dc2626' }}>{error}</Text></Card> : null}
    {project ? <>
      <Card><Field label="Tên phim" value={project.title} onChange={title => update({ title })} />
        <Chips value={project.lang} onChange={lang => update({ lang })} options={(config.data?.languages || []).map(l => ({ value: l.code, label: l.name }))} />
        <Chips value={project.subtitles || 'off'} onChange={subtitles => update({ subtitles })} options={[{ value: 'off' as const, label: 'Không phụ đề' }, { value: 'soft' as const, label: 'Phụ đề bật/tắt' }, { value: 'burn' as const, label: 'In lên hình' }]} />
      </Card>
      {project.scenes.map((s, i) => <Card key={s.sid}>
        <Text style={{ color: colors.text, fontWeight: '700' }}>Cảnh {i + 1} · {s.status || 'Nháp'}</Text>
        <Field label="Mô tả video (prompt)" value={s.prompt} onChange={prompt => scene(i, { prompt })} multiline />
        {models(i, 'video', s.videoModel)}{models(i, 'image', s.imageModel)}
        <Field label="Thời lượng cảnh (5–60 giây)" value={String(s.duration)} onChange={v => scene(i, { duration: Number(v) || 5 })} />
        <Field label="Lời dẫn" value={s.narration} onChange={narration => scene(i, { narration })} multiline />
        <Chips value={s.voiceSource || 'preset'} onChange={(voiceSource: VoiceSource) => scene(i, { voiceSource })} options={[{ value: 'preset' as const, label: 'Giọng sàn' }, { value: 'upload' as const, label: 'Tải giọng mẫu' }, { value: 'marketplace' as const, label: 'Giọng seller' }]} />
        {!s.voiceSource || s.voiceSource === 'preset' ? <Chips value={s.voice} onChange={voice => scene(i, { voice })} options={(config.data?.voices[s.lang || project.lang] || []).map(v => ({ value: v.id, label: v.name }))} /> : null}
        {s.voiceSource === 'upload' ? <><Text style={{ color: colors.textSecondary }}>Giọng mẫu 6–15 giây, tối đa 12 MB. Chỉ dùng giọng bạn có quyền sử dụng.</Text><Button variant="outline" title="Tải giọng mẫu lên" disabled={busy} onPress={() => uploadVoice(i)} />{project.uploads.filter(u => u.kind === 'audio' && u.status === 'ready' && u.duration >= 6 && u.duration <= 15).map(u => <Button key={u.uid} variant={u.uid === s.voiceUploadId ? 'dark' : 'outline'} title={u.name} onPress={() => scene(i, { voiceUploadId: u.uid })} />)}</> : null}
        {s.voiceSource === 'marketplace' ? <><Text style={{ color: colors.textSecondary }}>Cần license còn hạn. Phí lồng tiếng của phim vẫn có trong báo giá.</Text>{(voices.data?.items || []).filter(v => !v.languages.length || v.languages.includes(s.lang || project.lang)).map(v => <Button key={v.id} variant={s.voiceProductId === v.id ? 'dark' : 'outline'} title={`${v.name} · ${v.seller}${v.available ? '' : ' · Mua license'}`} onPress={() => v.available ? scene(i, { voiceProductId: v.id }) : router.push(`/product/${v.slug}` as never)} />)}</> : null}
        <Button title="Ước tính & tạo cảnh" disabled={busy || s.status === 'generating' || s.prompt.trim().length < 3} onPress={() => estimate(false, i)} />
      </Card>)}
      <Button variant="outline" title="+ Thêm cảnh" disabled={busy || project.scenes.length >= 480} onPress={() => update({ scenes: [...project.scenes, { sid: 'new_' + Date.now(), prompt: '', narration: '', duration: 15, voice: 'Binh', source: 'ai', shots: [] }] })} />
      <Button title="Lưu dự án" disabled={busy || !dirty} onPress={() => { setBusy(true); void save().catch(message).finally(() => setBusy(false)); }} />
      <Button title={project.renders.some(r => ['queued', 'running'].includes(r.status)) ? 'Đang xuất phim…' : 'Xem giá & xuất phim'} disabled={busy || !project.scenes.length || project.renders.some(r => ['queued', 'running'].includes(r.status))} onPress={() => estimate(true)} />
      {rendered && project.media[rendered.key] ? <ResultVideo path={project.media[rendered.key]} /> : null}
    </> : <Text style={{ color: colors.textSecondary, marginTop: 16 }}>Mở dự án đã có trên web hoặc tạo dự án mới để bắt đầu.</Text>}
  </StudioScreen>;
}
