import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useTheme } from '@/hooks/useT';

export function Badge({ label, tone = 'gold' }: { label: string; tone?: 'gold' | 'muted' | 'success' }) {
  const { colors } = useTheme();
  const bg = tone === 'gold' ? colors.tint : tone === 'success' ? colors.success : colors.mist;
  const fg = tone === 'gold' ? colors.tintText : tone === 'success' ? '#fff' : colors.text;
  return (
    <View style={[styles.badge, { backgroundColor: bg }]}>
      <Text style={[styles.text, { color: fg }]}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: { paddingHorizontal: 8, paddingVertical: 5, borderRadius: 8, alignSelf: 'flex-start' },
  text: { fontSize: 10, fontWeight: '800', letterSpacing: 0.3, lineHeight: 14, includeFontPadding: false },
});
