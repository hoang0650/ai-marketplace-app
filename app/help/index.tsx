import React from 'react';
import { Pressable, Text } from 'react-native';
import { useRouter } from 'expo-router';
import { href } from '@/lib/href';
import { useTheme } from '@/hooks/useT';
import { useT } from '@/hooks/useT';
import { Screen } from '@/components/ui/Screen';

export default function HelpScreen() {
  const router = useRouter();
  const { colors } = useTheme();
  const { t } = useT();
  return (
    <Screen>
      <Text style={{ color: colors.text, fontSize: 24, fontWeight: '700', marginBottom: 16 }}>{t('profile.help')}</Text>
      <Pressable onPress={() => router.push(href('/legal'))} style={{ paddingVertical: 16, minHeight: 48 }}>
        <Text style={{ color: colors.text }}>{t('legal.hub.title')}</Text>
      </Pressable>
      <Pressable onPress={() => router.push('/complaint/create')} style={{ paddingVertical: 16, minHeight: 48 }}>
        <Text style={{ color: colors.text }}>{t('help.contact')}</Text>
      </Pressable>
      <Pressable onPress={() => router.push(href('/protection'))} style={{ paddingVertical: 16, minHeight: 48 }}>
        <Text style={{ color: colors.text }}>{t('profile.protection')}</Text>
      </Pressable>
      <Text style={{ color: colors.textSecondary, marginTop: 24 }}>{t('sub.empty')}</Text>
    </Screen>
  );
}
