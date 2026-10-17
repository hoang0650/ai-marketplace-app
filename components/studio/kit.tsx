import React, { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Platform, Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import { useVideoPlayer, VideoView } from 'expo-video';
import { useAudioPlayer, useAudioPlayerStatus } from 'expo-audio';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import { mediaSource, studioApi, type StudioJob, type StudioKind, type StudioSubmit } from '@/api/studio';
import { useTheme } from '@/hooks/useT';
import { useAuth } from '@/hooks/useAuth';
import { Screen } from '@/components/ui/Screen';
import { LoginPrompt } from '@/components/ui/LoginPrompt';
import { displayFont } from '@/constants/fonts';

export const KIND_LABEL: Record<StudioKind, string> = { fast: 'Video nhanh', talking: 'Avatar nói', tts: 'Giọng nói', film: 'Phim AI' };

export function StudioScreen({ title, subtitle, kind, children, testID }: { title: string; subtitle?: string; kind?: StudioKind; children: React.ReactNode; testID?: string }) {
  const { colors } = useTheme();
  const router = useRouter();
  const { isAuthenticated } = useAuth();
  return (
    <Screen>
      <ScrollView contentContainerStyle={{ paddingBottom: 48 }} keyboardShouldPersistTaps="handled" testID={testID}>
        <Pressable onPress={() => (router.canGoBack() ? router.back() : router.replace('/studio' as never))} accessibilityLabel="Quay lại" style={{ paddingVertical: 10 }}>
          <Text style={{ color: colors.textSecondary }}>‹ Quay lại</Text>
        </Pressable>
        <Text style={{ fontFamily: displayFont, fontSize: 26, color: colors.text }}>{title}</Text>
        {subtitle ? <Text style={{ color: colors.textSecondary, marginTop: 4, lineHeight: 20 }}>{subtitle}</Text> : null}
        {isAuthenticated ? <><QuotaBar kind={kind} />{children}</> : <View style={{ marginTop: 24 }}><LoginPrompt /></View>}
      </ScrollView>
    </Screen>
  );
}

export function PromoBadge({ active }: { active?: boolean }) {
  if (!active) return null;
  return (
    <View testID="studio-promo" style={{ alignSelf: 'flex-start', backgroundColor: 'rgba(16,185,129,0.12)', borderRadius: 999, paddingHorizontal: 10, paddingVertical: 4 }}>
      <Text style={{ color: '#059669', fontWeight: '700', fontSize: 12 }}>🎁 Miễn phí giai đoạn đầu</Text>
    </View>
  );
}

export function useQuota() {
  const { isAuthenticated } = useAuth();
  return useQuery({ queryKey: ['studio-quota'], queryFn: studioApi.quota, enabled: isAuthenticated, staleTime: 15000 });
}

export function QuotaBar({ kind }: { kind?: StudioKind }) {
  const { colors } = useTheme();
  const q = useQuota();
  if (!q.data) return null;
  const kinds: StudioKind[] = kind ? [kind] : ['fast', 'talking', 'tts', 'film'];
  return (
    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, alignItems: 'center', marginTop: 12 }}>
      <PromoBadge active={q.data.promo?.active} />
      {!q.data.enabled ? <Text style={{ color: colors.warning }}>GPU tạm thời không khả dụng</Text> : null}
      {kinds.map((k) => (
        <Text key={k} testID={`quota-${k}`} style={{ color: colors.text, fontSize: 13 }}>
          {kind ? 'Miễn phí hôm nay' : KIND_LABEL[k]}: {q.data[k].used}/{q.data[k].free}
        </Text>
      ))}
    </View>
  );
}

export function Card({ children }: { children: React.ReactNode }) {
  const { colors } = useTheme();
  return <View style={{ backgroundColor: colors.cardBackground, borderColor: colors.border, borderWidth: 1, borderRadius: 14, padding: 14, marginTop: 14, gap: 10 }}>{children}</View>;
}

export function Field({ label, value, onChange, placeholder, multiline, testID }: { label: string; value: string; onChange: (v: string) => void; placeholder?: string; multiline?: boolean; testID?: string }) {
  const { colors } = useTheme();
  return (
    <View style={{ gap: 4 }}>
      <Text style={{ color: colors.textSecondary, fontSize: 12 }}>{label}</Text>
      <TextInput testID={testID} value={value} onChangeText={onChange} placeholder={placeholder} placeholderTextColor={colors.textSecondary} multiline={multiline}
        style={{ color: colors.text, backgroundColor: colors.inputBackground, borderColor: colors.border, borderWidth: 1, borderRadius: 10, padding: 10, minHeight: multiline ? 72 : 42, textAlignVertical: multiline ? 'top' : 'center' }} />
    </View>
  );
}

export function Chips<T extends string>({ value, options, onChange, testID }: { value: T; options: { value: T; label: string }[]; onChange: (v: T) => void; testID?: string }) {
  const { colors } = useTheme();
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} testID={testID} contentContainerStyle={{ gap: 8 }}>
      {options.map((o) => {
        const on = o.value === value;
        return (
          <Pressable key={o.value} onPress={() => onChange(o.value)} style={{ paddingHorizontal: 12, paddingVertical: 7, borderRadius: 999, borderWidth: 1, borderColor: on ? colors.tint : colors.border, backgroundColor: on ? colors.tint : 'transparent' }}>
            <Text style={{ color: on ? colors.tintText : colors.text, fontSize: 13 }}>{o.label}</Text>
          </Pressable>
        );
      })}
    </ScrollView>
  );
}

