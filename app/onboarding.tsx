import React, { useState } from 'react';
import { Image, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { useSettingsStore } from '@/stores/settingsStore';
import { Button } from '@/components/ui/Button';
import { useT } from '@/hooks/useT';
import { displayFont } from '@/constants/fonts';

const SLIDES = [
  { title: 'onboard.1.title', body: 'onboard.1.body' },
  { title: 'onboard.2.title', body: 'onboard.2.body' },
  { title: 'onboard.3.title', body: 'onboard.3.body' },
];

export default function OnboardingScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { t } = useT();
  const setOnboarded = useSettingsStore((s) => s.setOnboarded);
  const [i, setI] = useState(0);
  const last = i === SLIDES.length - 1;

  return (
    <LinearGradient colors={['#111111', '#2a2520']} style={{ flex: 1, paddingTop: insets.top + 40, paddingHorizontal: 24, paddingBottom: insets.bottom + 24 }}>
      <Image source={require('@/assets/images/mark.png')} style={{ width: 72, height: 72, borderRadius: 16, marginBottom: 24 }} />
      <Text style={{ color: '#c9a961', fontFamily: displayFont, fontSize: 18 }}>AI Markets</Text>
      <Text style={{ color: '#f2efe8', fontSize: 32, fontWeight: '700', marginTop: 16 }}>{t(SLIDES[i].title)}</Text>
      <Text style={{ color: 'rgba(245,240,232,0.75)', fontSize: 16, lineHeight: 24, marginTop: 12 }}>{t(SLIDES[i].body)}</Text>
      <View style={{ flexDirection: 'row', gap: 8, marginTop: 28 }}>
        {SLIDES.map((_, idx) => (
          <View key={idx} style={{ width: idx === i ? 22 : 8, height: 8, borderRadius: 4, backgroundColor: idx === i ? '#c9a961' : 'rgba(255,255,255,0.25)' }} />
        ))}
      </View>
      <View style={{ marginTop: 'auto' }}>
        <Button
          title={last ? t('common.getStarted') : t('common.next')}
          onPress={async () => {
            if (!last) {
              setI((n) => n + 1);
              return;
            }
            await setOnboarded(true);
            router.replace('/(tabs)');
          }}
        />
      </View>
    </LinearGradient>
  );
}
