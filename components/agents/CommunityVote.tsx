import React, { useState } from 'react';
import { ActivityIndicator, Image, Linking, Pressable, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { communityAgentsApi } from '@/api';
import type { CommunityAgent, VoteBoard } from '@/api/types';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { useAuth } from '@/hooks/useAuth';
import { useTheme, useT } from '@/hooks/useT';
import { getErrorMessage } from '@/lib/errors';
import { formatDate } from '@/utils/format';

export const VOTE_BOARD_KEY = ['community-agents', 'board'] as const;

/** Shared board query: the Vote tab and the Community cards in Public read the same data. */
export function useVoteBoard() {
  const { isAuthenticated } = useAuth();
  return useQuery({
    queryKey: [...VOTE_BOARD_KEY, isAuthenticated],
    queryFn: () => communityAgentsApi.board(),
    staleTime: 60_000,
  });
}

function openRepo(url: string) {
  if (/^https:\/\/github\.com\//i.test(url)) void Linking.openURL(url);
}

function Avatar({ uri }: { uri: string }) {
  const { colors } = useTheme();
  return uri ? (
    <Image source={{ uri }} style={[styles.avatar, { backgroundColor: colors.border }]} />
  ) : (
    <View style={[styles.avatar, { backgroundColor: colors.border }]} />
  );
}

function Badge({ label, tone }: { label: string; tone: 'ok' | 'pending' | 'plain' }) {
  const { colors } = useTheme();
  const c = tone === 'ok' ? colors.success : tone === 'pending' ? colors.warning : colors.textSecondary;
  return (
    <View style={[styles.badge, { borderColor: c }]}>
      <Text style={{ color: c, fontSize: 11, fontWeight: '700' }}>{label}</Text>
    </View>
  );
}

/** Public tab entry for an agent voted in and approved: GitHub link, launch coming soon. */
export function CommunityAgentCard({ agent }: { agent: CommunityAgent }) {
  const { colors } = useTheme();
  const { t } = useT();
  return (
    <View style={[styles.card, { borderColor: colors.border, backgroundColor: colors.cardBackground }]} testID="community-card">
      <View style={styles.head}>
        <Avatar uri={agent.avatarUrl} />
        <View style={{ flex: 1 }}>
          <Text style={[styles.name, { color: colors.text }]} numberOfLines={1}>
            {agent.name || agent.fullName}
          </Text>
          <Text style={{ color: colors.textSecondary, fontSize: 12 }} numberOfLines={1}>
            {agent.fullName}
          </Text>
        </View>
      </View>
      <View style={styles.badges}>
        <Badge label={t('cvote.community')} tone="ok" />
        <Badge label={`★ ${agent.stars}`} tone="plain" />
        <Badge label={t('cvote.votes', { n: agent.voteCount })} tone="plain" />
      </View>
      {agent.description ? (
        <Text style={{ color: colors.textSecondary, fontSize: 13, lineHeight: 19 }} numberOfLines={3}>
          {agent.description}
        </Text>
      ) : null}
      <View style={{ gap: 8 }}>
        <Button title={t('cvote.comingSoon')} disabled onPress={() => undefined} />
        <Button title={`${t('cvote.github')} ↗`} variant="outline" onPress={() => openRepo(agent.htmlUrl)} />
      </View>
      <Text style={{ color: colors.textSecondary, fontSize: 11 }}>{t('cvote.communityHint')}</Text>
    </View>
  );
}

function Row({
  agent,
  variant,
  onToggle,
  busy,
  canVote,
}: {
  agent: CommunityAgent;
  variant: 'board' | 'pending' | 'listed';
  onToggle?: () => void;
  busy?: boolean;
  canVote?: boolean;
}) {
  const { colors } = useTheme();
  const { t } = useT();
  const top = variant === 'board' && agent.rank === 1;
  return (
    <View
      style={[
        styles.row,
        { borderColor: top ? colors.tint : colors.border, backgroundColor: colors.cardBackground },
      ]}
    >
      <View style={styles.head}>
        {variant === 'board' ? <Text style={[styles.rank, { color: colors.textSecondary }]}>#{agent.rank}</Text> : null}
        <Avatar uri={agent.avatarUrl} />
        <View style={{ flex: 1, minWidth: 0 }}>
          <Pressable onPress={() => openRepo(agent.htmlUrl)} accessibilityRole="link">
            <Text style={[styles.name, { color: colors.text, textDecorationLine: 'underline' }]} numberOfLines={1}>
              {agent.fullName}
            </Text>
          </Pressable>
          <Text style={{ color: colors.textSecondary, fontSize: 11 }} numberOfLines={1}>
            ★ {agent.stars}
            {agent.language ? ` · ${agent.language}` : ''}
            {variant === 'board' ? ` · ${t('cvote.by', { name: agent.submitterName || '—' })}` : ` · ${t('cvote.votes', { n: agent.voteCount })}`}
          </Text>
        </View>
      </View>
      {variant !== 'listed' && agent.description ? (
        <Text style={{ color: colors.textSecondary, fontSize: 13 }} numberOfLines={2}>
          {agent.description}
        </Text>
      ) : null}
      <View style={styles.voteRow}>
        {variant === 'board' ? (
          <>
            <Text style={[styles.count, { color: colors.text }]}>{agent.voteCount}</Text>
            {agent.mine ? (
              <Badge label={t('cvote.yours')} tone="plain" />
            ) : canVote ? (
              <Pressable
                onPress={onToggle}
                disabled={busy}
                accessibilityRole="button"
                style={[
                  styles.voteBtn,
                  {
                    borderColor: agent.votedByMe ? colors.success : colors.border,
                    backgroundColor: agent.votedByMe ? `${colors.success}22` : 'transparent',
                    opacity: busy ? 0.55 : 1,
                  },
                ]}
              >
                {busy ? (
                  <ActivityIndicator size="small" color={colors.text} />
                ) : (
                  <Text style={{ color: agent.votedByMe ? colors.success : colors.text, fontWeight: '700' }}>
                    {t(agent.votedByMe ? 'cvote.unvote' : 'cvote.vote')}
                  </Text>
                )}
              </Pressable>
            ) : null}
          </>
        ) : variant === 'pending' ? (
          <Badge label={t('cvote.pending')} tone="pending" />
        ) : (
          <Badge label={t('cvote.listed')} tone="ok" />
        )}
      </View>
    </View>
  );
}

/** Agent Marketplace "Vote" tab: nominate a GitHub repo, vote/unvote, leaderboard, pending + Voted & Listed. */
export function CommunityVote({ board, loading }: { board: VoteBoard | undefined; loading?: boolean }) {
  const { colors } = useTheme();
  const { t, language } = useT();
  const { isAuthenticated } = useAuth();
  const router = useRouter();
  const qc = useQueryClient();
  const [repoUrl, setRepoUrl] = useState('');
  const [msg, setMsg] = useState<{ text: string; err: boolean } | null>(null);
  const [busyId, setBusyId] = useState('');
  const refresh = () => qc.invalidateQueries({ queryKey: VOTE_BOARD_KEY });
  const fail = (e: unknown) => setMsg({ text: getErrorMessage(e as Error, language) || t('cvote.err'), err: true });

  const submit = useMutation({
    mutationFn: (url: string) => communityAgentsApi.submit(url),
    onSuccess: (r) => {
      setMsg({ text: t('cvote.submitted', { name: r.agent.fullName }), err: false });
      setRepoUrl('');
      void refresh();
    },
    onError: fail,
  });

  const toggle = async (a: CommunityAgent) => {
    if (busyId) return;
    setBusyId(a._id);
    setMsg(null);
    try {
      if (a.votedByMe) await communityAgentsApi.unvote(a._id);
      else await communityAgentsApi.vote(a._id);
      await refresh();
    } catch (e) {
      fail(e);
    } finally {
      setBusyId('');
    }
  };

  const period = t(`cvote.period.${board?.cycle?.period || 'monthly'}`);
  const section = [styles.section, { borderColor: colors.border, backgroundColor: colors.cardBackground }];

  return (
    <View style={{ gap: 14 }} testID="vote-tab">
      <Text style={{ color: colors.textSecondary, lineHeight: 20 }}>{t('cvote.lede', { period })}</Text>
      {board?.cycle ? (
        <Text style={{ color: colors.text, fontWeight: '700', fontSize: 13 }}>
          🗳️ {t('cvote.cycleEnds', { key: board.cycle.key, date: formatDate(board.cycle.endsAt, language) })}
        </Text>
      ) : null}

      <View style={section}>
        <Text style={[styles.h2, { color: colors.text }]}>{t('cvote.submitTitle')}</Text>
        {isAuthenticated ? (
          <>
            <Input
              value={repoUrl}
              onChangeText={setRepoUrl}
              placeholder={t('cvote.submitPh')}
              autoCapitalize="none"
              autoCorrect={false}
              keyboardType="url"
            />
            <Button
              title={t('cvote.submitBtn')}
              loading={submit.isPending}
              disabled={!repoUrl.trim() || submit.isPending}
              onPress={() => {
                setMsg(null);
                submit.mutate(repoUrl.trim());
              }}
            />
            <Text style={styles.hint(colors.textSecondary)}>{t('cvote.submitHint')}</Text>
          </>
        ) : (
          <Button title={t('cvote.loginToSubmit')} onPress={() => router.push('/auth/login')} />
        )}
        {msg ? (
          <Text style={{ color: msg.err ? colors.danger : colors.success, fontWeight: '600', marginTop: 8 }}>{msg.text}</Text>
        ) : null}
      </View>

      {loading && !board ? <ActivityIndicator color={colors.tint} /> : null}

      {board?.pending?.length ? (
        <View style={section}>
          <Text style={[styles.h2, { color: colors.text }]}>⏳ {t('cvote.pending')}</Text>
          <Text style={styles.hint(colors.textSecondary)}>{t('cvote.pendingHint')}</Text>
          {board.pending.map((a) => (
            <Row key={a._id} agent={a} variant="pending" />
          ))}
        </View>
      ) : null}

      <View style={section}>
        <Text style={[styles.h2, { color: colors.text }]}>🏆 {t('cvote.leaderboard')}</Text>
        {(board?.leaderboard || []).map((a) => (
          <Row
            key={a._id}
            agent={a}
            variant="board"
            canVote={isAuthenticated}
            busy={busyId === a._id}
            onToggle={() => void toggle(a)}
          />
        ))}
        {board && !board.leaderboard?.length ? <Text style={{ color: colors.textSecondary }}>{t('cvote.empty')}</Text> : null}
      </View>

      {board?.listed?.length ? (
        <View style={section}>
          <Text style={[styles.h2, { color: colors.text }]}>✅ {t('cvote.listed')}</Text>
          <Text style={styles.hint(colors.textSecondary)}>{t('cvote.listedHint')}</Text>
          {board.listed.map((a) => (
            <Row key={a._id} agent={a} variant="listed" />
          ))}
        </View>
      ) : null}
    </View>
  );
}

const base = StyleSheet.create({
  card: { borderWidth: 1, borderRadius: 16, padding: 14, gap: 10 },
  head: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  name: { fontSize: 15, fontWeight: '800' },
  avatar: { width: 40, height: 40, borderRadius: 10 },
  badges: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  badge: { borderWidth: 1, borderRadius: 999, paddingHorizontal: 8, paddingVertical: 2 },
  section: { borderWidth: 1, borderRadius: 16, padding: 14, gap: 10 },
  h2: { fontSize: 16, fontWeight: '800' },
  row: { borderWidth: 1, borderRadius: 12, padding: 10, gap: 6 },
  rank: { fontWeight: '800', minWidth: 28 },
  voteRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-end', gap: 10 },
  count: { fontSize: 18, fontWeight: '800' },
  voteBtn: { borderWidth: 1, borderRadius: 10, paddingHorizontal: 14, minHeight: 36, justifyContent: 'center' },
});
const styles = { ...base, hint: (color: string) => ({ color, fontSize: 12, lineHeight: 17 }) };
