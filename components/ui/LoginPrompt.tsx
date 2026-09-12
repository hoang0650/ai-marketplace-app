import React from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useTheme } from '@/hooks/useT';
import { useT } from '@/hooks/useT';
import { BrandMark } from '@/components/BrandMark';
import { Button } from './Button';
import { EmptyState } from './EmptyState';

export function LoginPrompt() {
  const router = useRouter();
  const { colors } = useTheme();
  const { t } = useT();
  return (
    <View style={{ flex: 1, backgroundColor: colors.background, alignItems: 'center', justifyContent: 'center', padding: 24 }}>
      <BrandMark color={colors.text} size={52} />
      <EmptyState title={t('orders.loginHint')} />
      <Button title={t('auth.login')} onPress={() => router.push('/auth/login')} style={{ minWidth: 200 }} />
    </View>
  );
}

export function IconHit({ children, onPress, label }: { children: React.ReactNode; onPress: () => void; label: string }) {
  return (
    <Pressable onPress={onPress} accessibilityLabel={label} hitSlop={8} style={styles.hit}>
      {children}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  hit: { minWidth: 44, minHeight: 44, alignItems: 'center', justifyContent: 'center' },
});
