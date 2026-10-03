import React, { useMemo, useRef, useState } from 'react';
import { View, Text, ScrollView, StyleSheet, Pressable, ActivityIndicator, Alert, Linking } from 'react-native';
import { Image } from 'expo-image';
import { Redirect, Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { MessageSquare, Play, ShoppingCart } from 'lucide-react-native';
import { href } from '@/lib/href';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useMutation, useQuery } from '@tanstack/react-query';
import { productsApi, reviewsApi, contentApi, licensesApi, ordersApi, chatApi, builderApi, hireApi } from '@/api';
import { API_CONFIG } from '@/api/client';
import { useAuth } from '@/hooks/useAuth';
import { useTheme, useT } from '@/hooks/useT';
import { agentForHireSlug, agentGatewayKey } from '@/constants/agents';
import { useAgentLaunch } from '@/hooks/useAgentGateway';
import { useRecentStore } from '@/stores/recentStore';
import { useCartStore } from '@/stores/cartStore';
import { productPrice, availableLicenseTerms, licenseUnitPrice, formatMoney } from '@/utils/format';
import { Badge } from '@/components/ui/Badge';
import { Rating } from '@/components/ui/Rating';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { NativeMediaPlayer } from '@/components/content/NativeMediaPlayer';
import { EpisodeGrid } from '@/components/content/EpisodeGrid';
import { ProductWorkspace } from '@/components/product/ProductWorkspace';
import { DownloadLicensePanel } from '@/components/content/DownloadLicensePanel';
import { WishButton } from '@/components/content/WishButton';
import { ContentShield } from '@/components/content/ContentShield';
import { AnalyticsService } from '@/lib/analytics';
import { findActiveLicense, findExpiredLicense, findPaidOrder, productCtaKey, productPriceCaptionKey } from '@/lib/access';
import {
  isComputeStreamCategory,
  isGpuComputeCategory,
  isContentCategory,
  isDownloadLicenseCategory,
  isFilmCategory,
  isHiddenCategory,
  isHireAgentCategory,
  isHireRequestCategory,
  isLicenseCategory,
  isPlaygroundCategory,
  isTemplateCategory,
  isVoiceCategory,
  categoryLabel,
} from '@/constants/categories';
import { displayFont } from '@/constants/fonts';
import { Chip } from '@/components/ui/Chip';
import type { ContentUnlock, LicenseTerm, StreamDevice } from '@/api/types';
import { ApiError, getErrorMessage } from '@/lib/errors';

function playSrc(res: { playToken?: string; playUrl?: string }, page?: number): string {
  const token = String(res.playToken || '').trim();
  let pageQ = page;
  const raw = String(res.playUrl || '').trim();
  if (pageQ == null && raw) {
    try {
      const u = new URL(raw, API_CONFIG.BASE_URL);
      const fromQuery = Number(u.searchParams.get('page') || 0);
      if (fromQuery >= 1) pageQ = fromQuery;
    } catch {
      /* ignore */
    }
  }
  if (token) {
    const q = new URLSearchParams({ token });
    if (pageQ && pageQ >= 1) q.set('page', String(pageQ));
    return `${API_CONFIG.BASE_URL}/content/play?${q.toString()}`;
  }
  return raw;
}

