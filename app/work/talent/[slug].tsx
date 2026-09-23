import React, { useState } from 'react';
import { ActivityIndicator, Image, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { ChevronLeft, MessageCircle } from 'lucide-react-native';
import { chatApi, workApi } from '@/api';
import { href } from '@/lib/href';
import { useAuth } from '@/hooks/useAuth';
import { useTheme } from '@/hooks/useT';
import { useT } from '@/hooks/useT';
import { Screen } from '@/components/ui/Screen';
import { ErrorState } from '@/components/ui/ErrorState';
import { Chip } from '@/components/ui/Chip';
import { Rating } from '@/components/ui/Rating';
import { Button } from '@/components/ui/Button';
import { formatMoney } from '@/utils/format';
import { getErrorMessage } from '@/lib/errors';

export default function WorkTalentScreen() {
  const { slug } = useLocalSearchParams<{ slug: string }>();
  const router = useRouter();
  const { colors } = useTheme();
  const { t, language } = useT();
  const { isAuthenticated, user } = useAuth();
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const q = useQuery({ queryKey: ['work', 'talent', slug], queryFn: () => workApi.talent(String(slug)), enabled: !!slug });

  const headerLeft = () => (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={t('common.back')}
      onPress={() => (router.canGoBack() ? router.back() : router.replace(href('/work/talents')))}
      hitSlop={8}
      style={styles.backBtn}
    >
      <ChevronLeft size={22} color={colors.text} />
      <Text style={{ color: colors.text, fontWeight: '700' }}>{t('common.back')}</Text>
    </Pressable>
  );

  const openChat = async () => {
    if (!isAuthenticated) {
      router.push('/auth/login');
      return;
    }
    try {
      setBusy(true);
      setErr('');
      const c = await chatApi.start({ talentSlug: String(slug), body: t('work.talentHello') });
      router.push(href(`/chat/${c.id}`));
    } catch (e) {
      setErr(getErrorMessage(e, language));
    } finally {
      setBusy(false);
    }
  };

  if (q.isLoading) {
    return (
      <Screen>
        <Stack.Screen options={{ title: t('work.nav.talents'), headerLeft, headerBackVisible: false }} />
        <ActivityIndicator color={colors.tint} style={{ marginTop: 40 }} />
      </Screen>
    );
  }
  if (q.isError || !q.data) {
    return (
      <Screen>
        <Stack.Screen options={{ title: t('work.nav.talents'), headerLeft, headerBackVisible: false }} />
        <ErrorState message={q.isError ? getErrorMessage(q.error, language) : t('work.talentNotFound')} onRetry={() => q.refetch()} />
      </Screen>
    );
  }
  const p = q.data;
  const isSelf = !!(p.userId && user?.id && String(p.userId) === String(user.id));

  return (
    <Screen>
      <Stack.Screen options={{ title: p.name, headerLeft, headerBackVisible: false }} />
      <ScrollView contentContainerStyle={{ paddingBottom: 48 }}>
        <View style={[styles.poster, { backgroundColor: colors.cardBackground, borderColor: colors.border }]}>
          {p.avatarUrl ? (
            <Image source={{ uri: p.avatarUrl }} style={styles.avatar} />
          ) : (
            <View style={[styles.avatar, { backgroundColor: colors.mist }]} />
          )}
          <View style={{ flex: 1 }}>
            <Text style={{ color: colors.textSecondary, fontSize: 12 }}>{t('work.candidate')}</Text>
            <Text style={[styles.title, { color: colors.text }]}>{p.name}</Text>
            <Text style={[styles.meta, { color: colors.textSecondary }]}>{p.title}</Text>
          </View>
        </View>

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

        {err ? <Text style={{ color: colors.danger, marginTop: 12 }}>{err}</Text> : null}
        {!isSelf ? (
          <View style={{ marginTop: 20, gap: 10 }}>
            <Button title={t('work.messageTalent')} loading={busy} onPress={openChat} />
            <View style={styles.hintRow}>
              <MessageCircle size={16} color={colors.tint} />
              <Text style={{ color: colors.textSecondary, flex: 1, fontSize: 13 }}>{t('work.talentChatHint')}</Text>
            </View>
          </View>
        ) : null}
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  backBtn: { flexDirection: 'row', alignItems: 'center', minHeight: 44, marginLeft: -4, paddingRight: 8 },
  poster: {
    flexDirection: 'row',
    gap: 12,
    borderWidth: 1,
    borderRadius: 16,
    padding: 14,
    marginTop: 8,
    marginBottom: 14,
    alignItems: 'center',
  },
  avatar: { width: 64, height: 64, borderRadius: 32 },
  title: { fontSize: 22, fontWeight: '700', lineHeight: 28 },
  meta: { fontSize: 14, lineHeight: 20, marginTop: 6 },
  pay: { fontSize: 16, fontWeight: '800', marginTop: 12 },
  skills: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginVertical: 16 },
  body: { fontSize: 15, lineHeight: 24 },
  hintRow: { flexDirection: 'row', gap: 8, alignItems: 'center' },
});
