import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useTheme } from '@/hooks/useT';
import { Button } from './Button';

export function EmptyState({ title, hint, cta, onPress }: { title: string; hint?: string; cta?: string; onPress?: () => void }) {
  const { colors } = useTheme();
  return (
    <View style={styles.box}>
      <Text style={[styles.title, { color: colors.text }]}>{title}</Text>
      {hint ? <Text style={[styles.hint, { color: colors.textSecondary }]}>{hint}</Text> : null}
      {cta && onPress ? <Button title={cta} onPress={onPress} style={{ marginTop: 16, alignSelf: 'center' }} /> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  box: { alignItems: 'center', paddingVertical: 48, paddingHorizontal: 24 },
  title: { fontSize: 16, fontWeight: '700', textAlign: 'center' },
  hint: { marginTop: 8, fontSize: 13, textAlign: 'center', lineHeight: 20 },
});