export const LANGS = [{ value: 'vi', label: 'Tiếng Việt' }, { value: 'en', label: 'English' }, { value: 'zh', label: '中文' }] as const;

/** Submit + poll a studio job, the same flow as the web (progress, queue position, real error text). */
export function useStudioJob(estimateSec: number) {
  const qc = useQueryClient();
  const [job, setJob] = useState<StudioJob | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [elapsed, setElapsed] = useState(0);
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);
  const stop = () => { if (timer.current) clearInterval(timer.current); timer.current = null; };
  useEffect(() => stop, []);
  async function run(submit: () => Promise<StudioSubmit>) {
    stop(); setBusy(true); setError(''); setJob(null); setElapsed(0);
    const t0 = Date.now();
    try {
      const s = await submit();
      setJob({ id: s.id, kind: 'fast', status: 'queued', position: s.position ?? null, progress: null, timings: null, error: '', free: s.free, charged: s.charged, videoUrl: null, audioUrl: null, imageUrl: null });
      timer.current = setInterval(async () => {
        setElapsed((Date.now() - t0) / 1000);
        try {
          const j = await studioApi.job(s.id);
          setJob(j);
          if (j.status === 'succeeded' || j.status === 'failed') {
            stop(); setBusy(false);
            if (j.status === 'failed') setError(j.error || 'Tạo thất bại, vui lòng thử lại.');
            void qc.invalidateQueries({ queryKey: ['studio-quota'] });
          }
        } catch { /* keep polling; the server reconciles too */ }
      }, 1500);
    } catch (e) {
      setBusy(false); setError((e as Error)?.message || 'Không gửi được yêu cầu.');
    }
  }
  const pct = job?.status === 'succeeded' ? 100 : job?.progress?.steps_total ? Math.round(((job.progress.steps_done || 0) / job.progress.steps_total) * 100) : Math.min(95, Math.round((elapsed / estimateSec) * 100));
  return { job, busy, error, run, pct, elapsed };
}

export function JobStatus({ job, busy, pct, error, elapsed }: { job: StudioJob | null; busy: boolean; pct: number; error: string; elapsed: number }) {
  const { colors } = useTheme();
  if (error) return <Text testID="studio-error" style={{ color: colors.danger }}>{error}</Text>;
  if (!job) return null;
  let label = 'Đang chờ…';
  if (job.status === 'queued') label = job.position ? `Đang xếp hàng (vị trí ${job.position})` : 'Đang xếp hàng…';
  else if (job.status === 'running') label = job.progress?.scenes ? `Đang dựng cảnh ${job.progress.scene || 1}/${job.progress.scenes}` : 'Đang tạo trên GPU RTX 5090…';
  else if (job.status === 'succeeded') label = `Xong trong ${(job.timings?.total ?? elapsed).toFixed(1)}s`;
  return (
    <View style={{ gap: 6 }} testID="studio-status">
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
        {busy ? <ActivityIndicator size="small" color={colors.tint} /> : null}
        <Text style={{ color: colors.text }}>{label}</Text>
      </View>
      {busy ? (
        <View style={{ height: 6, backgroundColor: colors.mist, borderRadius: 3, overflow: 'hidden' }}>
          <View style={{ width: `${pct}%`, height: 6, backgroundColor: colors.tint }} />
        </View>
      ) : null}
    </View>
  );
}

function useAuthed(path: string | null) {
  const [src, setSrc] = useState<{ uri: string; headers?: Record<string, string> } | null>(null);
  useEffect(() => {
    let alive = true;
    setSrc(null);
    if (path) mediaSource(path).then((s) => alive && setSrc(s)).catch(() => {});
    return () => { alive = false; };
  }, [path]);
  return src;
}

function VideoInner({ source }: { source: { uri: string; headers?: Record<string, string> } }) {
  const player = useVideoPlayer(source, (p) => { p.loop = true; p.play(); });
  return <VideoView testID="studio-video" player={player} style={{ width: '100%', aspectRatio: 16 / 9, borderRadius: 12, backgroundColor: '#000' }} nativeControls contentFit="contain" />;
}
export function ResultVideo({ path }: { path: string | null }) {
  const src = useAuthed(path);
  return src ? <VideoInner key={src.uri} source={src} /> : null;
}

function AudioInner({ source }: { source: { uri: string; headers?: Record<string, string> } }) {
  const { colors } = useTheme();
  const player = useAudioPlayer(source);
  const st = useAudioPlayerStatus(player);
  return (
    <Pressable testID="studio-audio" onPress={() => { if (st.playing) player.pause(); else { if (st.didJustFinish || st.currentTime >= st.duration) void player.seekTo(0); player.play(); } }}
      style={{ flexDirection: 'row', alignItems: 'center', gap: 10, padding: 12, borderRadius: 12, backgroundColor: colors.mist }}>
      <Text style={{ fontSize: 18 }}>{st.playing ? '⏸' : '▶️'}</Text>
      <Text style={{ color: colors.text }}>{st.playing ? 'Đang phát' : 'Nghe kết quả'} · {Math.round(st.currentTime || 0)}s / {Math.round(st.duration || 0)}s</Text>
    </Pressable>
  );
}
export function ResultAudio({ path }: { path: string | null }) {
  const src = useAuthed(path);
  return src ? <AudioInner key={src.uri} source={src} /> : null;
}

export const isWeb = Platform.OS === 'web';
