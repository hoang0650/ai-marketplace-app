import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Stack, useRouter } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { Briefcase, Users } from 'lucide-react-native';
import { workApi } from '@/api';
import { href } from '@/lib/href';
import { useAuth } from '@/hooks/useAuth';
import { useTheme } from '@/hooks/useT';
import { useT } from '@/hooks/useT';
import { Screen } from '@/components/ui/Screen';
import { Button } from '@/components/ui/Button';
import { LoginPrompt } from '@/components/ui/LoginPrompt';
import { displayFont } from '@/constants/fonts';

export default function WorkManageScreen() {
  const router = useRouter();
  const { colors } = useTheme();
  const { t } = useT();
  const { isAuthenticated } = useAuth();

  const jobs = useQuery({
    queryKey: ['work', 'jobs', 'manage'],
    queryFn: () => workApi.jobs(),
    enabled: isAuthenticated,
  });
  const talents = useQuery({
    queryKey: ['work', 'talents', 'manage'],
    queryFn: () => workApi.talents(),
    enabled: isAuthenticated,
  });

  if (!isAuthenticated) {
    return (
      <Screen>
        <Stack.Screen options={{ title: t('work.nav.dashboard') }} />
        <LoginPrompt />
      </Screen>
    );
  }

  const jobCount = jobs.data?.length ?? 0;
  const talentCount = talents.data?.length ?? 0;

  return (
    <Screen>
      <Stack.Screen options={{ title: t('work.nav.dashboard') }} />
      <Text style={[styles.title, { color: colors.text }]}>{t('work.nav.dashboard')}</Text>
      <Text style={[styles.lede, { color: colors.textSecondary }]}>{t('work.nav.dashboardDesc')}</Text>

      <View style={styles.stats}>
        <View style={[styles.stat, { backgroundColor: colors.cardBackground, borderColor: colors.border }]}>
          <Briefcase size={18} color={colors.tint} />
          <Text style={[styles.statN, { color: colors.text }]}>{jobCount}</Text>
          <Text style={{ color: colors.textSecondary, fontSize: 12 }}>{t('work.nav.jobs')}</Text>
        </View>
        <View style={[styles.stat, { backgroundColor: colors.cardBackground, borderColor: colors.border }]}>
          <Users size={18} color={colors.tint} />
          <Text style={[styles.statN, { color: colors.text }]}>{talentCount}</Text>
          <Text style={{ color: colors.textSecondary, fontSize: 12 }}>{t('work.nav.talents')}</Text>
        </View>
      </View>

      <View style={{ gap: 10, marginTop: 8 }}>
        <Button title={t('work.findJobs')} onPress={() => router.push(href('/work/jobs'))} />
        <Button title={t('work.findTalents')} variant="outline" onPress={() => router.push(href('/work/talents'))} />
        <Button title={t('work.postJob')} variant="outline" onPress={() => router.push(href('/work/post'))} />
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  title: { fontSize: 24, fontFamily: displayFont, fontWeight: '600', marginTop: 4 },
  lede: { fontSize: 14, lineHeight: 20, marginTop: 8, marginBottom: 16 },
  stats: { flexDirection: 'row', gap: 10, marginBottom: 12 },
  stat: {
    flex: 1,
    borderWidth: 1,
    borderRadius: 14,
    padding: 14,
    gap: 6,
    alignItems: 'flex-start',
  },
  statN: { fontSize: 22, fontWeight: '800' },
});
