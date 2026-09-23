import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Briefcase, Users } from 'lucide-react-native';
import { useRouter } from 'expo-router';
import type { WorkJob, WorkTalent } from '@/api/types';
import { href } from '@/lib/href';
import { useTheme } from '@/hooks/useT';
import { useT } from '@/hooks/useT';
import { formatJobPay, formatMoney } from '@/utils/format';

export function WorkJobCard({ item }: { item: WorkJob }) {
  const router = useRouter();
  const { colors } = useTheme();
  const { t } = useT();
  return (
    <Pressable
      onPress={() => router.push(href(`/work/job/${item.slug}`))}
      style={({ pressed }) => [
        styles.card,
        { backgroundColor: colors.cardBackground, borderColor: colors.border, opacity: pressed ? 0.9 : 1 },
      ]}
    >
      <View style={styles.cardIcon}>
        <Briefcase size={18} color={colors.text} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={[styles.cardTitle, { color: colors.text }]} numberOfLines={2}>
          {item.title}
        </Text>
        <Text style={[styles.cardMeta, { color: colors.textSecondary }]} numberOfLines={1}>
          {item.company} · {item.remote ? t('work.remote') : item.location || t('work.onsite')}
        </Text>
        <Text style={[styles.cardPay, { color: colors.text }]}>{formatJobPay(item, t)}</Text>
      </View>
    </Pressable>
  );
}

export function WorkTalentCard({ item }: { item: WorkTalent }) {
  const router = useRouter();
  const { colors } = useTheme();
  const { t } = useT();
  return (
    <Pressable
      onPress={() => router.push(href(`/work/talent/${item.slug}`))}
      style={({ pressed }) => [
        styles.card,
        { backgroundColor: colors.cardBackground, borderColor: colors.border, opacity: pressed ? 0.9 : 1 },
      ]}
    >
      <View style={styles.cardIcon}>
        <Users size={18} color={colors.text} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={[styles.cardTitle, { color: colors.text }]} numberOfLines={2}>
          {item.name}
        </Text>
        <Text style={[styles.cardMeta, { color: colors.textSecondary }]} numberOfLines={1}>
          {item.title}
        </Text>
        <Text style={[styles.cardPay, { color: colors.text }]}>
          {item.rateNegotiable || !item.rateAmount
            ? t('work.negotiable')
            : `${formatMoney(item.rateAmount, item.rateCurrency || 'VND')} / ${t('work.period.hour')}`}
        </Text>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    gap: 12,
    borderWidth: 1,
    borderRadius: 16,
    padding: 14,
    marginBottom: 10,
    minHeight: 88,
    alignItems: 'center',
  },
  cardIcon: {
    width: 40,
    height: 40,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(201,169,97,0.16)',
  },
  cardTitle: { fontSize: 15, fontWeight: '700', lineHeight: 20 },
  cardMeta: { fontSize: 13, marginTop: 4, lineHeight: 18 },
  cardPay: { fontSize: 13, fontWeight: '700', marginTop: 6 },
});
