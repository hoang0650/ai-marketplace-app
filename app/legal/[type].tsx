import React from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { loadLegalPolicy, parseLegalDocMeta } from '@/api/legalCms';
import { href } from '@/lib/href';
import { useTheme } from '@/hooks/useT';
import { useT } from '@/hooks/useT';
import { Screen } from '@/components/ui/Screen';
import { ErrorState } from '@/components/ui/ErrorState';
import { LegalMarkdown } from '@/components/LegalMarkdown';
import { neighborsOf, resolveLegalPolicy } from '@/constants/legal';

export default function LegalDocumentScreen() {
  const { type } = useLocalSearchParams<{ type: string }>();
  const raw = String(Array.isArray(type) ? type[0] : type || '');
  const meta = resolveLegalPolicy(raw);
  const router = useRouter();
  const { colors } = useTheme();
  const { t } = useT();
  const q = useQuery({
    queryKey: ['legal-cms', meta?.file],
    queryFn: () => loadLegalPolicy(raw),
    enabled: !!meta,
  });

  const title = meta ? t(`legal.policy.${meta.slug}.title`) : t('legal.hub.title');
  const summary = meta ? t(`legal.policy.${meta.slug}.summary`) : '';
  const nav = meta ? neighborsOf(meta.slug) : {};

  if (!meta) {
    return (
      <Screen>
        <Stack.Screen options={{ title: t('legal.doc.notFoundTitle') }} />
        <ErrorState message={t('legal.doc.notFound')} onRetry={() => router.replace(href('/legal'))} />
      </Screen>
    );
  }

  if (q.isLoading) {
    return (
      <Screen>
        <Stack.Screen options={{ title }} />
        <View style={styles.center}>
          <ActivityIndicator color={colors.tint} />
          <Text style={{ color: colors.textSecondary, marginTop: 12 }}>{t('legal.doc.loading')}</Text>
        </View>
      </Screen>
    );
  }

  if (q.isError || !q.data) {
    return (
      <Screen>
        <Stack.Screen options={{ title: t('legal.doc.notFoundTitle') }} />
        <ErrorState message={t('legal.doc.notFound')} onRetry={() => q.refetch()} />
      </Screen>
    );
  }

  const extracted = parseLegalDocMeta(q.data.markdown);
  const metaLine = [extracted.version ? `${t('legal.version')} ${extracted.version}` : null, extracted.effective ? `${t('legal.effective')} ${extracted.effective}` : null]
    .filter(Boolean)
    .join(' · ');

  return (
    <Screen>
      <Stack.Screen options={{ title }} />
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <Text style={[styles.crumb, { color: colors.textSecondary }]}>
          {t('legal.doc.crumb')} / {t(`legal.group.${meta.group}`)}
        </Text>
        <Text style={[styles.title, { color: colors.text }]}>{title}</Text>
        <Text style={[styles.summary, { color: colors.textSecondary }]}>{summary}</Text>
        {metaLine ? <Text style={[styles.meta, { color: colors.textSecondary }]}>{metaLine}</Text> : null}
        <LegalMarkdown content={q.data.markdown} colors={colors} />

        <View style={styles.pager}>
          {nav.prev ? (
            <Pressable onPress={() => router.replace(href(`/legal/${nav.prev!.slug}`))} style={[styles.pageBtn, { borderColor: colors.border }]}>
              <Text style={{ color: colors.textSecondary, fontSize: 12 }}>{t('legal.doc.prev')}</Text>
              <Text style={{ color: colors.text, fontWeight: '700', marginTop: 4 }}>{t(`legal.policy.${nav.prev.slug}.title`)}</Text>
            </Pressable>
          ) : (
            <View style={{ flex: 1 }} />
          )}
          {nav.next ? (
            <Pressable onPress={() => router.replace(href(`/legal/${nav.next!.slug}`))} style={[styles.pageBtn, { borderColor: colors.border }]}>
              <Text style={{ color: colors.textSecondary, fontSize: 12, textAlign: 'right' }}>{t('legal.doc.next')}</Text>
              <Text style={{ color: colors.text, fontWeight: '700', marginTop: 4, textAlign: 'right' }}>{t(`legal.policy.${nav.next.slug}.title`)}</Text>
            </Pressable>
          ) : (
            <View style={{ flex: 1 }} />
          )}
        </View>
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  scroll: { paddingTop: 4, paddingBottom: 48, paddingHorizontal: 4 },
  crumb: { fontSize: 12, marginBottom: 10 },
  title: { fontSize: 24, fontWeight: '700', lineHeight: 32, includeFontPadding: false },
  summary: { fontSize: 15, lineHeight: 22, marginTop: 8 },
  meta: { fontSize: 13, lineHeight: 18, marginTop: 8, marginBottom: 16 },
  pager: { flexDirection: 'row', gap: 10, marginTop: 28 },
  pageBtn: { flex: 1, borderWidth: 1, borderRadius: 12, padding: 12, minHeight: 72 },
});

