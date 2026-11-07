import React from 'react';
import { Pressable, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useT, useTheme } from '@/hooks/useT';
import { StudioScreen } from '@/components/studio/kit';

const ITEMS = [
  { href: '/studio/film', icon: '🎬', title: 'studio.hub.film.title', desc: 'studio.hub.film.desc' },
  { href: '/studio/video', icon: '⚡', title: 'studio.hub.fast.title', desc: 'studio.hub.fast.desc' },
  { href: '/studio/talking', icon: '🗣️', title: 'studio.hub.talking.title', desc: 'studio.hub.talking.desc' },
  { href: '/studio/voice', icon: '🎙️', title: 'studio.hub.voice.title', desc: 'studio.hub.voice.desc' },
  { href: '/studio/training', icon: '🧠', title: 'studio.hub.training.title', desc: 'studio.hub.training.desc' },
];

export default function StudioHub() {
  const { colors } = useTheme();
  const { t } = useT();
  const router = useRouter();
  return (
    <StudioScreen title={t('studio.hub.title')} subtitle={t('studio.hub.subtitle')} testID="studio-hub">
      <View style={{ gap: 10, marginTop: 16 }}>
        {ITEMS.map((it) => (
          <Pressable key={it.href} testID={`hub-${it.href.split('/').pop()}`} onPress={() => router.push(it.href as never)}
            style={{ flexDirection: 'row', gap: 12, padding: 14, borderRadius: 14, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.cardBackground }}>
            <Text style={{ fontSize: 26 }}>{it.icon}</Text>
            <View style={{ flex: 1 }}>
              <Text style={{ color: colors.text, fontWeight: '700', fontSize: 16 }}>{t(it.title)}</Text>
              <Text style={{ color: colors.textSecondary, marginTop: 2, lineHeight: 18 }}>{t(it.desc)}</Text>
            </View>
          </Pressable>
        ))}
      </View>
    </StudioScreen>
  );
}
