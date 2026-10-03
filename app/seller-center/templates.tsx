import React, { useMemo, useState } from 'react';
import { ActivityIndicator, KeyboardAvoidingView, Linking, Platform, Pressable, RefreshControl, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { builderApi, productsApi } from '@/api';
import type { BuilderKind, BuilderTemplateListing, TemplateBuild } from '@/api/types';
import { ApiError, getErrorMessage } from '@/lib/errors';
import { href } from '@/lib/href';
import { useAuth } from '@/hooks/useAuth';
import { useT } from '@/hooks/useT';
import { LoginPrompt } from '@/components/ui/LoginPrompt';
import { BuildLog } from '@/components/builder/BuildLog';
import { GitConnect, useGitConnection } from '@/components/builder/GitConnect';

const BG = '#0b0f17';
const BAR = '#0c121c';
const LINE = '#1c2a3a';
const ACCENT = '#3dffb0';
const TEXT = '#e5e7eb';
const MUTED = 'rgba(229,231,235,0.6)';
const MONO = Platform.select({ ios: 'Menlo', default: 'monospace' });
const SELL_URL = 'https://aimarkets.vn/sell/templates';

const STATUS_COLOR: Record<string, string> = {
  active: '#4ade80',
  pending_review: '#fbbf24',
  inactive: MUTED,
  suspended: '#f87171',
  blocked: '#f87171',
};

/** Seller templates on mobile: import from GitHub → Build (log) → publish; Sync linked listings. */
export default function SellerTemplatesScreen() {
  const router = useRouter();
  const qc = useQueryClient();
  const insets = useSafeAreaInsets();
  const { isAuthenticated } = useAuth();
  const { t, language } = useT();
  const { git_connect: connectId, git_error: connectError } = useLocalSearchParams<{ git_connect?: string; git_error?: string }>();
  const { connected } = useGitConnection();

  const mine = useQuery({ queryKey: ['builder-templates-mine'], queryFn: builderApi.myTemplates, enabled: isAuthenticated });
  const rows = mine.data?.templates || [];

  const [showNew, setShowNew] = useState(!!(connectId || connectError));
  const [kind, setKind] = useState<BuilderKind>('web');
  const [name, setName] = useState('');
  const [tagline, setTagline] = useState('');
  const [price, setPrice] = useState('19');
  const [repo, setRepo] = useState('');
  const [repoFilter, setRepoFilter] = useState('');
  const [branch, setBranch] = useState('');
  const [path, setPath] = useState('');
  const [build, setBuild] = useState<TemplateBuild | null>(null);
  const [building, setBuilding] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [rowBusy, setRowBusy] = useState('');
  const [rowBuild, setRowBuild] = useState<{ productId: string; build: TemplateBuild } | null>(null);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  const repos = useQuery({ queryKey: ['builder-git-repos'], queryFn: builderApi.gitRepos, enabled: isAuthenticated && connected && showNew });
  const repoList = useMemo(() => {
    const q = repoFilter.trim().toLowerCase();
    return (repos.data?.repos || []).filter((r) => !q || r.fullName.toLowerCase().includes(q)).slice(0, 30);
  }, [repos.data, repoFilter]);
  const picked = repos.data?.repos.find((r) => r.fullName === repo);

  const msg = (e: unknown) => getErrorMessage(e, language);
  const buildFrom = (e: unknown) => (e instanceof ApiError ? (e.details?.build as TemplateBuild | undefined) : undefined);
  const ready = build?.status === 'success' && build.kind === kind;

  /** Any change to the source invalidates the last build — it must be rebuilt before publishing. */
  const edit = <T,>(set: (v: T) => void) => (v: T) => {
    set(v);
    setBuild(null);
  };

  const runBuild = async () => {
    if (!repo || building) return;
    setBuilding(true);
    setBuild(null);
    setError('');
    setNotice('');
    try {
      const r = await builderApi.templateBuild({ kind, fromGit: { repo, branch: branch.trim() || undefined, path: path.trim() || undefined } });
      setBuild(r.build);
    } catch (e) {
      setBuild(buildFrom(e) || null);
      setError(msg(e));
    } finally {
      setBuilding(false);
    }
  };

  const publish = async () => {
    const title = name.trim();
    if (!ready || !build || !title || publishing) return;
    const amount = Math.max(0, Number(price.replace(',', '.')) || 0);
    const category = `template-${kind}`;
    setPublishing(true);
    setError('');
    let productId = '';
    try {
      const product = await productsApi.create({
        name: title,
        tagline: tagline.trim(),
        category,
        pricing: amount > 0 ? { model: 'one-time', price: amount, currency: 'USD' } : { model: 'free', price: 0, currency: 'USD' },
        tags: [category],
      });
      productId = product.id;
      await builderApi.templateFromBuild(product.id, build.id);
      setNotice(t('builder.tpl.sell.created', { name: title }));
      setName('');
      setTagline('');
      setRepo('');
      setBranch('');
      setPath('');
      setBuild(null);
      setShowNew(false);
      void mine.refetch();
      void qc.invalidateQueries({ queryKey: ['products', 'mine'] });
    } catch (e) {
      setError(msg(e));
      if (productId) void productsApi.remove(productId).catch(() => undefined);
    } finally {
      setPublishing(false);
    }
  };

  const sync = async (row: BuilderTemplateListing) => {
    if (rowBusy) return;
    const id = row.product.id;
    setRowBusy(id);
    setRowBuild(null);
    setError('');
    setNotice('');
    try {
      const r = await builderApi.templateSyncGit(id);
      if (r.build) setRowBuild({ productId: id, build: r.build });
      setNotice(t('builder.tpl.sell.updated', { name: row.product.name, v: r.template.version }));
      void mine.refetch();
    } catch (e) {
      const b = buildFrom(e);
      if (b) setRowBuild({ productId: id, build: b });
      setError(msg(e));
    } finally {
      setRowBusy('');
    }
  };

  const leave = () => {
    if (router.canGoBack()) router.back();
    else router.replace(href('/seller-center'));
  };

  if (!isAuthenticated) return <LoginPrompt />;

  const priceLabel = (row: BuilderTemplateListing) => {
    const pr = row.product.pricing;
    if (!pr || pr.model === 'free' || !(Number(pr.price) > 0)) return t('builder.tpl.free');
    return `$${Number(pr.price).toFixed(2)}`;
  };

  return (
    <KeyboardAvoidingView style={styles.bg} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <Stack.Screen options={{ headerShown: false }} />
      <View style={[styles.bar, { paddingTop: Math.max(insets.top, 8) }]}>
        <Pressable onPress={leave} hitSlop={12}>
          <Text style={styles.link}>← {t('common.back')}</Text>
        </Pressable>
        <Text style={styles.barTitle} numberOfLines={1}>
          {t('builder.tpl.sell.title')}
        </Text>
        <Pressable onPress={() => setShowNew((v) => !v)} hitSlop={12}>
          <Text style={styles.link}>{showNew ? t('builder.tpl.sell.close') : `+ ${t('builder.tpl.sell.new')}`}</Text>
        </Pressable>
      </View>

      <ScrollView
        contentContainerStyle={{ padding: 12, gap: 12, paddingBottom: Math.max(insets.bottom, 16) + 16 }}
        keyboardShouldPersistTaps="handled"
        refreshControl={<RefreshControl tintColor={ACCENT} refreshing={mine.isRefetching} onRefresh={() => void mine.refetch()} />}
      >
        <Text style={styles.muted}>{t('builder.tpl.sell.sub')}</Text>
        {error ? <Text style={styles.err}>{error}</Text> : null}
        {notice ? <Text style={styles.ok}>{notice}</Text> : null}

        {showNew ? (
          <View style={styles.card}>
            <View style={styles.row}>
              {(['web', 'app'] as BuilderKind[]).map((k) => (
                <Pressable key={k} onPress={() => edit(setKind)(k)} style={[styles.kind, kind === k && styles.kindOn]}>
                  <Text style={{ color: TEXT, fontWeight: '800' }}>{t(`builder.kind.${k}`)}</Text>
                  <Text style={[styles.muted, { fontSize: 11 }]}>{t(`builder.tpl.entry.${k}`)}</Text>
                </Pressable>
              ))}
            </View>

            <Text style={styles.label}>{t('builder.tpl.f.name')}</Text>
            <TextInput value={name} onChangeText={setName} maxLength={120} style={styles.input} placeholderTextColor={MUTED} />
            <Text style={styles.label}>{t('builder.tpl.f.tagline')}</Text>
            <TextInput value={tagline} onChangeText={setTagline} maxLength={160} style={styles.input} placeholderTextColor={MUTED} />
            <Text style={styles.label}>{t('builder.tpl.f.price')}</Text>
            <TextInput value={price} onChangeText={setPrice} keyboardType="decimal-pad" style={styles.input} />
            <Text style={[styles.muted, { fontSize: 11 }]}>{t('builder.tpl.f.priceHint')}</Text>

            <View style={styles.divider} />
            <Text style={styles.title}>{t('builder.tpl.src.git')}</Text>
            {!connected ? <Text style={styles.muted}>{t('builder.tpl.git.connectHint')}</Text> : null}
            <GitConnect returnPath="/seller-center/templates" connectId={connectId} connectError={connectError} onError={setError} onNotice={setNotice} />

            {connected ? (
              <>
                <Text style={styles.label}>{t('builder.git.pickRepo')}</Text>
                <TextInput
                  value={repoFilter}
                  onChangeText={setRepoFilter}
                  autoCapitalize="none"
                  autoCorrect={false}
                  placeholder={t('builder.tpl.repoFilter')}
                  placeholderTextColor={MUTED}
                  style={styles.input}
                />
                {repos.isLoading ? (
                  <ActivityIndicator color={ACCENT} />
                ) : repoList.length ? (
                  <View style={{ gap: 6 }}>
                    {repoList.map((r) => (
                      <Pressable
                        key={r.fullName}
                        onPress={() => {
                          edit(setRepo)(r.fullName);
                          setBranch('');
                        }}
                        style={[styles.repo, repo === r.fullName && { borderColor: ACCENT }]}
                      >
                        <Text style={[styles.mono, { color: TEXT }]} numberOfLines={1}>
                          {r.fullName}
                          {r.private ? ' 🔒' : ''}
                        </Text>
                      </Pressable>
                    ))}
                  </View>
                ) : (
                  <Text style={styles.muted}>{repos.isError ? msg(repos.error) : t('builder.git.noRepos')}</Text>
                )}
                <View style={styles.row}>
                  <View style={{ flex: 1, gap: 6 }}>
                    <Text style={styles.label}>{t('builder.git.branch')}</Text>
                    <TextInput
                      value={branch}
                      onChangeText={edit(setBranch)}
                      autoCapitalize="none"
                      autoCorrect={false}
                      placeholder={picked?.defaultBranch || 'main'}
                      placeholderTextColor={MUTED}
                      style={[styles.input, styles.mono]}
                    />
                  </View>
                  <View style={{ flex: 1, gap: 6 }}>
                    <Text style={styles.label}>{t('builder.tpl.git.path')}</Text>
                    <TextInput
                      value={path}
                      onChangeText={edit(setPath)}
                      autoCapitalize="none"
                      autoCorrect={false}
                      placeholder={t('builder.tpl.git.pathPh')}
                      placeholderTextColor={MUTED}
                      style={[styles.input, styles.mono]}
                    />
                  </View>
                </View>
                <Text style={[styles.muted, { fontSize: 11 }]}>{t('builder.tpl.git.note')}</Text>

                <Pressable disabled={!repo || building} onPress={() => void runBuild()} style={[styles.build, (!repo || building) && styles.off]}>
                  <Text style={styles.buildText}>
                    {building ? t('builder.build.running') : build ? t('builder.build.rebuild') : t('builder.build.run')}
                  </Text>
                </Pressable>
                <Text style={[styles.muted, { fontSize: 11 }]}>{t(`builder.build.hint.${kind}`)}</Text>
                <BuildLog build={build} building={building} />
                {build?.status === 'failed' && !building ? <Text style={styles.err}>{t('builder.build.fixHint')}</Text> : null}
              </>
            ) : null}

            <View style={styles.divider} />
            <Text style={[styles.muted, { fontSize: 12 }]}>{ready ? t('builder.tpl.sell.review') : t('builder.build.needBuild')}</Text>
            <Pressable disabled={!ready || !name.trim() || publishing} onPress={() => void publish()} style={[styles.primary, (!ready || !name.trim() || publishing) && styles.off]}>
              <Text style={styles.primaryText}>{publishing ? t('builder.tpl.sell.saving') : t('builder.tpl.sell.publish')}</Text>
            </Pressable>
            <Pressable onPress={() => void Linking.openURL(SELL_URL)}>
              <Text style={[styles.muted, { fontSize: 11 }]}>
                {t('builder.tpl.zipOnWeb')} <Text style={styles.link}>aimarkets.vn/sell/templates</Text>
              </Text>
            </Pressable>
          </View>
        ) : null}

        {mine.isLoading ? (
          <ActivityIndicator color={ACCENT} />
        ) : rows.length ? (
          rows.map((row) => {
            const g = row.template.git;
            const status = row.product.moderationStatus || 'active';
            const busy = rowBusy === row.product.id;
            return (
              <View key={row.product.id} style={styles.card}>
                <View style={styles.row}>
                  <Text style={{ fontSize: 22 }}>{row.template.kind === 'app' ? '📱' : '🖥️'}</Text>
                  <View style={{ flex: 1, gap: 2 }}>
                    <Pressable onPress={() => router.push(href(`/product/${row.product.slug}`))}>
                      <Text style={styles.title} numberOfLines={1}>
                        {row.product.name}
                      </Text>
                    </Pressable>
                    <Text style={[styles.muted, { fontSize: 12 }]}>
                      <Text style={{ color: STATUS_COLOR[status] || MUTED, fontWeight: '700' }}>{t(`builder.tpl.status.${status}`)}</Text>
                      {' · '}
                      {priceLabel(row)}
                      {' · '}
                      {row.template.ready
                        ? `v${row.template.version} · ${row.template.fileCount} ${t('builder.files')} · ${t('builder.tpl.uses', { n: row.template.useCount })}`
                        : t('builder.tpl.noFiles')}
                    </Text>
                  </View>
                </View>
                {g ? (
                  <View style={[styles.row, { flexWrap: 'wrap' }]}>
                    <Pressable style={{ flex: 1, minWidth: 160 }} onPress={() => void Linking.openURL(g.commitSha ? `${g.repoUrl}/commit/${g.commitSha}` : g.repoUrl)}>
                      <Text style={[styles.muted, { fontSize: 12 }]} numberOfLines={2}>
                        {t('builder.tpl.git.linked')} <Text style={[styles.mono, { color: TEXT }]}>{g.repo}</Text> · {g.branch}
                        {g.path ? ` · /${g.path}` : ''}
                        {g.commitSha ? ` · ${g.commitSha.slice(0, 7)}` : ''}
                      </Text>
                    </Pressable>
                    <Pressable disabled={!!rowBusy} onPress={() => void sync(row)} style={[styles.ghost, !!rowBusy && styles.off]}>
                      <Text style={styles.link}>{busy ? t('builder.build.running') : `↻ ${t('builder.tpl.git.sync')}`}</Text>
                    </Pressable>
                  </View>
                ) : null}
                {busy ? <BuildLog build={null} building /> : null}
                {rowBuild?.productId === row.product.id && !busy ? <BuildLog build={rowBuild.build} /> : null}
              </View>
            );
          })
        ) : (
          <Text style={styles.muted}>{mine.isError ? msg(mine.error) : t('builder.tpl.sell.empty')}</Text>
        )}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  bg: { flex: 1, backgroundColor: BG },
  bar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
    paddingHorizontal: 14,
    paddingBottom: 10,
    backgroundColor: BAR,
    borderBottomWidth: 1,
    borderBottomColor: LINE,
  },
  barTitle: { color: TEXT, fontWeight: '800', fontSize: 15, flex: 1, textAlign: 'center' },
  title: { color: TEXT, fontWeight: '800', fontSize: 15 },
  label: { color: TEXT, fontWeight: '700', fontSize: 13 },
  muted: { color: MUTED, lineHeight: 19 },
  err: { color: '#fca5a5', lineHeight: 19 },
  ok: { color: '#86efac', lineHeight: 19 },
  link: { color: ACCENT, fontWeight: '700' },
  mono: { fontFamily: MONO, fontSize: 12 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  card: { gap: 10, padding: 12, borderRadius: 14, borderWidth: 1, borderColor: LINE },
  divider: { height: 1, backgroundColor: LINE, marginVertical: 2 },
  kind: { flex: 1, gap: 2, padding: 10, borderRadius: 12, borderWidth: 1, borderColor: LINE },
  kindOn: { borderColor: ACCENT, borderWidth: 2 },
  input: { borderWidth: 1, borderColor: LINE, borderRadius: 12, paddingHorizontal: 12, paddingVertical: 10, color: TEXT },
  repo: { paddingVertical: 10, paddingHorizontal: 12, borderRadius: 10, borderWidth: 1, borderColor: LINE },
  build: { backgroundColor: '#16a34a', borderRadius: 12, paddingVertical: 12, alignItems: 'center' },
  buildText: { color: '#fff', fontWeight: '800' },
  primary: { backgroundColor: ACCENT, borderRadius: 12, paddingVertical: 12, alignItems: 'center' },
  primaryText: { color: BG, fontWeight: '800' },
  ghost: { borderWidth: 1, borderColor: LINE, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 8 },
  off: { opacity: 0.4 },
});
