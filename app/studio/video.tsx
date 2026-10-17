import React, { useState } from 'react';
import { Image, Text } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { studioApi } from '@/api/studio';
import { Button } from '@/components/ui/Button';
import { Card, Chips, Field, JobStatus, ResultVideo, StudioScreen, useStudioJob } from '@/components/studio/kit';

export default function FastVideo() {
  const [mode, setMode] = useState<'t2v' | 'i2v'>('t2v');
  const [prompt, setPrompt] = useState('');
  const [img, setImg] = useState<{ uri: string; b64: string } | null>(null);
  const j = useStudioJob(20);
  async function pick() {
    const r = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], base64: true, quality: 0.85 });
    const a = r.canceled ? null : r.assets[0];
    if (a?.base64) setImg({ uri: a.uri, b64: a.base64 });
  }
  const ready = mode === 't2v' ? prompt.trim().length >= 3 : !!img;
  return (
    <StudioScreen title="Video nhanh" subtitle="Flux.1 schnell tạo ảnh → Wan2.2 tạo chuyển động 4 giây → RIFE nội suy 30fps." kind="fast">
      <Card>
        <Chips value={mode} onChange={setMode} options={[{ value: 't2v', label: 'Chữ → video' }, { value: 'i2v', label: 'Ảnh → video' }]} />
        {mode === 'i2v' ? (
          <>
            <Button title={img ? 'Đổi ảnh' : 'Chọn ảnh'} variant="outline" onPress={pick} />
            {img ? <Image source={{ uri: img.uri }} style={{ width: '100%', aspectRatio: 16 / 9, borderRadius: 10 }} resizeMode="cover" /> : null}
          </>
        ) : null}
        <Field testID="fast-prompt" label={mode === 't2v' ? 'Mô tả cảnh' : 'Chuyển động mong muốn (tuỳ chọn)'} value={prompt} onChange={setPrompt} multiline placeholder="VD: Thuyền gỗ trôi trên sông Hoài lúc hoàng hôn, điện ảnh" />
        <Button title={j.busy ? 'Đang tạo…' : 'Tạo video'} disabled={j.busy || !ready} onPress={() => j.run(() => studioApi.fast({ prompt: prompt.trim(), imageBase64: mode === 'i2v' ? img?.b64 : undefined }))} />
        <JobStatus {...j} />
        {j.job?.status === 'succeeded' ? <ResultVideo path={j.job.videoUrl} /> : null}
        <Text style={{ fontSize: 11, opacity: 0.6 }}>Mô hình cho phép dùng thương mại: FLUX.1 schnell (Apache-2.0), Wan2.2 (Apache-2.0), RIFE (MIT).</Text>
      </Card>
    </StudioScreen>
  );
}
