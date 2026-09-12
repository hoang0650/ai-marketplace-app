import React from 'react';
import { ActivityIndicator, Image, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Stack, useLocalSearchParams } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { workApi } from '@/api';
import { useTheme } from '@/hooks/useT';
import { useT } from '@/hooks/useT';
import { Screen } from '@/components/ui/Screen';
import { ErrorState } from '@/components/ui/ErrorState';
import { Chip } from '@/components/ui/Chip';
import { Rating } from '@/components/ui/Rating';
import { formatMoney } from '@/utils/format';
import { getErrorMessage } from '@/lib/errors';

export default function WorkTalentScreen() {
  const { slug } = useLocalSearchParams<{ slug: string }>();
  const { colors } = useTheme();
  const { t, language } = useT();
  const q = useQuery({ queryKey: ['work', 'talent', slug], queryFn: () => workApi.talent(String(slug)), enabled: !!slug });

  if (q.isLoading) {
    return (
      <Screen>
        <Stack.Screen options={{ title: t('work.nav.talents') }} />
        <ActivityIndicator color={colors.tint} style={{ marginTop: 40 }} />
      </Screen>
    );
  }
  if (q.isError || !q.data) {
    return (
      <Screen>
        <Stack.Screen options={{ title: t('work.nav.talents') }} />
        <ErrorState message={q.isError ? getErrorMessage(q.error, language) : t('work.talentNotFound')} onRetry={() => q.refetch()} />
      </Screen>
    );
  }
  const p = q.data;
  return (
    <Screen>
      <Stack.Screen options={{ title: p.name }} />
      <ScrollView contentContainerStyle={{ paddingBottom: 40 }}>
        {p.avatarUrl ? <Image source={{ uri: p.avatarUrl }} style={styles.avatar} /> : null}
        <Text style={[styles.title, { color: colors.text }]}>{p.name}</Text>
        <Text style={[styles.meta, { color: colors.textSecondary }]}>{p.title}</Text>
        <Rating value={p.rating} count={p.reviewsCount} />
        <Text style={[styles.pay, { color: colors.text }]}>
          {p.rateNegotiable || !p.rateAmount
            ? t('work.negotiable')
            : `${formatMoney(p.rateAmount, p.rateCurrency || 'VND')} / ${t('work.period.hour')}`}
        </Text>
        <Text style={[styles.meta, { color: colors.textSecondary }]}>
          {t('work.experience', { n: p.experienceYears || 0 })} · {t('work.hoursWeek', { n: p.hoursPerWeek || 0 })}
        </Text>
        <View style={styles.skills}>
          {(p.skills || []).map((s) => (
            <Chip key={s} label={s} />
          ))}
        </View>
        <Text style={[styles.body, { color: colors.text }]}>{p.bio}</Text>
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  avatar: { width: 72, height: 72, borderRadius: 36, marginTop: 8, marginBottom: 12 },
  title: { fontSize: 24, fontWeight: '700', lineHeight: 32 },
  meta: { fontSize: 14, lineHeight: 20, marginTop: 6 },
  pay: { fontSize: 16, fontWeight: '800', marginTop: 12 },
  skills: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginVertical: 16 },
  body: { fontSize: 15, lineHeight: 24 },
});
