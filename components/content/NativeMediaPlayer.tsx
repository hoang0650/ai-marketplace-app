import React, { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useAudioPlayer, useAudioPlayerStatus } from 'expo-audio';
import { useVideoPlayer, VideoView } from 'expo-video';
import type { ContentType, StatusChangeEventPayload } from 'expo-video';
import { useTheme } from '@/hooks/useT';
import { useT } from '@/hooks/useT';

type Props = {
  uri: string;
  kind: string;
  mime?: string;
  onError?: () => void;
  /** Licensed film / story — no PiP or Live Text frame grab. */
  protect?: boolean;
};

export function NativeMediaPlayer({ uri, kind, mime, onError, protect }: Props) {
  if (kind === 'audio') return <NativeAudio uri={uri} onError={onError} />;
  if (kind === 'text') return <NativeTextChapter uri={uri} onError={onError} />;
  return <NativeVideo uri={uri} mime={mime} onError={onError} protect={protect} />;
}

function videoContentType(mime?: string): ContentType {
  const m = String(mime || '').toLowerCase();
  if (m.includes('mpegurl') || m.includes('vnd.apple') || m.includes('m3u8')) return 'hls';
  if (m.includes('dash') || m.includes('mpd')) return 'dash';
  return 'progressive';
}

function NativeVideo({
  uri,
  mime,
  onError,
  protect,
}: {
  uri: string;
  mime?: string;
  onError?: () => void;
  protect?: boolean;
}) {
  const player = useVideoPlayer({ uri, contentType: videoContentType(mime) }, (p) => {
    p.loop = false;
    p.play();
  });

  useEffect(() => {
    const sub = player.addListener('statusChange', (payload: StatusChangeEventPayload) => {
      if (payload.status === 'error') onError?.();
    });
    return () => sub.remove();
  }, [player, onError]);

  return (
    <VideoView
      player={player}
      style={styles.video}
      contentFit="contain"
      nativeControls
      fullscreenOptions={{ enable: true }}
      allowsPictureInPicture={!protect}
      startsPictureInPictureAutomatically={false}
      allowsVideoFrameAnalysis={!protect}
    />
  );
}

function NativeAudio({ uri, onError }: { uri: string; onError?: () => void }) {
  const { colors } = useTheme();
  const { t } = useT();
  const player = useAudioPlayer({ uri }, { downloadFirst: true });
  const status = useAudioPlayerStatus(player);

  useEffect(() => {
    try {
      player.play();
    } catch {
      onError?.();
    }
  }, [player, onError]);

  return (
    <View style={[styles.audio, { backgroundColor: colors.luxDark }]}>
      <Pressable
        onPress={() => (status.playing ? player.pause() : player.play())}
        style={styles.audioBtn}
      >
        <Text style={styles.audioBtnText}>{status.playing ? t('content.pause') : t('content.playInApp')}</Text>
      </Pressable>
      <Text style={styles.audioMeta}>
        {formatClock(status.currentTime)} / {formatClock(status.duration)}
      </Text>
    </View>
  );
}

function NativeTextChapter({ uri, onError }: { uri: string; onError?: () => void }) {
  const { colors } = useTheme();
  const [body, setBody] = useState('');

  useEffect(() => {
    let cancelled = false;
    setBody('');
    fetch(uri)
      .then(async (res) => {
        if (!res.ok) throw new Error('text');
        const raw = await res.text();
        const stripped = raw
          .replace(/<script[\s\S]*?<\/script>/gi, '')
          .replace(/<style[\s\S]*?<\/style>/gi, '')
          .replace(/<[^>]+>/g, ' ')
          .replace(/\s+/g, ' ')
          .trim();
        if (!cancelled) setBody(stripped);
      })
      .catch(() => {
        if (!cancelled) onError?.();
      });
    return () => {
      cancelled = true;
    };
  }, [uri, onError]);

  return (
    <View style={[styles.textWrap, { backgroundColor: colors.cardBackground, borderColor: colors.border }]}>
      <Text style={{ color: colors.text, lineHeight: 24 }}>{body}</Text>
    </View>
  );
}

function formatClock(sec?: number) {
  const n = Math.max(0, Math.floor(Number(sec) || 0));
  const m = Math.floor(n / 60);
  const s = n % 60;
  return `${m}:${String(s).padStart(2, '0')}`;
}

const styles = StyleSheet.create({
  video: {
    width: '100%',
    aspectRatio: 16 / 9,
    borderRadius: 12,
    backgroundColor: '#111',
    marginBottom: 12,
  },
  audio: {
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    alignItems: 'center',
    gap: 10,
  },
  audioBtn: {
    minHeight: 48,
    paddingHorizontal: 20,
    justifyContent: 'center',
  },
  audioBtnText: {
    color: '#f2efe8',
    fontWeight: '800',
    letterSpacing: 0.4,
  },
  audioMeta: {
    color: 'rgba(242,239,232,0.7)',
    fontVariant: ['tabular-nums'],
  },
  textWrap: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 14,
    marginBottom: 12,
    minHeight: 160,
  },
});
