import React from 'react';
import { Pressable, Text } from 'react-native';
import { useRouter } from 'expo-router';
import { href } from '@/lib/href';
import { useTheme } from '@/hooks/useT';
import { useT } from '@/hooks/useT';
import { Screen } from '@/components/ui/Screen';

export default function ProtectionScreen() {
  const router = useRouter();
  const { colors } = useTheme();
  const { t } = useT();
  const rows = [
    { label: t('protection.complaints'), href: '/complaint/create' as const, extra: () => router.push('/(tabs)/messages') },
    { label: t('protection.disputes'), href: '/(tabs)/orders' as const },
    { label: t('protection.refunds'), href: '/(tabs)/orders' as const },
    { label: t('protection.docs'), href: '/(tabs)/orders' as const },
    { label: t('protection.reviews'), href: '/(tabs)/orders' as const },
    { label: t('protection.policy'), href: '/legal/chinh-sach-nguoi-mua' as const },
  ];
  return (
    <Screen>
      <Text style={{ color: colors.text, fontSize: 24, fontWeight: '700', marginTop: 8, marginBottom: 16 }}>{t('protection.title')}</Text>
      <Text style={{ color: colors.textSecondary, marginBottom: 16 }}>{t('protection.rights')}</Text>
      {rows.map((r) => (
        <Pressable
          key={r.label}
          onPress={() => router.push(href(r.href))}
          style={{ paddingVertical: 16, borderBottomWidth: 1, borderColor: colors.border, minHeight: 48 }}
        >
          <Text style={{ color: colors.text, fontWeight: '600' }}>{r.label}</Text>
        </Pressable>
      ))}
      <Pressable onPress={() => router.push(href('/complaint/create'))} style={{ marginTop: 20 }}>
        <Text style={{ color: colors.tint, fontWeight: '800' }}>{t('complaint.create')}</Text>
      </Pressable>
    </Screen>
  );
}
