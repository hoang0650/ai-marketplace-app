import React, { useState } from 'react';
import { Image, Text } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import * as DocumentPicker from 'expo-document-picker';
import { studioApi } from '@/api/studio';
import { fileToBase64 } from '@/api/studio';
import { useT } from '@/hooks/useT';
import { Button } from '@/components/ui/Button';
import { Card, Chips, Field, JobStatus, LANGS, ResultVideo, StudioScreen, useStudioJob } from '@/components/studio/kit';

export default function Talking() {
  const [lang, setLang] = useState<'vi' | 'en' | 'zh'>('vi');
  const [text, setText] = useState('');
  const [img, setImg] = useState<{ uri: string; b64: string } | null>(null);
  const [sample, setSample] = useState<{ name: string; b64: string } | null>(null);
  const { t } = useT();
  const j = useStudioJob(25);
  async function pick() {
    const r = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], base64: true, quality: 0.85 });
    const a = r.canceled ? null : r.assets[0];
    if (a?.base64) setImg({ uri: a.uri, b64: a.base64 });
  }
  async function pickVoice() {
    const r = await DocumentPicker.getDocumentAsync({ type: 'audio/*', copyToCacheDirectory: true });
    if (!r.canceled && r.assets[0]) setSample({ name: r.assets[0].name, b64: await fileToBase64(r.assets[0].uri) });
  }
  return (
    <StudioScreen title={t('studio.talking.title')} subtitle={t('studio.talking.subtitle')} kind="talking">
      <Card>
        <Button title={img ? t('studio.talking.changePhoto') : t('studio.talking.choosePhoto')} variant="outline" onPress={pick} />
        {img ? <Image source={{ uri: img.uri }} style={{ width: 160, height: 160, borderRadius: 12, alignSelf: 'center' }} /> : null}
        <Chips value={lang} onChange={setLang} options={LANGS.map((l) => ({ ...l }))} />
        <Field testID="talk-text" label={t('studio.talking.dialogue')} value={text} onChange={setText} multiline placeholder={t('studio.talking.placeholder')} />
        <Button title={sample ? `${t('studio.talking.voiceSample')}: ${sample.name}` : t('studio.talking.chooseVoice')} variant="outline" onPress={pickVoice} />
        <Button title={j.busy ? t('studio.creating') : t('studio.talking.create')} disabled={j.busy || !img || !text.trim()} onPress={() => j.run(() => studioApi.talking({ text: text.trim(), lang, imageBase64: img!.b64, voiceBase64: sample?.b64 }))} />
        <JobStatus {...j} />
        {j.job?.status === 'succeeded' ? <ResultVideo path={j.job.videoUrl} /> : null}
        <Text style={{ fontSize: 11, opacity: 0.6 }}>{t('studio.talking.photoNote')}</Text>
      </Card>
    </StudioScreen>
  );
}
