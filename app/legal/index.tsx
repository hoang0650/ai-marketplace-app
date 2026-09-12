import React, { useMemo, useState } from 'react';
import { Linking, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Stack, useRouter } from 'expo-router';
import { href } from '@/lib/href';
import { useTheme } from '@/hooks/useT';
import { useT } from '@/hooks/useT';
import { Screen } from '@/components/ui/Screen';
import { SearchBar } from '@/components/ui/SearchBar';
import { Chip } from '@/components/ui/Chip';
import { displayFont } from '@/constants/fonts';
import { LEGAL_POLICIES, LEGAL_POLICY_GROUPS, LEGAL_QUICK_SLUGS, type LegalPolicyMeta } from '@/constants/legal';

export default function LegalIndexScreen() {
  const router = useRouter();
  const { colors } = useTheme();
  const { t } = useT();
  const [query, setQuery] = useState('');

  const titleOf = (p: LegalPolicyMeta) => t(`legal.policy.${p.slug}.title`);
  const summaryOf = (p: LegalPolicyMeta) => t(`legal.policy.${p.slug}.summary`);

  const quick = LEGAL_QUICK_SLUGS.map((slug) => LEGAL_POLICIES.find((p) => p.slug === slug)).filter(
    (p): p is LegalPolicyMeta => !!p,
  );

  const grouped = useMemo(() => {
    const q = query.trim().toLowerCase();
    return LEGAL_POLICY_GROUPS.map((g) => ({
      id: g.id,
      items: LEGAL_POLICIES.filter((p) => {
        if (p.group !== g.id) return false;
        if (!q) return true;
        return (
          titleOf(p).toLowerCase().includes(q) ||
          summaryOf(p).toLowerCase().includes(q) ||
          p.title.toLowerCase().includes(q) ||
          p.summary.toLowerCase().includes(q) ||
          p.slug.includes(q)
        );
      }),
    })).filter((g) => g.items.length);
  }, [query, t]);

  const hasResults = grouped.some((g) => g.items.length > 0);

  return (
    <Screen>
      <Stack.Screen options={{ title: t('legal.hub.title') }} />
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
        <Text style={[styles.eyebrow, { color: colors.tint }]}>{t('legal.hub.eyebrow')}</Text>
        <Text style={[styles.h1, { color: colors.text }]}>{t('legal.hub.title')}</Text>
        <Text style={[styles.lead, { color: colors.textSecondary }]}>{t('legal.hub.lead')}</Text>

        <View style={{ marginTop: 16, marginBottom: 14 }}>
          <SearchBar placeholder={t('legal.hub.searchPh')} value={query} onChangeText={setQuery} />
        </View>

        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.quick} style={styles.quickRow}>
          {quick.map((p) => (
            <Chip key={p.slug} label={titleOf(p)} onPress={() => router.push(href(`/legal/${p.slug}`))} />
          ))}
        </ScrollView>

        {grouped.map((g) => (
          <View key={g.id} style={{ marginTop: 8 }}>
            <View style={styles.groupHead}>
              <Text style={[styles.section, { color: colors.textSecondary }]}>{t(`legal.group.${g.id}`)}</Text>
              <Text style={{ color: colors.textSecondary, fontWeight: '700' }}>{g.items.length}</Text>
            </View>
            <View style={[styles.card, { backgroundColor: colors.cardBackground, borderColor: colors.border }]}>
              {g.items.map((doc, i) => (
                <Pressable
                  key={doc.slug}
                  onPress={() => router.push(href(`/legal/${doc.slug}`))}
                  style={({ pressed }) => [
                    styles.doc,
                    i < g.items.length - 1 && { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.border },
                    { opacity: pressed ? 0.75 : 1 },
                  ]}
                >
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.docTitle, { color: colors.text }]}>{titleOf(doc)}</Text>
                    <Text style={[styles.docSummary, { color: colors.textSecondary }]}>{summaryOf(doc)}</Text>
                  </View>
                  <Text style={{ color: colors.tint, fontWeight: '800' }}>→</Text>
                </Pressable>
              ))}
            </View>
          </View>
        ))}

        {query.trim() && !hasResults ? (
          <Text style={[styles.empty, { color: colors.textSecondary }]}>{t('legal.hub.empty', { q: query.trim() })}</Text>
        ) : null}

        <View style={[styles.contact, { backgroundColor: colors.cardBackground, borderColor: colors.border }]}>
          <Text style={[styles.contactTitle, { color: colors.text }]}>{t('legal.hub.contactTitle')}</Text>
          <Text style={[styles.contactBody, { color: colors.textSecondary }]}>{t('legal.hub.operator')}</Text>
          <Pressable onPress={() => Linking.openURL('mailto:support@aimarkets.vn')} style={{ marginTop: 12, minHeight: 44, justifyContent: 'center' }}>
            <Text style={{ color: colors.tint, fontWeight: '800' }}>support@aimarkets.vn</Text>
          </Pressable>
        </View>
        <Text style={[styles.note, { color: colors.textSecondary }]}>{t('legal.hub.note')}</Text>
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  scroll: { paddingBottom: 48, paddingTop: 4 },
  eyebrow: { fontSize: 12, fontWeight: '800', letterSpacing: 0.5, textTransform: 'uppercase' },
  h1: { fontSize: 28, fontFamily: displayFont, fontWeight: '600', marginTop: 8, lineHeight: 34 },
  lead: { fontSize: 15, lineHeight: 22, marginTop: 10 },
  quickRow: { flexGrow: 0, flexShrink: 0, minHeight: 56, marginBottom: 8 },
  quick: { gap: 8, paddingRight: 8, paddingVertical: 6, alignItems: 'center' },
  groupHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8, paddingHorizontal: 4 },
  section: { fontSize: 12, fontWeight: '800', letterSpacing: 0.6, textTransform: 'uppercase' },
  card: { borderWidth: 1, borderRadius: 16, overflow: 'hidden', marginBottom: 16 },
  doc: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 16, paddingVertical: 14, minHeight: 72 },
  docTitle: { fontSize: 15, fontWeight: '700', lineHeight: 20, includeFontPadding: false },
  docSummary: { fontSize: 13, lineHeight: 18, marginTop: 4, includeFontPadding: false },
  empty: { textAlign: 'center', marginVertical: 24 },
  contact: { borderWidth: 1, borderRadius: 16, padding: 16, marginTop: 8 },
  contactTitle: { fontSize: 16, fontWeight: '700', marginBottom: 8 },
  contactBody: { fontSize: 14, lineHeight: 22 },
  note: { fontSize: 12, lineHeight: 18, marginTop: 16, paddingHorizontal: 4 },
});
