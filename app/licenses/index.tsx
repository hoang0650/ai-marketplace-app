import React from 'react';
import { ActivityIndicator, FlatList, RefreshControl, StyleSheet, Text, View } from 'react-native';
import { Stack } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { licensesApi } from '@/api';
import type { IssuedLicense } from '@/api/types';
import { useAuth } from '@/hooks/useAuth';
import { useTheme } from '@/hooks/useT';
import { useT } from '@/hooks/useT';
import { Screen } from '@/components/ui/Screen';
import { EmptyState } from '@/components/ui/EmptyState';
import { ErrorState } from '@/components/ui/ErrorState';
import { LoginPrompt } from '@/components/ui/LoginPrompt';
import { formatDate } from '@/utils/format';
import { getErrorMessage } from '@/lib/errors';

export default function LicensesScreen() {
  const { isAuthenticated } = useAuth();
  const { colors } = useTheme();
  const { t, language } = useT();
  const q = useQuery({ queryKey: ['licenses'], queryFn: licensesApi.me, enabled: isAuthenticated });

  if (!isAuthenticated) {
    return (
      <Screen>
        <Stack.Screen options={{ title: t('license.mine') }} />
        <LoginPrompt />
      </Screen>
    );
  }

  return (
    <Screen>
      <Stack.Screen options={{ title: t('license.mine') }} />
      {q.isLoading ? (
        <ActivityIndicator color={colors.tint} style={{ marginTop: 40 }} />
      ) : q.isError ? (
        <ErrorState message={getErrorMessage(q.error, language)} onRetry={() => q.refetch()} />
      ) : (
        <FlatList
          data={q.data || []}
          keyExtractor={(item) => item.id || item.licenseKey}
          contentContainerStyle={{ paddingBottom: 32 }}
          refreshControl={<RefreshControl refreshing={q.isRefetching} onRefresh={() => q.refetch()} tintColor={colors.tint} />}
          ListEmptyComponent={<EmptyState title={t('license.empty')} hint={t('license.emptyHint')} />}
          renderItem={({ item }: { item: IssuedLicense }) => (
            <View style={[styles.card, { backgroundColor: colors.cardBackground, borderColor: colors.border }]}>
              <Text style={[styles.name, { color: colors.text }]}>{item.productName || t('license.key')}</Text>
              <Text style={[styles.key, { color: colors.text }]}>{item.licenseKey}</Text>
              <Text style={{ color: colors.textSecondary, marginTop: 8 }}>
                {item.term ? t(`license.term.${item.term}`) : ''}
                {item.expiresAt ? ` · ${t('license.expires', { date: formatDate(item.expiresAt, language) })}` : ''}
              </Text>
              <Text style={{ color: colors.textSecondary, marginTop: 8, fontWeight: '700' }}>
                {t(`license.status.${item.status || 'active'}`)}
              </Text>
            </View>
          )}
        />
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  card: { borderWidth: 1, borderRadius: 16, padding: 16, marginBottom: 10 },
  name: { fontSize: 15, fontWeight: '700' },
  key: { fontSize: 16, fontWeight: '800', marginTop: 8, letterSpacing: 0.4 },
});
