import React from 'react';
import { Image, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import {
  Activity,
  Briefcase,
  CreditCard,
  FileText,
  Heart,
  HelpCircle,
  IdCard,
  KeyRound,
  LayoutDashboard,
  LogOut,
  Package,
  Receipt,
  Scale,
  Settings,
  Shield,
  Store,
  Users,
  Wallet,
} from 'lucide-react-native';
import { href } from '@/lib/href';
import { useAuth } from '@/hooks/useAuth';
import { useTheme } from '@/hooks/useT';
import { useT } from '@/hooks/useT';
import { Screen } from '@/components/ui/Screen';
import { Button } from '@/components/ui/Button';
import { MenuGroup, MenuRow } from '@/components/ui/MenuRow';
import { displayFont } from '@/constants/fonts';

export default function ProfileScreen() {
  const router = useRouter();
  const { user, isAuthenticated, isCreator, isSeller, isTalent, isFreelancer, isEmployer, logout } = useAuth();
  const { colors } = useTheme();
  const { t } = useT();
  const avatar = user?.avatarUrl;

  return (
    <Screen>
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <Text style={[styles.pageTitle, { color: colors.text }]}>{t('nav.profile')}</Text>

        <View style={[styles.hero, { backgroundColor: colors.cardBackground, borderColor: colors.border }]}>
          {avatar ? (
            <Image source={{ uri: avatar }} style={styles.avatar} />
          ) : (
            <Image source={require('@/assets/images/mark.png')} style={styles.avatar} />
          )}
          <View style={{ flex: 1 }}>
            <Text style={[styles.name, { color: colors.text }]} numberOfLines={1}>
              {isAuthenticated ? user?.name : t('profile.guest')}
            </Text>
            <Text style={[styles.email, { color: colors.textSecondary }]} numberOfLines={1}>
              {isAuthenticated ? user?.email : t('orders.loginHint')}
            </Text>
          </View>
        </View>

        {!isAuthenticated ? (
          <Button title={t('auth.login')} onPress={() => router.push('/auth/login')} style={{ marginBottom: 16 }} />
        ) : null}

        <Text style={[styles.section, { color: colors.textSecondary }]}>{t('profile.section.account')}</Text>
        <MenuGroup>
          <MenuRow icon={Package} label={t('profile.orders')} onPress={() => router.push('/(tabs)/orders')} />
          <MenuRow icon={Briefcase} label={t('hub.work')} onPress={() => router.push(href('/work'))} />
          <MenuRow icon={Heart} label={t('profile.favorites')} onPress={() => router.push(href('/favorites'))} />
          <MenuRow icon={KeyRound} label={t('license.mine')} onPress={() => router.push(href('/licenses'))} />
          <MenuRow icon={Wallet} label={t('wallet.title')} onPress={() => router.push('/wallet')} />
          <MenuRow icon={IdCard} label={t('kyc.title')} onPress={() => router.push(href('/kyc'))} />
          <MenuRow icon={Activity} label={t('usage.title')} onPress={() => router.push('/usage')} />
          <MenuRow icon={CreditCard} label={t('profile.billing')} onPress={() => router.push('/wallet')} />
          <MenuRow icon={Receipt} label={t('profile.complaints')} onPress={() => router.push(href('/protection'))} last />
        </MenuGroup>

        {isCreator ? (
          <>
            <Text style={[styles.section, { color: colors.textSecondary }]}>{t('profile.section.seller')}</Text>
            <MenuGroup>
              {isSeller ? (
                <MenuRow icon={Store} label={t('profile.seller')} onPress={() => router.push(href('/seller-center'))} />
              ) : null}
              {isTalent ? (
                <MenuRow icon={Users} label={t('signup.role.talent')} onPress={() => router.push(href('/work/talents'))} />
              ) : null}
              {isFreelancer ? (
                <MenuRow icon={FileText} label={t('work.contracts')} onPress={() => router.push(href('/work/contracts'))} />
              ) : null}
              {isEmployer ? (
                <MenuRow icon={LayoutDashboard} label={t('work.nav.dashboard')} onPress={() => router.push(href('/work/manage'))} />
              ) : null}
            </MenuGroup>
          </>
        ) : null}

        <Text style={[styles.section, { color: colors.textSecondary }]}>{t('profile.section.support')}</Text>
        <MenuGroup>
          <MenuRow icon={Shield} label={t('profile.protection')} onPress={() => router.push(href('/protection'))} />
          <MenuRow icon={HelpCircle} label={t('profile.help')} onPress={() => router.push(href('/help'))} />
          <MenuRow icon={Settings} label={t('profile.settings')} onPress={() => router.push(href('/settings'))} last />
        </MenuGroup>

        <Text style={[styles.section, { color: colors.textSecondary }]}>{t('profile.legal')}</Text>
        <MenuGroup>
          <MenuRow
            icon={Scale}
            label={t('legal.hub.title')}
            hint={t('legal.hub.eyebrow')}
            onPress={() => router.push(href('/legal'))}
            last
          />
        </MenuGroup>

        {isAuthenticated ? (
          <Pressable
            onPress={() => logout()}
            accessibilityRole="button"
            style={({ pressed }) => [styles.logout, { borderColor: colors.border, opacity: pressed ? 0.8 : 1 }]}
          >
            <LogOut size={18} color={colors.danger} />
            <Text style={[styles.logoutText, { color: colors.danger }]}>{t('profile.logout')}</Text>
          </Pressable>
        ) : null}
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  scroll: { paddingBottom: 40 },
  pageTitle: { fontSize: 28, fontFamily: displayFont, fontWeight: '600', marginTop: 8, marginBottom: 16 },
  hero: {
    borderWidth: 1,
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    flexDirection: 'row',
    gap: 14,
    alignItems: 'center',
  },
  avatar: { width: 56, height: 56, borderRadius: 14 },
  name: { fontSize: 18, fontWeight: '700', lineHeight: 24, includeFontPadding: false },
  email: { fontSize: 13, lineHeight: 18, marginTop: 4, includeFontPadding: false },
  section: {
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 0.6,
    textTransform: 'uppercase',
    marginBottom: 8,
    marginLeft: 4,
  },
  logout: {
    marginTop: 8,
    minHeight: 52,
    borderRadius: 16,
    borderWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  logoutText: { fontWeight: '700', fontSize: 15 },
});
