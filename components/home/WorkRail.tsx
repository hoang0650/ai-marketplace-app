import React from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Briefcase } from 'lucide-react-native';
import { useRouter } from 'expo-router';
import type { WorkJob } from '@/api/types';
import { href } from '@/lib/href';
import { useTheme } from '@/hooks/useT';
import { useT } from '@/hooks/useT';
import { formatJobPay } from '@/utils/format';

export function WorkRail({ items }: { items: WorkJob[] }) {
  const router = useRouter();
  const { colors } = useTheme();
  const { t } = useT();

  if (!items.length) return null;

  return (
    <ScrollView horizontal nestedScrollEnabled showsHorizontalScrollIndicator={false} contentContainerStyle={styles.rail}>
      {items.map((job) => (
        <Pressable
          key={job.id}
          onPress={() => router.push(href(`/work/job/${job.slug}`))}
          style={({ pressed }) => [
            styles.card,
            { backgroundColor: colors.cardBackground, borderColor: colors.border, opacity: pressed ? 0.9 : 1 },
          ]}
        >
          <View style={[styles.icon, { backgroundColor: colors.mist }]}>
            <Briefcase size={18} color={colors.tint} />
          </View>
          <Text style={[styles.title, { color: colors.text }]} numberOfLines={2}>
            {job.title}
          </Text>
          <Text style={[styles.meta, { color: colors.textSecondary }]} numberOfLines={1}>
            {job.company}
          </Text>
          <Text style={[styles.pay, { color: colors.text }]} numberOfLines={1}>
            {formatJobPay(job, t)}
          </Text>
        </Pressable>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  rail: { gap: 10, paddingRight: 8 },
  card: {
    width: 168,
    borderWidth: 1,
    borderRadius: 14,
    padding: 12,
    gap: 6,
  },
  icon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 2,
  },
  title: { fontSize: 14, fontWeight: '700', lineHeight: 18, minHeight: 36 },
  meta: { fontSize: 12 },
  pay: { fontSize: 12, fontWeight: '700', marginTop: 2 },
});
