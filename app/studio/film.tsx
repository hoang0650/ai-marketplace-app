import React, { useEffect, useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { studioApi, type FilmScene } from '@/api/studio';
import { useTheme } from '@/hooks/useT';
import { Button } from '@/components/ui/Button';
import { Card, Chips, Field, JobStatus, LANGS, ResultVideo, StudioScreen, useStudioJob } from '@/components/studio/kit';

const MAX_SCENES = 6;

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
    <StudioScreen title="Làm phim AI" subtitle="Mỗi cảnh một hình và một lời dẫn. GPU ghép thành phim ngắn, tối đa 6 cảnh." kind="film" testID="film-screen">
      <Card>
        <Field testID="film-title" label="Tên phim" value={title} onChange={setTitle} placeholder="VD: Sáng sớm phố cổ" />
        <Chips value={lang} onChange={setLang} options={LANGS.map((l) => ({ ...l }))} />
        {lang !== 'zh' && list.length ? (
          <>
            <Text style={{ fontSize: 12, color: colors.textSecondary }}>Giọng dẫn chuyện</Text>
            <Chips value={voice} onChange={setVoice} options={list.map((v) => ({ value: v.id, label: v.label }))} />
          </>
        ) : null}
        <Text style={{ fontSize: 12, color: colors.textSecondary }}>{valid.length}/{scenes.length} cảnh đủ mô tả · tối đa {MAX_SCENES}</Text>
      </Card>
      {scenes.map((s, i) => {
        const ready = s.prompt.trim().length >= 3;
        return (
          <Card key={i}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
              <Text style={{ color: colors.text, fontWeight: '700' }}>Cảnh {i + 1}</Text>
              <Text style={{ color: ready ? '#059669' : colors.textSecondary, fontSize: 12, fontWeight: '700' }}>{ready ? 'Sẵn sàng' : 'Cần mô tả'}</Text>
            </View>
            <Field testID={`film-prompt-${i}`} label="Hình ảnh" value={s.prompt} onChange={(v) => set(i, 'prompt', v)} multiline placeholder="VD: Bát phở bốc khói trên bàn gỗ, cận cảnh điện ảnh" />
            <Field testID={`film-narration-${i}`} label="Lời dẫn (tuỳ chọn)" value={s.narration} onChange={(v) => set(i, 'narration', v)} multiline placeholder="VD: Năm giờ sáng, quán phở đầu ngõ đã đỏ lửa." />
            {scenes.length > 1 ? (
              <Pressable disabled={j.busy} onPress={() => setScenes((all) => all.filter((_, n) => n !== i))} style={{ alignSelf: 'flex-start', minHeight: 32, justifyContent: 'center' }}>
                <Text style={{ color: colors.textSecondary }}>Xoá cảnh</Text>
              </Pressable>
            ) : null}
          </Card>
        );
      })}
      <View style={{ flexDirection: 'row', gap: 10, marginTop: 14 }}>
        <Button title="Thêm cảnh" variant="outline" disabled={j.busy || scenes.length >= MAX_SCENES} onPress={() => setScenes((all) => [...all, { prompt: '', narration: '' }])} style={{ flex: 1 }} />
        <Button title={j.busy ? 'Đang dựng…' : `Tạo phim (${valid.length})`} variant="dark" disabled={j.busy || !valid.length}
          onPress={() => j.run(() => studioApi.film({ title: title.trim(), lang, voice: lang === 'zh' ? undefined : voice || undefined, scenes: valid.map((x) => ({ prompt: x.prompt.trim(), narration: x.narration.trim() })) }))} style={{ flex: 1 }} />
      </View>
      {j.job || j.error ? <Card><Text style={{ color: colors.text, fontWeight: '700' }}>Phim của bạn</Text><JobStatus {...j} />{j.job?.status === 'succeeded' ? <ResultVideo path={j.job.videoUrl} /> : null}</Card> : null}
    </StudioScreen>
  );
}