export default function ProductScreen() {
  const { slug } = useLocalSearchParams<{ slug: string }>();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { isAuthenticated, user, isAdmin, isInitialized } = useAuth();
  const { colors } = useTheme();
  const { t, language } = useT();
  /** Resolve the hired agent from the product slug so NanoClaw/SpaceBot launch their own gateway. */
  const hireAgent = useMemo(() => agentForHireSlug(slug), [slug]);
  const { opening: openingAgent, launch: launchAgent } = useAgentLaunch(hireAgent);
  const addViewed = useRecentStore((s) => s.addViewed);
  const addToCart = useCartStore((s) => s.add);
  const [licenseTerm, setLicenseTerm] = useState<LicenseTerm>('month');
  const scrollRef = useRef<ScrollView>(null);
  const playOffset = useRef(0);
  const downloadOffset = useRef(0);
  const q = useQuery({
    queryKey: ['product', slug],
    queryFn: async () => {
      const p = await productsApi.one(String(slug));
      addViewed(String(slug));
      return p;
    },
    enabled: !!slug,
  });
  const inCart = useCartStore((s) =>
    s.lines.some((l) => l.product.id === q.data?.id || l.product.slug === String(slug)),
  );
  const reviews = useQuery({ queryKey: ['reviews', q.data?.id], queryFn: () => reviewsApi.list(q.data!.id), enabled: !!q.data?.id });
  const episodeList = useQuery({
    queryKey: ['content-episodes', slug],
    queryFn: () => contentApi.episodes(String(slug)),
    enabled: !!slug && !!q.data && isContentCategory(q.data.category),
  });
  const myLicenses = useQuery({
    queryKey: ['licenses'],
    queryFn: licensesApi.me,
    enabled: isAuthenticated,
  });
  const myOrders = useQuery({
    queryKey: ['orders'],
    queryFn: ordersApi.list,
    enabled: isAuthenticated,
  });
  const [playUrl, setPlayUrl] = useState('');
  const [playKind, setPlayKind] = useState('');
  const [playMime, setPlayMime] = useState('');
  const [playPages, setPlayPages] = useState<string[]>([]);
  const [pageIndex, setPageIndex] = useState(0);
  const [playError, setPlayError] = useState('');
  const [selectedEpisodeId, setSelectedEpisodeId] = useState('');
  const [chatBusy, setChatBusy] = useState(false);
  const hireOffset = useRef(0);
  const [hireBrief, setHireBrief] = useState('');
  const [hireBudget, setHireBudget] = useState('');
  const [hireDeadline, setHireDeadline] = useState('');
  const [hireBusy, setHireBusy] = useState(false);
  const [hireError, setHireError] = useState('');
  const unlock = useMutation({
    mutationFn: ({ episodeId, licenseKey }: { episodeId: string; licenseKey?: string }) => contentApi.unlock(episodeId, licenseKey),
    onSuccess: (res: ContentUnlock, vars) => {
      setPlayError('');
      setSelectedEpisodeId(vars.episodeId);
      const pages = (res.pages?.length ? res.pages : [{ index: 1, playUrl: res.playUrl }])
        .map((pg) => playSrc({ playToken: res.playToken, playUrl: pg.playUrl }, pg.index))
        .filter(Boolean);
      setPlayPages(pages);
      setPageIndex(0);
      setPlayUrl(pages[0] || playSrc(res));
      setPlayKind(res.kind);
      setPlayMime(res.mime || '');
    },
    onError: (err) => {
      setPlayUrl('');
      setPlayPages([]);
      setPlayMime('');
      setPlayError(getErrorMessage(err, language));
    },
  });
  const templateInfo = useQuery({
    queryKey: ['builder-template', q.data?.id],
    queryFn: () => builderApi.template(q.data!.id),
    enabled: !!q.data && isTemplateCategory(q.data.category),
  });
  const templateStart = useMutation({
    mutationFn: (productId: string) => builderApi.useTemplate(productId),
    onSuccess: (res) => router.push(href(`/builder/${res.project.id}`)),
    onError: (err, productId) => {
      if (err instanceof ApiError && err.code === 'TEMPLATE_PURCHASE_REQUIRED') {
        router.push(href(`/checkout/${productId}`));
        return;
      }
      Alert.alert('', getErrorMessage(err, language));
    },
  });

  const p = q.data;
  if (q.isLoading || !p) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.background }}>
        <Stack.Screen options={{ title: '' }} />
        <ActivityIndicator color={colors.tint} />
      </View>
    );
  }

  const seller = p.sellerName || p.creatorName;
  const runtime = p.runtime || {};
  const licensed = isLicenseCategory(p.category);
  const terms = licensed ? availableLicenseTerms(p) : [];
  const selectedTerm = terms.includes(licenseTerm) ? licenseTerm : terms[0] || 'month';
  const episodeCount = Number(p.contentMeta?.episodeCount) || 0;
  const priceLabel = licensed
    ? `${formatMoney(licenseUnitPrice(p, selectedTerm), p.pricing?.currency || 'USD')} / ${t(`license.term.${selectedTerm}`)}`
    : productPrice(p);
  const activeLicense = findActiveLicense(myLicenses.data, p.id);
  const expiredLicense = !activeLicense && !!findExpiredLicense(myLicenses.data, p.id);
  const paidOrder = findPaidOrder(myOrders.data, p.id);
  const isOwner =
    isAdmin ||
    (!!user?.id &&
      ((!!p.creatorId && String(p.creatorId) === String(user.id)) || (!!p.creatorSlug && p.creatorSlug === user.creatorSlug)));
  if (isHiddenCategory(p.category) && !isOwner) {
    if (!isInitialized) {
      return (
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.background }}>
          <ActivityIndicator color={colors.tint} />
        </View>
      );
    }
    return <Redirect href="/(tabs)/explore" />;
  }
  const playground = isPlaygroundCategory(p.category);
  const hireRequest = isHireRequestCategory(p.category);
  const hasAccess = playground || hireRequest ? false : licensed ? !!activeLicense || isOwner : !!paidOrder || isOwner;
  const template = isTemplateCategory(p.category);
  const templateFree = template && (p.pricing?.model === 'free' || !Number(p.pricing?.price || 0));
  const canPlay = !!activeLicense || isOwner;
  const accessLoading = isAuthenticated && (myLicenses.isLoading || myOrders.isLoading);
  const cta = hireAgent
    ? t(`${agentGatewayKey(hireAgent)}.open`)
    : hireRequest
      ? t(isOwner ? 'hire.list.title' : 'hire.req.cta')
      : template
      ? t(hasAccess || templateFree ? 'builder.tpl.use' : 'builder.tpl.buyUse')
      : isHireAgentCategory(p.category, p.slug)
      ? t('agents.browse')
      : t(productCtaKey(p, { hasAccess, expiredLicense }));
  const priceCaption = t(hireRequest ? 'hire.req.listPrice' : productPriceCaptionKey(p, hasAccess));
  const firstEpisode = (episodeList.data || [])[0];
  const streamProduct = isComputeStreamCategory(p.category);
  const streamDevices: StreamDevice[] = p.streaming?.devices?.length ? p.streaming.devices : ['pc', 'mobile'];
  const platformRental = !!p.streaming?.platformRental;
  const showCart = !playground && !hireRequest && !isOwner && !hasAccess && !templateFree;

  const submitHireRequest = async () => {
    if (!isAuthenticated) {
      router.push('/auth/login');
      return;
    }
    const brief = hireBrief.trim();
    if (brief.length < 20) {
      setHireError(t('hire.req.briefShort'));
      return;
    }
    const deadline = hireDeadline.trim();
    if (deadline && !/^\d{4}-\d{2}-\d{2}$/.test(deadline)) {
      setHireError(t('hire.dateFmt'));
      return;
    }
    setHireBusy(true);
    setHireError('');
    try {
      const project = await hireApi.request({
        productId: p.id,
        brief,
        budget: Number(hireBudget) > 0 ? Number(hireBudget) : undefined,
        desiredDeadline: deadline || undefined,
      });
      router.push(href(`/hire/${project.id}`));
    } catch (err) {
      const existing = err instanceof ApiError && err.code === 'HIRE_ALREADY_OPEN' ? err.details?.projectId : null;
      if (existing) {
        router.push(href(`/hire/${String(existing)}`));
        return;
      }
      setHireError(getErrorMessage(err, language));
    } finally {
      setHireBusy(false);
    }
  };

  const startSellerChat = async () => {
    if (!isAuthenticated) {
      router.push('/auth/login');
      return;
    }
    if (isOwner) return;
    setChatBusy(true);
    try {
      const c = await chatApi.start({ productId: p.id });
      router.push(href(`/chat/${c.id}`));
    } catch (err) {
      Alert.alert('', getErrorMessage(err, language));
    } finally {
      setChatBusy(false);
    }
  };

  if (playground) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.background }}>
        <Stack.Screen options={{ title: p.name }} />
        <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 40 + insets.bottom }}>
          <View style={{ flexDirection: 'row', gap: 12, marginBottom: 8, alignItems: 'center' }}>
            {p.coverUrl ? (
              <Image source={{ uri: p.coverUrl }} style={styles.thumb} contentFit="cover" />
            ) : (
              <View style={[styles.thumb, { backgroundColor: colors.luxDark, alignItems: 'center', justifyContent: 'center' }]}>
                <Image source={require('@/assets/images/mark.png')} style={{ width: 36, height: 36, borderRadius: 8 }} />
              </View>
            )}
            <View style={{ flex: 1, minWidth: 0 }}>
              <Text style={{ color: colors.text, fontSize: 18, fontFamily: displayFont, fontWeight: '600' }} numberOfLines={2}>
                {p.name}
              </Text>
              <Text style={{ color: colors.textSecondary, marginTop: 2, fontSize: 12 }}>
                {categoryLabel(p.category, t, p.category)}
              </Text>
              <Text style={{ color: '#c0392b', fontWeight: '800', marginTop: 4 }}>{priceLabel}</Text>
            </View>
            <WishButton productId={p.id} variant="inline" />
            {!isOwner ? (
              <Pressable
                onPress={startSellerChat}
                disabled={chatBusy}
                accessibilityRole="button"
                accessibilityLabel={t('chat.withSeller')}
                style={{ minWidth: 44, minHeight: 44, alignItems: 'center', justifyContent: 'center' }}
              >
                {chatBusy ? <ActivityIndicator color={colors.tint} /> : <MessageSquare size={22} color={colors.text} />}
              </Pressable>
            ) : null}
          </View>
          <ProductWorkspace
            key={p.id}
            product={p}
            isAuthenticated={isAuthenticated}
            onNeedAuth={() => router.push('/auth/login')}
            onNeedWallet={() => router.push('/wallet')}
            onWriteReview={() =>
              router.push(href(`/reviews/create?productId=${p.id}&name=${encodeURIComponent(p.name)}`))
            }
          />
        </ScrollView>
      </View>
    );
  }

  /** App = mobile stream flow; platform GPU listings open a platform GPU workspace instead. */
  const openStream = () => {
    if (platformRental) {
      const offer = p.streaming?.rentalOfferId || '';
      router.push(href(`/gpu${offer ? `?offer=${encodeURIComponent(offer)}` : ''}`));
      return;
    }
    if (!streamDevices.includes('mobile')) {
      Alert.alert('', t('compute.device.pcOnly'), [
        { text: t('common.cancel'), style: 'cancel' },
        {
          text: t('compute.device.openWeb'),
          onPress: () => void Linking.openURL(`https://aimarkets.vn/play/${encodeURIComponent(p.slug)}`),
        },
      ]);
      return;
    }
    router.push(href(`/play/${p.slug}`));
  };

  const openOwned = () => {
    if (template) {
      templateStart.mutate(p.id);
      return;
    }
    if (isComputeStreamCategory(p.category)) {
      openStream();
      return;
    }
    if (isContentCategory(p.category)) {
      scrollRef.current?.scrollTo({ y: Math.max(0, playOffset.current - 12), animated: true });
      if (canPlay && firstEpisode && !playUrl) {
        setSelectedEpisodeId(firstEpisode.id);
        unlock.mutate({ episodeId: firstEpisode.id, licenseKey: activeLicense?.licenseKey });
      }
      return;
    }
    if (isDownloadLicenseCategory(p.category)) {
      scrollRef.current?.scrollTo({ y: Math.max(0, downloadOffset.current - 12), animated: true });
      return;
    }
    if (licensed) {
      router.push(href('/licenses'));
      return;
    }
    if (paidOrder?.id) {
      router.push(href(`/order/${paidOrder.id}`));
      return;
    }
    router.push(href('/orders'));
  };

  const onPrimaryCta = () => {
    if (!isAuthenticated) {
      router.push('/auth/login');
      return;
    }
    if (hireAgent) {
      void launchAgent();
      return;
    }
    if (hireRequest) {
      if (isOwner) router.push(href('/hire?as=seller'));
      else scrollRef.current?.scrollTo({ y: Math.max(0, hireOffset.current - 12), animated: true });
      return;
    }
    // Generic hire-agent listing without a launchable catalog entry (kept as before).
    if (isHireAgentCategory(p.category, p.slug)) {
      router.push(href('/agents'));
      return;
    }
    if (isComputeStreamCategory(p.category)) {
      openStream();
      return;
    }
    if (hasAccess || templateFree) {
      openOwned();
      return;
    }
    AnalyticsService.track('checkout_started', { id: p.id });
    router.push(href(`/checkout/${p.id}${licensed ? `?term=${selectedTerm}` : ''}`));
  };

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <Stack.Screen options={{ title: p.name }} />
      <ContentShield enabled={isContentCategory(p.category) && !!playUrl} />
      <ScrollView ref={scrollRef} contentContainerStyle={{ paddingBottom: 148 + insets.bottom }}>
        <Pressable
          onPress={streamProduct ? onPrimaryCta : undefined}
          disabled={!streamProduct}
          accessibilityRole={streamProduct ? 'button' : undefined}
          accessibilityLabel={streamProduct ? cta : undefined}
        >
          {p.coverUrl ? (
            <Image source={{ uri: p.coverUrl }} style={styles.cover} contentFit="cover" />
          ) : (
            <View style={[styles.cover, { backgroundColor: colors.luxDark, alignItems: 'center', justifyContent: 'center' }]}>
              <Image source={require('@/assets/images/mark.png')} style={{ width: 88, height: 88, borderRadius: 18 }} />
            </View>
          )}
          {streamProduct ? (
            <View style={styles.playOverlay} pointerEvents="none">
              <View style={styles.playBtn}>
                <Play size={28} color="#111111" fill="#111111" />
              </View>
            </View>
          ) : null}
        </Pressable>
        <View style={{ padding: 16 }}>
          <Text style={{ color: colors.tint, fontWeight: '800', letterSpacing: 0.6, textTransform: 'uppercase', fontSize: 11 }}>
            {categoryLabel(p.category, t, p.category)}
          </Text>
          <Text style={{ color: colors.text, fontSize: 24, fontFamily: displayFont, fontWeight: '600', marginTop: 8 }}>{p.name}</Text>
          {seller ? (
            <Pressable onPress={() => p.creatorSlug && router.push(href(`/seller/${p.creatorSlug}`))}>
              <Text style={{ color: colors.textSecondary, marginTop: 6 }}>{seller}</Text>
            </Pressable>
          ) : null}
          {p.ownershipType === 'PLATFORM_DIRECT' ? <Badge label={t('common.verified')} /> : null}
          {hasAccess ? <Badge label={t('product.owned')} /> : null}
          {episodeCount ? (
            <Text style={{ color: colors.textSecondary, marginTop: 8 }}>
              {t(isFilmCategory(p.category) ? 'license.episodes' : 'license.chapters', { n: episodeCount })}
            </Text>
          ) : null}
          <Rating value={p.rating} count={p.reviewCount} />
          {isVoiceCategory(p.category) && p.contentMeta?.voiceSampleUrl ? (
            <View style={{ marginTop: 12 }}>
              <Text style={{ color: colors.textSecondary, marginBottom: 6 }}>Sample giọng đọc</Text>
              <NativeMediaPlayer uri={String(p.contentMeta.voiceSampleUrl)} kind="audio" />
            </View>
          ) : null}
          {licensed && !hasAccess ? (
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 14 }}>
              {terms.map((item) => (
                <Chip
                  key={item}
                  label={`${t(`license.term.${item}`)} · ${formatMoney(licenseUnitPrice(p, item), p.pricing?.currency || 'USD')}`}
                  active={selectedTerm === item}
                  onPress={() => setLicenseTerm(item)}
                />
              ))}
            </View>
          ) : null}
          <Text style={{ color: colors.text, fontSize: 22, fontWeight: '800', marginTop: 12 }}>{hasAccess ? t('product.owned') : priceLabel}</Text>
          {hasAccess ? (
            <Text style={{ color: colors.textSecondary, marginTop: 8, lineHeight: 20 }}>
              {t(isDownloadLicenseCategory(p.category) ? 'download.ownedHint' : 'product.ownedHint')}
            </Text>
          ) : licensed ? (
            <Text style={{ color: colors.textSecondary, marginTop: 8, lineHeight: 20 }}>
              {t(isDownloadLicenseCategory(p.category) ? 'download.licenseHint' : 'checkout.licenseHint')}
            </Text>
          ) : null}

          {template ? (
            <View style={{ marginTop: 16 }}>
              <Text style={section(colors.text)}>{t('builder.tpl.kicker')}</Text>
              <Text style={{ color: colors.textSecondary, lineHeight: 20 }}>
                {t(hasAccess || templateFree ? 'builder.tpl.ownedHint' : 'builder.tpl.buyHint')}
              </Text>
              {templateInfo.data?.template ? (
                <Text style={{ color: colors.textSecondary, marginTop: 6, fontSize: 12 }}>
                  {t('builder.tpl.stats', {
                    files: templateInfo.data.template.fileCount,
                    version: templateInfo.data.template.version,
                    uses: templateInfo.data.template.useCount,
                  })}
                </Text>
              ) : null}
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 10 }}>
                {hasAccess || templateFree ? (
                  <Chip
                    label={templateStart.isPending ? t('builder.tpl.opening') : t('builder.tpl.use')}
                    active
                    onPress={() => (isAuthenticated ? templateStart.mutate(p.id) : router.push('/auth/login'))}
                  />
                ) : null}
                {templateInfo.data?.template.demoUrl ? (
                  <Chip label={t('builder.tpl.demo')} onPress={() => void Linking.openURL(templateInfo.data!.template.demoUrl)} />
                ) : null}
              </View>
            </View>
          ) : null}

          {hireRequest ? (
            <View
              style={{ marginTop: 16 }}
              onLayout={(e) => {
                hireOffset.current = styles.cover.height + e.nativeEvent.layout.y;
              }}
            >
              <Text style={section(colors.text)}>{t('hire.req.title')}</Text>
              {(['step1', 'step2', 'step3', 'step4'] as const).map((k, i) => (
                <Text key={k} style={{ color: colors.textSecondary, lineHeight: 20, marginBottom: 6 }}>
                  {i + 1}. {t(`hire.req.${k}`)}
                </Text>
              ))}
              <Text style={{ color: colors.textSecondary, fontSize: 12, marginTop: 4, marginBottom: 12 }}>
                {t(p.pricing?.negotiable === false ? 'hire.req.fixedHint' : 'hire.req.negotiableHint')}
              </Text>
              {isOwner ? (
                <Text style={{ color: colors.text, lineHeight: 20 }}>{t('hire.req.own')}</Text>
              ) : (
                <>
                  <Input
                    label={t('hire.req.brief')}
                    placeholder={t('hire.req.briefPh')}
                    value={hireBrief}
                    onChangeText={setHireBrief}
                    multiline
                    numberOfLines={5}
                    textAlignVertical="top"
                    style={{ minHeight: 120 }}
                    maxLength={4000}
                  />
                  <Input
                    label={t('hire.req.budget')}
                    placeholder={String(p.pricing?.price || '')}
                    value={hireBudget}
                    onChangeText={setHireBudget}
                    keyboardType="decimal-pad"
                  />
                  <Input
                    label={t('hire.req.deadline')}
                    placeholder="YYYY-MM-DD"
                    value={hireDeadline}
                    onChangeText={setHireDeadline}
                    autoCapitalize="none"
                    maxLength={10}
                  />
                  {hireError ? <Text style={{ color: colors.danger, marginBottom: 10 }}>{hireError}</Text> : null}
                  <Button
                    title={hireBusy ? t('hire.req.sending') : t('hire.req.send')}
                    loading={hireBusy}
                    onPress={() => void submitHireRequest()}
                  />
                  <Text style={{ color: colors.textSecondary, fontSize: 12, marginTop: 8, lineHeight: 18 }}>
                    {t('hire.req.escrowHint')}
                  </Text>
                </>
              )}
            </View>
          ) : null}

          {isComputeStreamCategory(p.category) ? (
            <View style={{ marginTop: 16 }}>
              <Text style={section(colors.text)}>{t(isGpuComputeCategory(p.category) ? 'compute.play.kickerGpu' : 'compute.play.kicker')}</Text>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 8 }}>
                <Badge label={t(p.soldByPlatform ? 'compute.supply.platform' : 'compute.supply.seller')} />
                {streamDevices.map((d) => (
                  <Badge key={d} label={t(`compute.device.${d}`)} />
                ))}
              </View>
              <Text style={{ color: colors.textSecondary, lineHeight: 20 }}>
                {platformRental
                  ? t('compute.stream.platformRental')
                  : !streamDevices.includes('mobile')
                    ? t('compute.device.pcOnly')
                    : t(isGpuComputeCategory(p.category) ? 'compute.play.hintGpu' : 'compute.play.hint')}
              </Text>
            </View>
          ) : null}

          {isContentCategory(p.category) ? (
            <View
              style={{ marginTop: 16 }}
              onLayout={(e) => {
                playOffset.current = styles.cover.height + e.nativeEvent.layout.y;
              }}
            >
              <Text style={section(colors.text)}>{t('content.play')}</Text>
              {!canPlay ? (
                <Text style={{ color: colors.textSecondary, marginBottom: 8, lineHeight: 20 }}>{t('content.paywall')}</Text>
              ) : (
                <Text style={{ color: colors.textSecondary, marginBottom: 8, lineHeight: 20 }}>{t('content.captureHint')}</Text>
              )}
                    {playError ? <Text style={{ color: colors.tint, marginBottom: 8 }}>{playError}</Text> : null}
                    {playUrl ? (
                      playKind === 'image' ? (
                        <View style={{ marginBottom: 12 }}>
                          <Pressable
                            onPress={() => {
                              const next = Math.min(playPages.length - 1, pageIndex + 1);
                              setPageIndex(next);
                              setPlayUrl(playPages[next] || playUrl);
                            }}
                          >
                            <Image
                              source={{ uri: playUrl }}
                              style={{ width: '100%', height: 320, borderRadius: 12 }}
                              contentFit="contain"
                              accessible={false}
                              pointerEvents="none"
                            />
                          </Pressable>
                          {playPages.length > 1 ? (
                            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 8 }}>
                              <Button
                                title={t('content.prevPage')}
                                onPress={() => {
                                  const next = Math.max(0, pageIndex - 1);
                                  setPageIndex(next);
                                  setPlayUrl(playPages[next] || playUrl);
                                }}
                                disabled={pageIndex <= 0}
                              />
                              <Text style={{ color: colors.text, fontWeight: '700' }}>
                                {t('content.page', { n: pageIndex + 1, total: playPages.length })}
                              </Text>
                              <Button
                                title={t('content.nextPage')}
                                onPress={() => {
                                  const next = Math.min(playPages.length - 1, pageIndex + 1);
                                  setPageIndex(next);
                                  setPlayUrl(playPages[next] || playUrl);
                                }}
                                disabled={pageIndex >= playPages.length - 1}
                              />
                            </View>
                          ) : null}
                        </View>
                      ) : (
                        <NativeMediaPlayer
                          key={playUrl}
                          uri={playUrl}
                          kind={playKind || 'video'}
                          mime={playMime}
                          protect
                          onError={() => setPlayError(t('content.playFailed'))}
                        />
                      )
                    ) : null}
                    {(episodeList.data || []).length ? (
                      <EpisodeGrid
                        episodes={episodeList.data || []}
                        selectedId={selectedEpisodeId || unlock.variables?.episodeId}
                        locked={!canPlay}
                        unlockingId={unlock.isPending ? unlock.variables?.episodeId : ''}
                        category={p.category}
                        onSelect={(ep) => {
                          if (!isAuthenticated) {
                            router.push('/auth/login');
                            return;
                          }
                          if (!canPlay) {
                            setPlayError(t('content.locked'));
                            return;
                          }
                          setSelectedEpisodeId(ep.id);
                          unlock.mutate({ episodeId: ep.id, licenseKey: activeLicense?.licenseKey });
                        }}
                      />
                    ) : (
                      <Text style={{ color: colors.textSecondary }}>{t('content.empty')}</Text>
                    )}
            </View>
          ) : null}

          {isDownloadLicenseCategory(p.category) ? (
            <View
              onLayout={(e) => {
                downloadOffset.current = styles.cover.height + e.nativeEvent.layout.y;
              }}
            >
              <DownloadLicensePanel
                product={p}
                canUnlock={canPlay}
                license={activeLicense}
                onBuy={() => {
                  if (!isAuthenticated) {
                    router.push('/auth/login');
                    return;
                  }
                  AnalyticsService.track('checkout_started', { id: p.id });
                  router.push(href(`/checkout/${p.id}?term=${selectedTerm}`));
                }}
              />
            </View>
          ) : null}

          <Text style={section(colors.text)}>{t('product.overview')}</Text>
          <Text style={{ color: colors.text, lineHeight: 22 }}>{p.tagline || p.description}</Text>
          {p.description && p.tagline ? <Text style={{ color: colors.textSecondary, marginTop: 10, lineHeight: 22 }}>{p.description}</Text> : null}

          {p.license ? (
            <>
              <Text style={section(colors.text)}>{t('product.license')}</Text>
              <Text style={{ color: colors.textSecondary }}>{p.license}</Text>
            </>
          ) : null}
          {p.termsSummary ? (
            <>
              <Text style={section(colors.text)}>{t('product.terms')}</Text>
              <Text style={{ color: colors.textSecondary }}>{p.termsSummary}</Text>
            </>
          ) : null}

          {Object.keys(runtime).length ? (
            <>
              <Text style={section(colors.text)}>{t('product.specs')}</Text>
              {Object.entries(runtime).slice(0, 12).map(([k, v]) => {
                if (/(secret|key|password|token)/i.test(k)) return null;
                return (
                  <Text key={k} style={{ color: colors.textSecondary, marginTop: 4 }}>
                    {k}: {typeof v === 'string' || typeof v === 'number' ? String(v) : '—'}
                  </Text>
                );
              })}
            </>
          ) : null}

          <Text style={section(colors.text)}>{t('product.reviews')}</Text>
          {(reviews.data || []).slice(0, 5).map((r) => (
            <View key={r.id} style={{ marginBottom: 10 }}>
              <Text style={{ color: colors.text, fontWeight: '700' }}>{r.userName} · ★ {r.rating}</Text>
              <Text style={{ color: colors.textSecondary }}>{r.body || r.title}</Text>
            </View>
          ))}
          {isAuthenticated ? (
            <Button
              title={t('review.title')}
              variant="outline"
              onPress={() => router.push(href(`/reviews/create?productId=${p.id}&name=${encodeURIComponent(p.name)}`))}
            />
          ) : null}
        </View>
      </ScrollView>
      <View style={[styles.bar, { backgroundColor: colors.surface, borderTopColor: colors.border, paddingBottom: Math.max(insets.bottom, 12) }]}>
        <View style={styles.barTop}>
          <View style={{ flex: 1, minWidth: 0, paddingRight: 8 }}>
            <Text style={{ color: colors.textSecondary, fontSize: 11, textTransform: 'uppercase' }} numberOfLines={1}>
              {priceCaption}
            </Text>
            <Text style={{ color: colors.text, fontWeight: '800', fontSize: 18 }} numberOfLines={1}>
              {hasAccess ? t('product.owned') : priceLabel}
            </Text>
          </View>
          <View style={styles.barIcons}>
            {!isOwner ? (
              <Pressable
                onPress={startSellerChat}
                disabled={chatBusy}
                accessibilityRole="button"
                accessibilityLabel={t('chat.withSeller')}
                style={styles.iconBtn}
              >
                {chatBusy ? <ActivityIndicator color={colors.tint} /> : <MessageSquare size={22} color={colors.text} />}
              </Pressable>
            ) : null}
            <WishButton productId={p.id} variant="inline" />
            {showCart ? (
              <Pressable
                onPress={() => {
                  if (inCart) {
                    router.push(href('/cart'));
                    return;
                  }
                  addToCart(p);
                }}
                accessibilityRole="button"
                accessibilityLabel={inCart ? t('cart.view') : t('cart.add')}
                style={styles.iconBtn}
              >
                <ShoppingCart size={22} color={inCart ? colors.tint : colors.text} />
              </Pressable>
            ) : null}
          </View>
        </View>
        <Button
          title={cta}
          loading={accessLoading || openingAgent}
          onPress={onPrimaryCta}
          style={styles.barCta}
        />
      </View>
    </View>
  );
}

function section(color: string) {
  return { color, fontWeight: '800' as const, marginTop: 22, marginBottom: 8, fontSize: 16 };
}

const styles = StyleSheet.create({
  cover: { width: '100%', height: 280 },
  thumb: { width: 72, height: 72, borderRadius: 10 },
  playOverlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(17,17,17,0.28)',
  },
  playBtn: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#c9a961',
    alignItems: 'center',
    justifyContent: 'center',
  },
  bar: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    paddingHorizontal: 16,
    paddingTop: 10,
    borderTopWidth: 1,
    gap: 10,
  },
  barTop: { flexDirection: 'row', alignItems: 'center' },
  barIcons: { flexDirection: 'row', alignItems: 'center' },
  iconBtn: { minWidth: 44, minHeight: 44, alignItems: 'center', justifyContent: 'center' },
  barCta: { alignSelf: 'stretch' },
});
