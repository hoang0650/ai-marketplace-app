import React, { useState } from 'react';
import { Image, Text } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { studioApi } from '@/api/studio';
import { Button } from '@/components/ui/Button';
import { Card, Chips, Field, JobStatus, LANGS, ResultVideo, StudioScreen, useStudioJob } from '@/components/studio/kit';

export default function Talking() {
  const [lang, setLang] = useState<'vi' | 'en' | 'zh'>('vi');
  const [text, setText] = useState('');
  const [img, setImg] = useState<{ uri: string; b64: string } | null>(null);
  const j = useStudioJob(25);
  async function pick() {
    const r = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], base64: true, quality: 0.85 });
    const a = r.canceled ? null : r.assets[0];
    if (a?.base64) setImg({ uri: a.uri, b64: a.base64 });
  }
  return (
    <StudioScreen title="Avatar nói" subtitle="Tải ảnh chân dung rõ mặt, nhập lời thoại — VieNeu đọc và JoyVASA/LivePortrait nhép miệng." kind="talking">
      <Card>
        <Button title={img ? 'Đổi ảnh chân dung' : 'Chọn ảnh chân dung'} variant="outline" onPress={pick} />
        {img ? <Image source={{ uri: img.uri }} style={{ width: 160, height: 160, borderRadius: 12, alignSelf: 'center' }} /> : null}
        <Chips value={lang} onChange={setLang} options={LANGS.map((l) => ({ ...l }))} />
        <Field testID="talk-text" label="Lời thoại" value={text} onChange={setText} multiline placeholder="VD: Xin chào, mình là trợ lý ảo của AI Markets." />
        <Button title={j.busy ? 'Đang tạo…' : 'Tạo video avatar'} disabled={j.busy || !img || !text.trim()} onPress={() => j.run(() => studioApi.talking({ text: text.trim(), lang, imageBase64: img!.b64 }))} />
        <JobStatus {...j} />
        {j.job?.status === 'succeeded' ? <ResultVideo path={j.job.videoUrl} /> : null}
        <Text style={{ fontSize: 11, opacity: 0.6 }}>Ảnh cần thấy rõ một khuôn mặt nhìn thẳng.</Text>
      </Card>
    </StudioScreen>
  );
}
