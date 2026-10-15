import React, { useMemo, useState } from 'react';
import { Alert, Platform, Pressable, ScrollView, StyleSheet, Switch, Text, View } from 'react-native';
import { Stack, useRouter } from 'expo-router';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import * as Clipboard from 'expo-clipboard';
import { sellerComputeApi } from '@/api';
import type { ComputeNode, ComputeProductOption, StreamDevice } from '@/api/types';
import { Button } from '@/components/ui/Button';
import { Chip } from '@/components/ui/Chip';
import { Input } from '@/components/ui/Input';
import { LoginPrompt } from '@/components/ui/LoginPrompt';
import { Screen } from '@/components/ui/Screen';
import { useAuth } from '@/hooks/useAuth';
import { useTheme, useT } from '@/hooks/useT';
import { ApiError } from '@/lib/errors';
import { href } from '@/lib/href';
import { generateWebhookSecret, urlError } from '@/lib/computeNode';

const SECRET_MIN = 16;
type Field =
  | 'product'
  | 'devices'
  | 'webhookUrl'
  | 'webhookSecret'
  | 'streamHost'
  | 'streamPort'
  | 'iframeUrl'
  | 'healthUrl'
  | 'mobileIframeUrl'
  | 'maxConcurrent';
type Errors = Partial<Record<Field, string>>;

const NODES_KEY = ['seller', 'compute', 'nodes'] as const;

function confirmAsync(title: string, message: string, cancel: string, ok: string): Promise<boolean> {
  if (Platform.OS === 'web') return Promise.resolve(typeof window !== 'undefined' ? window.confirm(message) : false);
  return new Promise((resolve) =>
    Alert.alert(title, message, [
      { text: cancel, style: 'cancel', onPress: () => resolve(false) },
      { text: ok, style: 'destructive', onPress: () => resolve(true) },
    ]),
  );
}

