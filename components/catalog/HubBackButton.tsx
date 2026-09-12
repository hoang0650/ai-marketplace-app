import React from 'react';
import { Pressable, StyleSheet, Text } from 'react-native';
import { ChevronLeft } from 'lucide-react-native';
import { useRouter } from 'expo-router';
import { useTheme } from '@/hooks/useT';
import { useT } from '@/hooks/useT';

export function HubBackButton() {
  const router = useRouter();
  const { colors } = useTheme();
  const { t } = useT();

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={t('hub.backHome')}
      onPress={() => router.replace('/(tabs)')}
      hitSlop={8}
      style={styles.headerBtn}
    >
      <ChevronLeft size={22} color={colors.text} />
      <Text style={[styles.headerLabel, { color: colors.text }]}>{t('nav.home')}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  headerBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: 44,
    paddingRight: 8,
    marginLeft: -6,
  },
  headerLabel: { fontSize: 15, fontWeight: '700' },
});
