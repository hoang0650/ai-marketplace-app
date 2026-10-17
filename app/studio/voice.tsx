import React, { useEffect, useState } from 'react';
import { Text } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import * as DocumentPicker from 'expo-document-picker';
import { useLocalSearchParams } from 'expo-router';
import { fileToBase64, studioApi } from '@/api/studio';
import { Button } from '@/components/ui/Button';
import { Card, Chips, Field, JobStatus, LANGS, ResultAudio, StudioScreen, useStudioJob } from '@/components/studio/kit';

export default function Voice() {
  const params = useLocalSearchParams<{ mode?: string }>();
  const [mode, setMode] = useState<'preset' | 'clone'>(params.mode === 'clone' ? 'clone' : 'preset');
  const [lang, setLang] = useState<'vi' | 'en' | 'zh'>('vi');
  const [voice, setVoice] = useState('');
  const [text, setText] = useState('');
  const [sample, setSample] = useState<{ name: string; b64: string } | null>(null);
  const voices = useQuery({ queryKey: ['studio-voices'], queryFn: studioApi.voices, staleTime: 300000 });
  const list = voices.data?.[lang] || [];
  useEffect(() => { if (!list.find((v) => v.id === voice)) setVoice(list[0]?.id || ''); }, [lang, voices.data]); // eslint-disable-line react-hooks/exhaustive-deps
  const j = useStudioJob(mode === 'clone' ? 16 : 6);
  async function pick() {
    const r = await DocumentPicker.getDocumentAsync({ type: 'audio/*', copyToCacheDirectory: true });
    const a = r.canceled ? null : r.assets[0];
    if (a) setSample({ name: a.name, b64: await fileToBase64(a.uri) });
  }
  const ready = !!text.trim() && (mode === 'preset' ? !!voice || lang === 'zh' : !!sample);
  return (
    <StudioScreen title={mode === 'clone' ? 'Nhân bản giọng nói' : 'Giọng có sẵn'} subtitle="VieNeu-TTS cho tiếng Việt và tiếng Anh, Chatterbox cho tiếng Trung — chạy trên RTX 5090." kind="tts">
      <Card>
        <Chips testID="voice-mode" value={mode} onChange={setMode} options={[{ value: 'preset', label: 'Giọng có sẵn' }, { value: 'clone', label: 'Nhân bản giọng' }]} />
        <Chips value={lang} onChange={setLang} options={LANGS.map((l) => ({ ...l }))} />
        {mode === 'preset' ? (
          list.length ? <Chips testID="voice-list" value={voice} onChange={setVoice} options={list.map((v) => ({ value: v.id, label: v.label }))} />
            : <Text style={{ opacity: 0.6 }}>{voices.isLoading ? 'Đang tải danh sách giọng…' : 'Giọng mặc định'}</Text>
        ) : (
          <>
            <Text style={{ fontSize: 12, opacity: 0.7 }}>Giọng mẫu (6–15 giây, rõ tiếng, không nhạc nền)</Text>
            <Button title={sample ? `🎵 ${sample.name}` : 'Tải giọng mẫu lên'} variant="outline" onPress={pick} />
          </>
        )}
        <Field testID="voice-text" label="Lời thoại" value={text} onChange={setText} multiline placeholder="VD: Xin chào! Chào mừng bạn đến với AI Markets." />
        <Button title={j.busy ? 'Đang tạo…' : 'Tạo giọng nói'} disabled={j.busy || !ready}
          onPress={() => j.run(() => studioApi.tts({ text: text.trim(), lang, voice: mode === 'preset' ? voice || undefined : undefined, voiceBase64: mode === 'clone' ? sample?.b64 : undefined }))} />
        <JobStatus {...j} />
        {j.job?.status === 'succeeded' ? <ResultAudio path={j.job.audioUrl} /> : null}
        {mode === 'clone' ? <Text style={{ fontSize: 11, opacity: 0.6 }}>Chỉ dùng giọng của bạn hoặc giọng bạn có quyền sử dụng.</Text> : null}
      </Card>
    </StudioScreen>
  );
}
