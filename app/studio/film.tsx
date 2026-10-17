import React, { useEffect, useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { studioApi, type FilmScene } from '@/api/studio';
import { useTheme } from '@/hooks/useT';
import { Button } from '@/components/ui/Button';
import { Card, Chips, Field, JobStatus, LANGS, ResultVideo, StudioScreen, useStudioJob } from '@/components/studio/kit';

export default function Film() {
  const { colors } = useTheme();
  const [title, setTitle] = useState('');
  const [lang, setLang] = useState<'vi' | 'en' | 'zh'>('vi');
  const [voice, setVoice] = useState('');
  const [scenes, setScenes] = useState<FilmScene[]>([{ prompt: '', narration: '' }]);
  const voices = useQuery({ queryKey: ['studio-voices'], queryFn: studioApi.voices, staleTime: 300000 });
  const list = voices.data?.[lang] || [];
  useEffect(() => { if (!list.find((v) => v.id === voice)) setVoice(list[0]?.id || ''); }, [lang, voices.data]); // eslint-disable-line react-hooks/exhaustive-deps
  const valid = scenes.filter((s) => s.prompt.trim().length >= 3);
  const j = useStudioJob(22 * Math.max(1, valid.length) + 6);
  const set = (i: number, k: keyof FilmScene, v: string) => setScenes((all) => all.map((s, n) => (n === i ? { ...s, [k]: v } : s)));
  return (
    <StudioScreen title="Làm phim AI" subtitle="Viết từng cảnh và lời dẫn — ComfyUI trên GPU RTX 5090 dựng hình, chuyển động và lồng tiếng thành một bộ phim ngắn." kind="film" testID="film-screen">
      <Card>
        <Field testID="film-title" label="Tên phim" value={title} onChange={setTitle} placeholder="VD: Sáng sớm phố cổ" />
        <Chips value={lang} onChange={setLang} options={LANGS.map((l) => ({ ...l }))} />
        {lang !== 'zh' && list.length ? (<><Text style={{ fontSize: 12, color: colors.textSecondary }}>Giọng dẫn chuyện (VieNeu)</Text><Chips value={voice} onChange={setVoice} options={list.map((v) => ({ value: v.id, label: v.label }))} /></>) : null}
      </Card>
      {scenes.map((s, i) => (
        <Card key={i}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
            <Text style={{ color: colors.text, fontWeight: '700' }}>🎬 Cảnh {i + 1}</Text>
            {scenes.length > 1 ? <Pressable disabled={j.busy} onPress={() => setScenes((all) => all.filter((_, n) => n !== i))}><Text style={{ color: colors.textSecondary }}>Xoá cảnh</Text></Pressable> : null}
          </View>
          <Field testID={`film-prompt-${i}`} label="Hình ảnh của cảnh" value={s.prompt} onChange={(v) => set(i, 'prompt', v)} multiline placeholder="VD: Bát phở bốc khói trên bàn gỗ trong một con ngõ Hà Nội lúc bình minh, cận cảnh điện ảnh" />
          <Field testID={`film-narration-${i}`} label="Lời dẫn (tuỳ chọn)" value={s.narration} onChange={(v) => set(i, 'narration', v)} multiline placeholder="VD: Năm giờ sáng, quán phở đầu ngõ đã đỏ lửa." />
        </Card>
      ))}
      <View style={{ flexDirection: 'row', gap: 10, marginTop: 14 }}>
        <Button title="＋ Thêm cảnh" variant="outline" disabled={j.busy || scenes.length >= 6} onPress={() => setScenes((all) => [...all, { prompt: '', narration: '' }])} style={{ flex: 1 }} />
        <Button title={j.busy ? 'Đang dựng…' : 'Tạo phim'} variant="dark" disabled={j.busy || !valid.length}
          onPress={() => j.run(() => studioApi.film({ title: title.trim(), lang, voice: lang === 'zh' ? undefined : voice || undefined, scenes: valid.map((x) => ({ prompt: x.prompt.trim(), narration: x.narration.trim() })) }))} style={{ flex: 1 }} />
      </View>
      {j.job || j.error ? <Card><Text style={{ color: colors.text, fontWeight: '700' }}>Phim của bạn</Text><JobStatus {...j} />{j.job?.status === 'succeeded' ? <ResultVideo path={j.job.videoUrl} /> : null}</Card> : null}
      <Text style={{ fontSize: 11, color: colors.textSecondary, marginTop: 12 }}>Mô hình: Flux.1 schnell → Wan2.2 TI2V-5B → RIFE 30fps, lồng tiếng VieNeu-TTS — đều cho phép dùng thương mại. Mỗi cảnh ~4 giây, tối đa 6 cảnh.</Text>
    </StudioScreen>
  );
}
