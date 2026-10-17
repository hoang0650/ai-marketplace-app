import React from 'react';
import { Pressable, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useTheme } from '@/hooks/useT';
import { StudioScreen } from '@/components/studio/kit';

const ITEMS = [
  { href: '/studio/film', icon: '🎬', title: 'Làm phim AI', desc: 'Viết từng cảnh và lời dẫn — ComfyUI dựng hình, chuyển động và lồng tiếng thành phim ngắn.' },
  { href: '/studio/video', icon: '⚡', title: 'Video nhanh', desc: 'Chữ → video hoặc ảnh → video (Flux.1 schnell, Wan2.2, RIFE 30fps).' },
  { href: '/studio/talking', icon: '🗣️', title: 'Avatar nói', desc: 'Ảnh chân dung + lời thoại → video nhép miệng (JoyVASA/LivePortrait).' },
  { href: '/studio/voice', icon: '🎙️', title: 'Giọng nói VieNeu', desc: 'Giọng có sẵn hoặc nhân bản giọng từ 6–15 giây mẫu.' },
  { href: '/studio/training', icon: '🧠', title: 'Huấn luyện trên RTX 5090', desc: 'Chạy job huấn luyện trên GPU 5090 dùng chung của AI Markets.' },
];

export default function StudioHub() {
  const { colors } = useTheme();
  const router = useRouter();
  return (
    <StudioScreen title="AI Studio" subtitle="Tạo phim, video, avatar và giọng nói trên GPU RTX 5090 của AI Markets." testID="studio-hub">
      <View style={{ gap: 10, marginTop: 16 }}>
        {ITEMS.map((it) => (
          <Pressable key={it.href} testID={`hub-${it.href.split('/').pop()}`} onPress={() => router.push(it.href as never)}
            style={{ flexDirection: 'row', gap: 12, padding: 14, borderRadius: 14, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.cardBackground }}>
            <Text style={{ fontSize: 26 }}>{it.icon}</Text>
            <View style={{ flex: 1 }}>
              <Text style={{ color: colors.text, fontWeight: '700', fontSize: 16 }}>{it.title}</Text>
              <Text style={{ color: colors.textSecondary, marginTop: 2, lineHeight: 18 }}>{it.desc}</Text>
            </View>
          </Pressable>
        ))}
      </View>
    </StudioScreen>
  );
}