export default function SellerComputeScreen() {
  const { isAuthenticated } = useAuth();
  const { colors } = useTheme();
  const { t } = useT();
  const router = useRouter();
  const qc = useQueryClient();
  const products = useQuery({ queryKey: ['seller', 'compute', 'products'], queryFn: sellerComputeApi.listProducts, enabled: isAuthenticated });
  const nodes = useQuery({ queryKey: NODES_KEY, queryFn: sellerComputeApi.listNodes, enabled: isAuthenticated });

  const [editing, setEditing] = useState<ComputeNode | null>(null);
  const [productSlug, setProductSlug] = useState('');
  const [name, setName] = useState('');
  const [kind, setKind] = useState<'compute' | 'game'>('game');
  const [hosting, setHosting] = useState<'external' | 'aimarkets'>('external');
  const [connectMode, setConnectMode] = useState<'webhook' | 'static'>('webhook');
  const [webhookUrl, setWebhookUrl] = useState('');
  const [webhookSecret, setWebhookSecret] = useState('');
  const [freshSecret, setFreshSecret] = useState('');
  const [copied, setCopied] = useState(false);
  const [streamHost, setStreamHost] = useState('');
  const [streamPort, setStreamPort] = useState('6080');
  const [streamPath, setStreamPath] = useState('/');
  const [streamKind, setStreamKind] = useState('novnc');
  const [streamTls, setStreamTls] = useState(false);
  const [iframeUrl, setIframeUrl] = useState('');
  const [healthUrl, setHealthUrl] = useState('');
  const [region, setRegion] = useState('');
  const [maxConcurrent, setMaxConcurrent] = useState('10');
  const [gpuType, setGpuType] = useState('NVIDIA GeForce RTX 4090');
  const [devicePc, setDevicePc] = useState(true);
  const [deviceMobile, setDeviceMobile] = useState(true);
  const [mobileIframeUrl, setMobileIframeUrl] = useState('');
  const [mobileStreamHost, setMobileStreamHost] = useState('');
  const [mobileStreamPort, setMobileStreamPort] = useState('');
  const [mobileStreamPath, setMobileStreamPath] = useState('');
  const [errors, setErrors] = useState<Errors>({});
  const [notice, setNotice] = useState<{ ok: boolean; text: string } | null>(null);
  const [busy, setBusy] = useState(false);

  const all: ComputeProductOption[] = useMemo(() => products.data || [], [products.data]);
  const eligible = useMemo(() => all.filter((p) => p.eligible), [all]);
  const drafts = useMemo(() => all.filter((p) => p.reason === 'NOT_PUBLISHED'), [all]);
  const others = useMemo(() => all.filter((p) => p.reason === 'NOT_COMPUTE_CATEGORY'), [all]);
  const selectedSlug = productSlug || (!editing && eligible.length === 1 ? eligible[0].slug : '');
  const selected = all.find((p) => p.slug === selectedSlug);
  const external = editing ? editing.external : hosting === 'external';

  const pickProduct = (slug: string) => {
    setProductSlug(slug);
    const p = all.find((x) => x.slug === slug);
    if (p?.category === 'gpu-compute') setKind('compute');
    if (p?.category === 'game-server') setKind('game');
    setErrors((e) => ({ ...e, product: undefined }));
  };

  /** A seller with exactly one eligible product gets it preselected (as on web). */
  const autoProduct = !productSlug && !editing && eligible.length === 1 ? eligible[0] : null;
  const slug = productSlug || autoProduct?.slug || '';
  const effectiveKind: 'compute' | 'game' = autoProduct ? (autoProduct.category === 'gpu-compute' ? 'compute' : 'game') : kind;

  const devices = (): StreamDevice[] => [...(devicePc ? (['pc'] as const) : []), ...(deviceMobile ? (['mobile'] as const) : [])];

  const genSecret = () => {
    const s = generateWebhookSecret();
    setWebhookSecret(s);
    setFreshSecret(s);
    setCopied(false);
    setErrors((e) => ({ ...e, webhookSecret: undefined }));
  };

  const validate = (): boolean => {
    const e: Errors = {};
    if (!editing && (!selected || !selected.eligible)) e.product = t('scn.err.product');
    if (!devices().length) e.devices = t('scn.err.devices');
    const max = Number(maxConcurrent);
    if (!Number.isFinite(max) || max < 1 || max > 100) e.maxConcurrent = t('scn.err.max');
    if (external) {
      if (connectMode === 'webhook') {
        if (!webhookUrl.trim() || urlError(webhookUrl, true)) e.webhookUrl = t('scn.err.webhookUrl');
        const keep = editing?.config?.hasWebhookSecret && !webhookSecret.trim();
        if (!keep && webhookSecret.trim().length < SECRET_MIN) e.webhookSecret = t('scn.err.secret');
      } else {
        if (!streamHost.trim()) e.streamHost = t('scn.err.streamHost');
        const port = Number(streamPort);
        if (!Number.isInteger(port) || port < 1 || port > 65535) e.streamPort = t('scn.err.streamPort');
      }
      const ie = urlError(iframeUrl, true);
      if (ie) e.iframeUrl = t(ie);
      const he = urlError(healthUrl, false);
      if (he) e.healthUrl = t(he);
      const me = deviceMobile ? urlError(mobileIframeUrl, true) : null;
      if (me) e.mobileIframeUrl = t(me);
    }
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const externalBody = (): Record<string, unknown> => {
    const body: Record<string, unknown> = { healthUrl: healthUrl.trim() };
    if (connectMode === 'webhook') {
      body.webhookUrl = webhookUrl.trim();
      if (webhookSecret.trim()) body.webhookSecret = webhookSecret.trim();
      body.streamHost = '';
      body.streamPort = 0;
    } else {
      body.webhookUrl = '';
      body.streamHost = streamHost.trim();
      body.streamPort = Number(streamPort) || 0;
      body.streamPath = streamPath.trim() || '/';
      body.streamKind = streamKind.trim() || 'novnc';
      body.streamTls = streamTls;
    }
    body.iframeUrl = iframeUrl.trim();
    if (deviceMobile && (mobileIframeUrl.trim() || mobileStreamHost.trim())) {
      const isStatic = connectMode === 'static';
      body.mobileStream = {
        iframeUrl: mobileIframeUrl.trim() || undefined,
        host: isStatic ? mobileStreamHost.trim() || undefined : undefined,
        port: isStatic ? Number(mobileStreamPort) || undefined : undefined,
        path: isStatic ? mobileStreamPath.trim() || undefined : undefined,
        kind: streamKind.trim() || undefined,
        tls: streamTls,
      };
    }
    return body;
  };

  const reset = () => {
    setEditing(null);
    setName('');
    setWebhookUrl('');
    setWebhookSecret('');
    setFreshSecret('');
    setStreamHost('');
    setStreamPort('6080');
    setStreamPath('/');
    setIframeUrl('');
    setHealthUrl('');
    setRegion('');
    setMaxConcurrent('10');
    setMobileIframeUrl('');
    setMobileStreamHost('');
    setMobileStreamPort('');
    setMobileStreamPath('');
    setErrors({});
  };

  const errText = (e: unknown) => {
    const code = e instanceof ApiError ? e.code : '';
    const key = `scn.err.${code}`;
    const mapped = code ? t(key) : '';
    if (mapped && mapped !== key) return mapped;
    return (e instanceof ApiError && e.userMessage) || t('scn.err.save');
  };

  const submit = async () => {
    if (busy) return;
    setNotice(null);
    if (!validate()) {
      setNotice({ ok: false, text: t('scn.err.fix') });
      return;
    }
    setBusy(true);
    const common: Record<string, unknown> = {
      name: name.trim() || undefined,
      region: region.trim(),
      maxConcurrent: Number(maxConcurrent),
      devices: devices(),
    };
    try {
      let node: ComputeNode;
      if (editing) {
        node = await sellerComputeApi.updateNode(editing.id, editing.external ? { ...common, ...externalBody() } : common);
        setNotice({ ok: true, text: t('scn.updated', { name: node?.name || name }) });
      } else {
        const body: Record<string, unknown> = { ...common, productSlug: slug.trim().toLowerCase(), hosting, kind: effectiveKind };
        if (hosting === 'aimarkets') {
          body.gpuType = gpuType.trim() || undefined;
          body.provider = 'aimarkets-gpu';
        } else Object.assign(body, externalBody());
        node = await sellerComputeApi.registerNode(body);
        setNotice({ ok: true, text: t('scn.saved', { name: node?.name || name, product: node?.productName || selected?.name || slug }) });
      }
      reset();
      void qc.invalidateQueries({ queryKey: NODES_KEY });
    } catch (e) {
      setNotice({ ok: false, text: errText(e) });
    } finally {
      setBusy(false);
    }
  };

  const edit = (n: ComputeNode) => {
    reset();
    setEditing(n);
    setProductSlug(n.productSlug || '');
    setHosting(n.external ? 'external' : 'aimarkets');
    setKind(n.kind);
    setName(n.name);
    setRegion(n.region || '');
    setMaxConcurrent(String(n.maxConcurrent || 10));
    const devs = n.devices || ['pc', 'mobile'];
    setDevicePc(devs.includes('pc'));
    setDeviceMobile(devs.includes('mobile'));
    const c = n.config;
    if (c) {
      setConnectMode(c.webhookUrl || !c.streamHost ? 'webhook' : 'static');
      setWebhookUrl(c.webhookUrl || '');
      setStreamHost(c.streamHost || '');
      setStreamPort(String(c.streamPort || 6080));
      setStreamPath(c.streamPath || '/');
      setStreamKind(c.streamKind || 'novnc');
      setStreamTls(Boolean(c.streamTls));
      setIframeUrl(c.iframeUrl || '');
      setHealthUrl(c.healthUrl || '');
      setMobileIframeUrl(c.mobileStream?.iframeUrl || '');
      setMobileStreamHost(c.mobileStream?.host || '');
      setMobileStreamPort(c.mobileStream?.port ? String(c.mobileStream.port) : '');
      setMobileStreamPath(c.mobileStream?.path || '');
    }
    setNotice(null);
  };

  const ping = async (n: ComputeNode) => {
    try {
      const r = await sellerComputeApi.pingNode(n.id);
      setNotice({ ok: r.ok, text: t(r.ok ? 'scn.pingOk' : 'scn.pingFailed', { via: r.via ?? '' }) });
    } catch {
      setNotice({ ok: false, text: t('scn.err.ping') });
    }
  };

  const remove = async (n: ComputeNode) => {
    const ok = await confirmAsync(t('scn.remove'), t('scn.confirmRemove', { name: n.name }), t('common.cancel'), t('scn.remove'));
    if (!ok) return;
    try {
      await sellerComputeApi.deleteNode(n.id);
      setNotice({ ok: true, text: t('scn.removed', { name: n.name }) });
      if (editing?.id === n.id) reset();
      void qc.invalidateQueries({ queryKey: NODES_KEY });
    } catch {
      setNotice({ ok: false, text: t('scn.err.remove') });
    }
  };

  if (!isAuthenticated) return <LoginPrompt />;

  const card = [styles.card, { borderColor: colors.border, backgroundColor: colors.cardBackground }];
  const label = [styles.label, { color: colors.textSecondary }];
  const hint = { color: colors.textSecondary, fontSize: 12, lineHeight: 17 };
  const err = (f: Field) => (errors[f] ? <Text style={{ color: colors.danger, fontSize: 12 }}>{errors[f]}</Text> : null);
  const statusColor = (s: string) => (s === 'online' ? colors.success : s === 'error' ? colors.danger : colors.textSecondary);

  return (
    <Screen>
      <Stack.Screen options={{ title: t('scn.menu') }} />
      <ScrollView contentContainerStyle={{ paddingBottom: 48, gap: 14 }} keyboardShouldPersistTaps="handled" testID="compute-node-screen">
        <Text style={[styles.title, { color: colors.text }]}>{t(editing ? 'scn.editTitle' : 'scn.title')}</Text>
        <Text style={hint}>{t('scn.hint')}</Text>
        <Text style={hint}>{t('scn.rules')}</Text>

        {notice ? (
          <View style={[styles.notice, { borderColor: notice.ok ? colors.success : colors.danger }]}>
            <Text style={{ color: notice.ok ? colors.success : colors.danger, fontWeight: '600' }}>{notice.text}</Text>
          </View>
        ) : null}

        <View style={card}>
          <Text style={label}>{t('scn.product')}</Text>
          {editing ? (
            <Text style={{ color: colors.text, fontWeight: '700' }}>{editing.productName || editing.productSlug}</Text>
          ) : products.isLoading ? (
            <Text style={hint}>{t('scn.loading')}</Text>
          ) : products.isError ? (
            <Text style={{ color: colors.danger }}>{t('scn.loadFail')}</Text>
          ) : !all.length ? (
            <Text style={hint}>{t('scn.noProducts')}</Text>
          ) : (
            <>
              <View style={styles.wrap}>
                {eligible.map((p) => (
                  <Chip key={p.slug} label={p.name} active={slug === p.slug} onPress={() => pickProduct(p.slug)} />
                ))}
              </View>
              {!eligible.length && drafts.length ? <Text style={hint}>{t('scn.onlyDrafts')}</Text> : null}
              {drafts.length ? (
                <Text style={hint}>{drafts.map((p) => `${p.name} (${t('scn.unpublished')})`).join(' · ')}</Text>
              ) : null}
              {!eligible.length && !drafts.length && others.length ? (
                <Text style={hint}>{t('scn.noEligible', { n: others.length })}</Text>
              ) : null}
            </>
          )}
          {err('product')}
          {!editing && !eligible.length && !products.isLoading ? (
            <View style={styles.wrap}>
              <Button title={t('scn.createGpu')} variant="outline" onPress={() => router.push(href('/seller-center/products'))} />
            </View>
          ) : null}

          <Input label={t('scn.name')} value={name} onChangeText={setName} placeholder={t('scn.namePh')} />

          <Text style={label}>{t('scn.kind')}</Text>
          <View style={styles.wrap}>
            <Chip label={t('scn.kindGame')} active={effectiveKind === 'game'} onPress={() => !editing && setKind('game')} />
            <Chip label={t('scn.kindGpu')} active={effectiveKind === 'compute'} onPress={() => !editing && setKind('compute')} />
          </View>
          <Text style={hint}>{t('scn.kindAuto')}</Text>

          <Text style={label}>{t('scn.hosting')}</Text>
          <View style={styles.wrap}>
            <Chip label={t('scn.hostingExternal')} active={external} onPress={() => !editing && setHosting('external')} />
            <Chip label={t('scn.hostingAim')} active={!external} onPress={() => !editing && setHosting('aimarkets')} />
          </View>
          <Text style={hint}>{t(external ? 'scn.hostingExternalHint' : 'scn.hostingAimHint')}</Text>
          {!external && !editing ? <Input label={t('scn.gpuType')} value={gpuType} onChangeText={setGpuType} /> : null}

          <Text style={label}>{t('scn.devices')}</Text>
          <View style={styles.switchRow}>
            <Text style={{ color: colors.text, flex: 1 }}>
              {t('scn.devicePc')} <Text style={hint}>· {t('scn.devicePcHint')}</Text>
            </Text>
            <Switch value={devicePc} onValueChange={setDevicePc} />
          </View>
          <View style={styles.switchRow}>
            <Text style={{ color: colors.text, flex: 1 }}>
              {t('scn.deviceMobile')} <Text style={hint}>· {t('scn.deviceMobileHint')}</Text>
            </Text>
            <Switch value={deviceMobile} onValueChange={setDeviceMobile} />
          </View>
          {err('devices')}
          <Text style={hint}>{t('scn.devicesHint')}</Text>
        </View>

        {external ? (
          <View style={card}>
            <Text style={label}>{t('scn.connect')}</Text>
            <View style={styles.wrap}>
              <Chip label={t('scn.connectWebhook')} active={connectMode === 'webhook'} onPress={() => setConnectMode('webhook')} />
              <Chip label={t('scn.connectStatic')} active={connectMode === 'static'} onPress={() => setConnectMode('static')} />
            </View>
            <Text style={hint}>{t(connectMode === 'webhook' ? 'scn.connectWebhookHint' : 'scn.connectStaticHint')}</Text>
            {connectMode === 'webhook' ? (
              <>
                <Input
                  label={t('scn.webhookUrl')}
                  value={webhookUrl}
                  onChangeText={setWebhookUrl}
                  placeholder="https://"
                  autoCapitalize="none"
                  autoCorrect={false}
                  keyboardType="url"
                  error={errors.webhookUrl}
                />
                <Input
                  label={t('scn.webhookSecret')}
                  value={webhookSecret}
                  onChangeText={(v) => {
                    setWebhookSecret(v);
                    if (v !== freshSecret) setFreshSecret('');
                  }}
                  placeholder={editing?.config?.hasWebhookSecret ? t('scn.webhookSecretKeep') : t('scn.webhookSecretPh')}
                  autoCapitalize="none"
                  autoCorrect={false}
                  secureTextEntry={!freshSecret}
                  error={errors.webhookSecret}
                />
                <Button title={t('scn.generate')} variant="outline" onPress={genSecret} />
                {freshSecret ? (
                  <View style={[styles.notice, { borderColor: colors.warning, gap: 8 }]}>
                    <Text style={{ color: colors.warning, fontSize: 12 }}>{t('scn.secretCopyHint')}</Text>
                    <Text selectable style={{ color: colors.text, fontFamily: Platform.select({ ios: 'Menlo', default: 'monospace' }), fontSize: 12 }}>
                      {freshSecret}
                    </Text>
                    <Button
                      title={copied ? t('scn.copied') : t('scn.copy')}
                      variant="outline"
                      onPress={() => void Clipboard.setStringAsync(freshSecret).then(() => setCopied(true))}
                    />
                  </View>
                ) : null}
              </>
            ) : (
              <>
                <Input label={t('scn.streamHost')} value={streamHost} onChangeText={setStreamHost} autoCapitalize="none" error={errors.streamHost} />
                <Input label={t('scn.streamPort')} value={streamPort} onChangeText={setStreamPort} keyboardType="number-pad" error={errors.streamPort} />
                <Input label={t('scn.streamPath')} value={streamPath} onChangeText={setStreamPath} autoCapitalize="none" />
                <Input label={t('scn.streamKind')} value={streamKind} onChangeText={setStreamKind} autoCapitalize="none" />
                <View style={styles.switchRow}>
                  <Text style={{ color: colors.text, flex: 1 }}>{t('scn.streamTls')}</Text>
                  <Switch value={streamTls} onValueChange={setStreamTls} />
                </View>
              </>
            )}
            <Input label={t('scn.iframeUrl')} value={iframeUrl} onChangeText={setIframeUrl} autoCapitalize="none" keyboardType="url" error={errors.iframeUrl} />
            <Input label={t('scn.healthUrl')} value={healthUrl} onChangeText={setHealthUrl} autoCapitalize="none" keyboardType="url" error={errors.healthUrl} />
            {deviceMobile ? (
              <>
                <Text style={label}>{t('scn.mobileTitle')}</Text>
                <Text style={hint}>{t('scn.mobileHint')}</Text>
                <Input value={mobileIframeUrl} onChangeText={setMobileIframeUrl} placeholder={t('scn.iframeUrl')} autoCapitalize="none" keyboardType="url" error={errors.mobileIframeUrl} />
                {connectMode === 'static' ? (
                  <>
                    <Input value={mobileStreamHost} onChangeText={setMobileStreamHost} placeholder={t('scn.streamHost')} autoCapitalize="none" />
                    <Input value={mobileStreamPort} onChangeText={setMobileStreamPort} placeholder={t('scn.streamPort')} keyboardType="number-pad" />
                    <Input value={mobileStreamPath} onChangeText={setMobileStreamPath} placeholder={t('scn.streamPath')} autoCapitalize="none" />
                  </>
                ) : null}
              </>
            ) : null}
          </View>
        ) : null}

        <View style={card}>
          <Input label={t('scn.region')} value={region} onChangeText={setRegion} placeholder="SG / VN / EU" />
          <Input label={t('scn.maxConcurrent')} value={maxConcurrent} onChangeText={setMaxConcurrent} keyboardType="number-pad" error={errors.maxConcurrent} />
          <Button title={busy ? t('scn.saving') : t(editing ? 'scn.update' : 'scn.save')} loading={busy} onPress={() => void submit()} />
          {editing ? <Button title={t('scn.cancelEdit')} variant="outline" onPress={reset} /> : null}
        </View>

        <Text style={[styles.h2, { color: colors.text }]}>{t('scn.nodes')}</Text>
        {!(nodes.data || []).length ? <Text style={hint}>{t('scn.nodesEmpty')}</Text> : null}
        {(nodes.data || []).map((n) => (
          <View key={n.id} style={card} testID="compute-node-row">
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <Text style={{ color: colors.text, fontWeight: '800', flex: 1 }} numberOfLines={1}>
                {n.name}
              </Text>
              <Text style={{ color: statusColor(n.status), fontWeight: '700', fontSize: 12 }}>
                ● {['online', 'offline', 'creating', 'error'].includes(n.status) ? t(`scn.status.${n.status}`) : n.status}
              </Text>
            </View>
            <Text style={hint}>
              {n.productName || n.productSlug} · {n.external ? t('scn.hostExternal') : t('scn.hostAim')} · {(n.devices || []).join(' + ')}
              {n.region ? ` · ${n.region}` : ''} · max {n.maxConcurrent}
              {n.webhookUrl ? ` · ${t('scn.webhookOn')}` : ''}
              {n.config?.hasWebhookSecret ? ` · ${t('scn.secretOn')}` : ''}
            </Text>
            <View style={styles.wrap}>
              <Pressable style={[styles.small, { borderColor: colors.border }]} onPress={() => void ping(n)}>
                <Text style={{ color: colors.text, fontWeight: '700' }}>{t('scn.ping')}</Text>
              </Pressable>
              <Pressable style={[styles.small, { borderColor: colors.border }]} onPress={() => edit(n)}>
                <Text style={{ color: colors.text, fontWeight: '700' }}>{t('scn.edit')}</Text>
              </Pressable>
              <Pressable style={[styles.small, { borderColor: colors.danger }]} onPress={() => void remove(n)}>
                <Text style={{ color: colors.danger, fontWeight: '700' }}>{t('scn.remove')}</Text>
              </Pressable>
            </View>
          </View>
        ))}
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  title: { fontSize: 24, fontWeight: '700', marginTop: 4 },
  h2: { fontSize: 18, fontWeight: '800', marginTop: 6 },
  card: { borderWidth: 1, borderRadius: 16, padding: 14, gap: 10 },
  label: { fontSize: 12, fontWeight: '700', letterSpacing: 0.3 },
  wrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  switchRow: { flexDirection: 'row', alignItems: 'center', gap: 10, minHeight: 44 },
  notice: { borderWidth: 1, borderRadius: 12, padding: 10 },
  small: { borderWidth: 1, borderRadius: 10, paddingHorizontal: 14, minHeight: 36, justifyContent: 'center' },
});
