import React from 'react';
import { ActivityIndicator, Alert, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Stack, useRouter } from 'expo-router';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { handoffApi, type LinkedDevice } from '@/api/handoff';
import { href } from '@/lib/href';
import { useAuth } from '@/hooks/useAuth';
import { useSync } from '@/hooks/useSync';
import { useT, useTheme } from '@/hooks/useT';
import { LoginPrompt } from '@/components/ui/LoginPrompt';
import { Button } from '@/components/ui/Button';

const ICON: Record<LinkedDevice['platform'], string> = { web: '💻', ios: '📱', android: '📱', other: '🖥️' };

/** "Thiết bị đã kết nối": list + revoke the caller's own devices. */
export default function DevicesScreen() {
  const router = useRouter();
  const qc = useQueryClient();
  const { isAuthenticated } = useAuth();
  const { t } = useT();
  const { colors } = useTheme();
  const q = useQuery({ queryKey: ['handoff-devices'], queryFn: handoffApi.devices, enabled: isAuthenticated });
  useSync((e) => {
    if (e.type.startsWith('device.') || e.type === 'reset') void qc.invalidateQueries({ queryKey: ['handoff-devices'] });
  });

  const revoke = (d: LinkedDevice) =>
    Alert.alert(t('devices.revokeConfirm'), d.name, [
      { text: t('common.cancel'), style: 'cancel' },
      {
        text: t('devices.revoke'),
        style: 'destructive',
        onPress: () => void handoffApi.revoke(d.id).then(() => qc.invalidateQueries({ queryKey: ['handoff-devices'] })),
      },
    ]);

  if (!isAuthenticated) return <LoginPrompt />;
  const list = q.data?.devices || [];
  return (
    <ScrollView style={{ backgroundColor: colors.background }} contentContainerStyle={styles.wrap}>
      <Stack.Screen options={{ title: t('devices.title') }} />
      <Text style={{ color: colors.textSecondary, lineHeight: 20 }}>{t('devices.subtitle')}</Text>
      <Button title={t('handoff.app.scanTitle')} onPress={() => router.push(href('/handoff/scan'))} />
      {q.isLoading ? <ActivityIndicator /> : null}
      {!q.isLoading && !list.length ? <Text style={{ color: colors.textSecondary }}>{t('devices.empty')}</Text> : null}
      {list.map((d) => (
        <View key={d.id} style={[styles.row, { borderColor: colors.border, opacity: d.revoked ? 0.5 : 1 }]}>
          <Text style={{ fontSize: 24 }}>{ICON[d.platform] || '🖥️'}</Text>
          <View style={{ flex: 1 }}>
            <Text style={{ color: colors.text, fontWeight: '600' }}>
              {d.name}
              {d.current ? `  · ${t('devices.thisDevice')}` : ''}
            </Text>
            <Text style={{ color: colors.textSecondary, fontSize: 12 }}>
              {d.revoked ? t('devices.revoked') : `${t('devices.lastActive')}: ${new Date(d.lastActiveAt).toLocaleString()}`}
            </Text>
          </View>
          {!d.revoked && !d.current ? (
            <Pressable onPress={() => revoke(d)} hitSlop={8}>
              <Text style={{ color: '#ef4444', fontWeight: '600' }}>{t('devices.revoke')}</Text>
            </Pressable>
          ) : null}
        </View>
      ))}
      <Text style={{ color: colors.textSecondary, fontSize: 12, lineHeight: 18 }}>{t('devices.note')}</Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  wrap: { padding: 20, gap: 14 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, borderWidth: 1, borderRadius: 14, padding: 14 },
});
