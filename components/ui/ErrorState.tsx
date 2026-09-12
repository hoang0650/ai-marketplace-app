import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useTheme, useT } from '@/hooks/useT';
import { Button } from './Button';

export function ErrorState({ message, onRetry }: { message?: string; onRetry?: () => void }) {
  const { colors } = useTheme();
  const { t } = useT();
  return (
    <View style={styles.box}>
      <Text style={[styles.title, { color: colors.text }]}>{t('common.error')}</Text>
      {message ? <Text style={[styles.hint, { color: colors.textSecondary }]}>{message}</Text> : null}
      {onRetry ? <Button title={t('common.retry')} onPress={onRetry} style={{ marginTop: 16 }} /> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  box: { alignItems: 'center', paddingVertical: 40, paddingHorizontal: 24 },
  title: { fontSize: 16, fontWeight: '700' },
  hint: { marginTop: 8, textAlign: 'center' },
});
