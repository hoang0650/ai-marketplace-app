import React, { useRef, useState } from 'react';
import { View, Text, ScrollView, StyleSheet, Pressable, ActivityIndicator } from 'react-native';
import { Image } from 'expo-image';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { href } from '@/lib/href';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useMutation, useQuery } from '@tanstack/react-query';
import { productsApi, reviewsApi, contentApi, licensesApi, ordersApi } from '@/api';
import { API_CONFIG } from '@/api/client';
import { useAuth } from '@/hooks/useAuth';
import { useTheme } from '@/hooks/useT';
import { useT } from '@/hooks/useT';
import { useRecentStore } from '@/stores/recentStore';
import { productPrice, availableLicenseTerms, licenseUnitPrice, formatMoney } from '@/utils/format';
import { Badge } from '@/components/ui/Badge';
import { Rating } from '@/components/ui/Rating';
import { Button } from '@/components/ui/Button';
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
  isLicenseCategory,
  isPlaygroundCategory,
  isVoiceCategory,
  categoryLabel,
} from '@/constants/categories';
import { displayFont } from '@/constants/fonts';
import { Chip } from '@/components/ui/Chip';
import type { ContentUnlock, LicenseTerm } from '@/api/types';
import { getErrorMessage } from '@/lib/errors';

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
  const { isAuthenticated, user, isAdmin } = useAuth();
  const { colors } = useTheme();
  const { t, language } = useT();
  const addViewed = useRecentStore((s) => s.addViewed);
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
  const playground = isPlaygroundCategory(p.category);
  const hasAccess = playground ? false : licensed ? !!activeLicense || isOwner : !!paidOrder || isOwner;
  const canPlay = !!activeLicense || isOwner;
  const accessLoading = isAuthenticated && (myLicenses.isLoading || myOrders.isLoading);
  const cta = t(productCtaKey(p, { hasAccess, expiredLicense }));
  const priceCaption = t(productPriceCaptionKey(p, hasAccess));
  const firstEpisode = (episodeList.data || [])[0];

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

  const openOwned = () => {
    if (isComputeStreamCategory(p.category)) {
      router.push(href(`/play/${p.slug}`));
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
    if (isComputeStreamCategory(p.category)) {
      router.push(href(`/play/${p.slug}`));
      return;
    }
    if (hasAccess) {
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
      <ScrollView ref={scrollRef} contentContainerStyle={{ paddingBottom: 120 + insets.bottom }}>
        {p.coverUrl ? (
          <Image source={{ uri: p.coverUrl }} style={styles.cover} contentFit="cover" />
        ) : (
          <View style={[styles.cover, { backgroundColor: colors.luxDark, alignItems: 'center', justifyContent: 'center' }]}>
            <Image source={require('@/assets/images/mark.png')} style={{ width: 88, height: 88, borderRadius: 18 }} />
          </View>
        )}
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

          {isComputeStreamCategory(p.category) ? (
            <View style={{ marginTop: 16 }}>
              <Text style={section(colors.text)}>{t(isGpuComputeCategory(p.category) ? 'compute.play.kickerGpu' : 'compute.play.kicker')}</Text>
              <Text style={{ color: colors.textSecondary, marginBottom: 12, lineHeight: 20 }}>
                {t(isGpuComputeCategory(p.category) ? 'compute.play.hintGpu' : 'compute.play.hint')}
              </Text>
              <Button
                title={t(isGpuComputeCategory(p.category) ? 'compute.cta.terminal' : 'compute.cta.play')}
                onPress={() => {
                  if (!isAuthenticated) {
                    router.push('/auth/login');
                    return;
                  }
                  router.push(href(`/play/${p.slug}`));
                }}
              />
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
        <View>
          <Text style={{ color: colors.textSecondary, fontSize: 11, textTransform: 'uppercase' }}>
            {priceCaption}
          </Text>
          <Text style={{ color: colors.text, fontWeight: '800', fontSize: 18 }}>{hasAccess ? t('product.owned') : priceLabel}</Text>
        </View>
        <View style={{ flexDirection: 'row', gap: 8 }}>
          <WishButton productId={p.id} variant="inline" />
          <Button title={cta} loading={accessLoading} onPress={onPrimaryCta} />
        </View>
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
  bar: { position: 'absolute', left: 0, right: 0, bottom: 0, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingTop: 12, borderTopWidth: 1, gap: 12 },
});
