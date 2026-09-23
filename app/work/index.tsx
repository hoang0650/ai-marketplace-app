import React from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Stack, useRouter } from 'expo-router';
import { Briefcase, FileText, LayoutDashboard, PlusCircle, Users } from 'lucide-react-native';
import { href } from '@/lib/href';
import { useAuth } from '@/hooks/useAuth';
import { useTheme } from '@/hooks/useT';
import { useT } from '@/hooks/useT';
import { Screen } from '@/components/ui/Screen';
import { Button } from '@/components/ui/Button';
import { displayFont } from '@/constants/fonts';
import { HubBackButton } from '@/components/catalog/HubBackButton';

const LINKS = [
  { href: '/work/jobs', icon: Briefcase, titleKey: 'work.nav.jobs', descKey: 'work.nav.jobsDesc' },
  { href: '/work/talents', icon: Users, titleKey: 'work.nav.talents', descKey: 'work.nav.talentsDesc' },
  { href: '/work/post', icon: PlusCircle, titleKey: 'work.nav.post', descKey: 'work.nav.postDesc', auth: true },
  { href: '/work/contracts', icon: FileText, titleKey: 'work.nav.contracts', descKey: 'work.nav.contractsDesc', auth: true },
  { href: '/work/manage', icon: LayoutDashboard, titleKey: 'work.nav.dashboard', descKey: 'work.nav.dashboardDesc', auth: true },
] as const;

export default function WorkOverviewScreen() {
  const router = useRouter();
  const { colors } = useTheme();
  const { t } = useT();
  const { isAuthenticated } = useAuth();

  return (
    <Screen>
      <Stack.Screen options={{ title: t('work.title'), headerLeft: () => <HubBackButton />, headerBackVisible: false }} />
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <View style={styles.hero}>
          <View style={styles.badgeRow}>
            <Text style={[styles.title, { color: colors.text }]}>{t('work.title')}</Text>
            <View style={[styles.beta, { borderColor: colors.tint }]}>
              <Text style={[styles.betaText, { color: colors.tint }]}>BETA</Text>
            </View>
          </View>
          <Text style={[styles.lede, { color: colors.textSecondary }]}>{t('work.lede')}</Text>
          <View style={styles.actions}>
            <Button title={t('work.findJobs')} onPress={() => router.push(href('/work/jobs'))} style={{ flex: 1 }} />
            <Button
              title={t('work.findTalents')}
              variant="outline"
              onPress={() => router.push(href('/work/talents'))}
              style={{ flex: 1 }}
            />
          </View>
          <Button
            title={t('work.postJob')}
            variant="outline"
            onPress={() => router.push(isAuthenticated ? href('/work/post') : '/auth/login')}
          />
        </View>

        <View style={styles.grid}>
          {LINKS.map((link) => {
            const Icon = link.icon;
            return (
              <Pressable
                key={link.href}
                onPress={() => {
                  if ('auth' in link && link.auth && !isAuthenticated) {
                    router.push('/auth/login');
                    return;
                  }
                  router.push(href(link.href));
                }}
                style={({ pressed }) => [
                  styles.card,
                  { backgroundColor: colors.cardBackground, borderColor: colors.border, opacity: pressed ? 0.9 : 1 },
                ]}
              >
                <View style={[styles.iconWrap, { backgroundColor: colors.mist }]}>
                  <Icon size={20} color={colors.tint} />
                </View>
                <Text style={[styles.cardTitle, { color: colors.text }]}>{t(link.titleKey)}</Text>
                <Text style={[styles.cardDesc, { color: colors.textSecondary }]} numberOfLines={2}>
                  {t(link.descKey)}
                </Text>
              </Pressable>
            );
          })}
        </View>
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  scroll: { paddingBottom: 32 },
  hero: { marginTop: 4, marginBottom: 18, gap: 12 },
  badgeRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  title: { fontSize: 28, fontFamily: displayFont, fontWeight: '600' },
  beta: { borderWidth: 1, borderRadius: 6, paddingHorizontal: 8, paddingVertical: 2 },
  betaText: { fontSize: 10, fontWeight: '800', letterSpacing: 0.6 },
  lede: { fontSize: 14, lineHeight: 20 },
  actions: { flexDirection: 'row', gap: 10 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  card: {
    width: '47%',
    flexGrow: 1,
    minWidth: 148,
    borderWidth: 1,
    borderRadius: 16,
    padding: 14,
    gap: 6,
  },
  iconWrap: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  cardTitle: { fontSize: 15, fontWeight: '700' },
  cardDesc: { fontSize: 12, lineHeight: 16 },
});
