import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Modal, View, Text, Pressable, ScrollView, StyleSheet, ActivityIndicator, PanResponder, Platform, useWindowDimensions } from 'react-native';
import { Image } from 'expo-image';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useAudioPlayer, useAudioPlayerStatus } from 'expo-audio';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { apiClient, API_CONFIG } from '@/api/client';
import { contentApi } from '@/api';
import type { ContentEpisode } from '@/api/types';
import { ContentShield } from '@/components/content/ContentShield';

type Bookmark = { id: string; episodeId: string; fraction: number; page: number; kind: 'bookmark' | 'highlight'; quote?: string; color?: string };
type Series = { progress: { episodeId: string; fraction?: number; page?: number } | null; bookmarks?: Bookmark[]; synopsis?: string };
type Settings = { size: number; family: 'serif' | 'sans'; line: number; margin: 0 | 1 | 2; theme: 'light' | 'sepia' | 'dark'; mode: 'scroll' | 'paged' };
const DEF: Settings = { size: 18, family: 'serif', line: 1.7, margin: 1, theme: 'sepia', mode: 'scroll' };
const SKEY = 'aimarkets.reader.settings';
const THEMES = {
  light: { bg: '#ffffff', fg: '#1f1d1a', sub: '#6b665e', bar: '#f6f4f0', acc: '#a8551c', line: '#e6e1d8' },
  sepia: { bg: '#f5ecd9', fg: '#3b2f22', sub: '#7a6a55', bar: '#efe3cb', acc: '#a8551c', line: '#e0d2b6' },
  dark: { bg: '#121212', fg: '#e7e2d9', sub: '#9a948a', bar: '#1c1c1c', acc: '#e09a5c', line: '#2c2c2c' },
};
const SPEEDS = [0.75, 1, 1.25, 1.5, 2];
const serif = Platform.select({ ios: 'Georgia', android: 'serif', default: 'Georgia, "Times New Roman", serif' });
const sans = Platform.select({ ios: 'System', android: 'sans-serif', default: 'system-ui, -apple-system, Segoe UI, sans-serif' });

type Props = {
  visible: boolean;
  slug: string;
  title: string;
  coverUrl?: string;
  synopsis?: string;
  episodes: ContentEpisode[];
  canPlay: boolean;
  isAuthenticated: boolean;
  licenseKey?: string;
  priceLabel: string;
  onClose: () => void;
  onUnlock: () => void;
  onLogin: () => void;
};

type Loaded = { paras: string[]; images: string[] };

function playSrc(token?: string, playUrl?: string, page?: number) {
  if (token) {
    const q = new URLSearchParams({ token });
    if (page && page >= 1) q.set('page', String(page));
    return `${API_CONFIG.BASE_URL}/content/play?${q.toString()}`;
  }
  return String(playUrl || '');
}

export function StoryReader(props: Props) {
  const { visible, slug, episodes, canPlay } = props;
  const insets = useSafeAreaInsets();
  const { width: W, height: H } = useWindowDimensions();
  const [s, setS] = useState<Settings>(DEF);
  const T = THEMES[s.theme];
  const chapters = useMemo(() => episodes.filter((e) => e.kind !== 'audio' && e.kind !== 'video'), [episodes]);
  const narrs = useMemo(() => episodes.filter((e) => e.kind === 'audio'), [episodes]);
  const [idx, setIdx] = useState(0);
  const [chrome, setChrome] = useState(true);
  const [panel, setPanel] = useState<'' | 'toc' | 'settings'>('');
  const [tocTab, setTocTab] = useState<'toc' | 'bm'>('toc');
  const [series, setSeries] = useState<Series | null>(null);
  const [loaded, setLoaded] = useState<Record<string, Loaded>>({});
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState('');
  const [frac, setFrac] = useState(0);
  const [page, setPage] = useState(0);
  const [audioOn, setAudioOn] = useState(false);
  const [audioUri, setAudioUri] = useState('');
  const [speed, setSpeed] = useState(1);
  const scrollRef = useRef<ScrollView>(null);
  const contentH = useRef(1);
  const resumed = useRef(false);
  const ep = chapters[idx];
  const free = (e?: ContentEpisode) => !!(e as { free?: boolean } | undefined)?.free;
  const locked = !!ep && !canPlay && !free(ep);

  useEffect(() => {
    void AsyncStorage.getItem(SKEY).then((v) => v && setS({ ...DEF, ...JSON.parse(v) })).catch(() => {});
  }, []);
  const upd = (patch: Partial<Settings>) =>
    setS((o) => {
      const n = { ...o, ...patch };
      void AsyncStorage.setItem(SKEY, JSON.stringify(n)).catch(() => {});
      return n;
    });

  const loadSeries = useCallback(async () => {
    if (!props.isAuthenticated) return;
    try {
      setSeries(await apiClient.get<Series>(`/content/products/${slug}/series`));
    } catch {
      /* ignore */
    }
  }, [slug, props.isAuthenticated]);
  useEffect(() => {
    if (visible) void loadSeries();
  }, [visible, loadSeries]);

  // resume
  useEffect(() => {
    if (!visible || resumed.current || !chapters.length) return;
    const pr = series?.progress;
    if (props.isAuthenticated && !series) return;
    resumed.current = true;
    const i = pr ? chapters.findIndex((c) => c.id === pr.episodeId) : -1;
    if (i >= 0) {
      setIdx(i);
      setFrac(pr?.fraction || 0);
      setPage(pr?.page || 0);
    }
  }, [visible, series, chapters, props.isAuthenticated]);

  // load chapter
  useEffect(() => {
    if (!visible || !ep || locked || loaded[ep.id]) return;
    let dead = false;
    setLoading(true);
    setErr('');
    (async () => {
      try {
        const res = await contentApi.unlock(ep.id, props.licenseKey);
        const pages = res.pages?.length ? res.pages.map((p) => playSrc(res.playToken, p.playUrl, p.index)) : [playSrc(res.playToken, res.playUrl)];
        let paras: string[] = [];
        let images: string[] = [];
        if (ep.kind === 'text') {
          for (const u of pages) {
            const r = await fetch(u);
            const txt = await r.text();
            const clean = /<\w+/.test(txt) ? txt.replace(/<\/(p|div|h\d|br)>|<br\s*\/?>/gi, '\n\n').replace(/<[^>]+>/g, '') : txt;
            paras.push(...clean.split(/\n\s*\n+/).map((x) => x.trim()).filter(Boolean));
          }
        } else {
          images = pages;
          paras = String(series?.synopsis || props.synopsis || '').split(/\n+/).map((x) => x.trim()).filter(Boolean);
        }
        if (!dead) setLoaded((o) => ({ ...o, [ep.id]: { paras, images } }));
      } catch (e) {
        if (!dead) setErr('Không tải được chương này.');
      } finally {
        if (!dead) setLoading(false);
      }
    })();
    return () => {
      dead = true;
    };
  }, [visible, ep, locked, loaded, props.licenseKey, props.synopsis, series?.synopsis]);

  const L = ep ? loaded[ep.id] : undefined;
  const padX = [16, 28, 48][s.margin] + Math.max(0, (W - 760) / 2);
  const fontFamily = s.family === 'serif' ? serif : sans;
  const lineH = Math.round(s.size * s.line);

  // paged layout: estimate characters per page
  const pages = useMemo(() => {
    if (!L || s.mode !== 'paged') return [] as string[][];
    const usableH = H - insets.top - insets.bottom - 150;
    const usableW = Math.min(W, 760 + padX * 2) - padX * 2;
    const charsPerLine = Math.max(10, Math.floor(usableW / (s.size * 0.52)));
    const linesPerPage = Math.max(4, Math.floor(usableH / lineH));
    const out: string[][] = [];
    let cur: string[] = [];
    let used = L.images.length ? Math.ceil(260 / lineH) : 0;
    for (const p of L.paras) {
      let rest = p;
      while (rest) {
        const need = Math.ceil(rest.length / charsPerLine) + 1;
        if (used + need <= linesPerPage) {
          cur.push(rest);
          used += need;
          rest = '';
        } else {
          const room = (linesPerPage - used - 1) * charsPerLine;
          if (room > charsPerLine * 2) {
            let cut = rest.lastIndexOf(' ', room);
            if (cut < 1) cut = room;
            cur.push(rest.slice(0, cut));
            rest = rest.slice(cut).trim();
          }
          out.push(cur);
          cur = [];
          used = 0;
        }
      }
    }
    if (cur.length || !out.length) out.push(cur);
    return out;
  }, [L, s.mode, s.size, lineH, W, H, padX, insets.top, insets.bottom]);
  const pageCount = s.mode === 'paged' ? Math.max(1, pages.length) : 1;
  const chFrac = s.mode === 'paged' ? (pageCount <= 1 ? 1 : page / (pageCount - 1)) : frac;
  const overall = chapters.length ? (idx + (locked ? 0 : chFrac)) / chapters.length : 0;

  useEffect(() => {
    if (page > pageCount - 1) setPage(pageCount - 1);
  }, [pageCount, page]);

  // save progress (debounced)
  useEffect(() => {
    if (!visible || !ep || !props.isAuthenticated || locked) return;
    const t = setTimeout(() => {
      void apiClient.put(`/content/products/${slug}/progress`, { episodeId: ep.id, fraction: chFrac, page }).catch(() => {});
    }, 1200);
    return () => clearTimeout(t);
  }, [visible, ep, chFrac, page, slug, props.isAuthenticated, locked]);

  const goChapter = (i: number, toEnd = false) => {
    if (i < 0 || i >= chapters.length) return;
    setIdx(i);
    setFrac(0);
    setPage(toEnd ? 9999 : 0);
    scrollRef.current?.scrollTo({ y: 0, animated: false });
  };
  const flip = (d: 1 | -1) => {
    if (s.mode === 'paged' && !locked) {
      const n = page + d;
      if (n >= 0 && n < pageCount) return setPage(n);
    }
    if (d > 0) goChapter(idx + 1);
    else goChapter(idx - 1, true);
  };

  const pan = useMemo(
    () =>
      PanResponder.create({
        onMoveShouldSetPanResponder: (_e, g) => Math.abs(g.dx) > 24 && Math.abs(g.dx) > Math.abs(g.dy) * 1.5,
        onPanResponderRelease: (_e, g) => {
          if (g.dx < -50) flip(1);
          else if (g.dx > 50) flip(-1);
        },
      }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [page, pageCount, idx, s.mode, locked, chapters.length],
  );
  const onTap = (x: number) => {
    if (panel) return setPanel('');
    if (x < W * 0.28) flip(-1);
    else if (x > W * 0.72) flip(1);
    else setChrome((c) => !c);
  };

  // web: keyboard + no-capture
  useEffect(() => {
    if (Platform.OS !== 'web' || !visible || typeof window === 'undefined') return;
    const key = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && ['c', 'p', 's'].includes(e.key.toLowerCase())) return e.preventDefault();
      if (e.key === 'ArrowRight' || e.key === 'PageDown') flip(1);
      else if (e.key === 'ArrowLeft' || e.key === 'PageUp') flip(-1);
      else if (e.key === 'Escape') panel ? setPanel('') : props.onClose();
    };
    const block = (e: Event) => e.preventDefault();
    window.addEventListener('keydown', key);
    document.addEventListener('contextmenu', block);
    document.addEventListener('copy', block);
    return () => {
      window.removeEventListener('keydown', key);
      document.removeEventListener('contextmenu', block);
      document.removeEventListener('copy', block);
    };
  });

  // bookmarks
  const bms = series?.bookmarks || [];
  const here = bms.find((b) => b.kind === 'bookmark' && ep && b.episodeId === ep.id && Math.abs(b.fraction - chFrac) < 0.06);
  const toggleBm = async () => {
    if (!props.isAuthenticated) return props.onLogin();
    if (!ep || locked) return;
    try {
      if (here) await apiClient.delete(`/content/products/${slug}/bookmarks/${here.id}`);
      else await apiClient.post(`/content/products/${slug}/bookmarks`, { episodeId: ep.id, fraction: chFrac, page, kind: 'bookmark' });
      await loadSeries();
    } catch {
      /* ignore */
    }
  };
  const highlight = async (quote: string) => {
    if (!props.isAuthenticated || !ep || locked) return;
    try {
      await apiClient.post(`/content/products/${slug}/bookmarks`, { episodeId: ep.id, fraction: chFrac, page, kind: 'highlight', quote: quote.slice(0, 600), color: 'yellow' });
      await loadSeries();
    } catch {
      /* ignore */
    }
  };
  const hl = new Set(bms.filter((b) => b.kind === 'highlight' && ep && b.episodeId === ep.id).map((b) => b.quote));
  const removeBm = async (id: string) => {
    await apiClient.delete(`/content/products/${slug}/bookmarks/${id}`).catch(() => {});
    await loadSeries();
  };

  // narration
  const openNarration = async () => {
    if (!narrs.length) return;
    setAudioOn((o) => !o);
    if (audioUri || !canPlay) return;
    try {
      const res = await contentApi.unlock(narrs[0].id, props.licenseKey);
      setAudioUri(playSrc(res.playToken, res.playUrl));
    } catch {
      setErr('Không mở được sách nói.');
    }
  };

  const paraStyle = { color: T.fg, fontSize: s.size, lineHeight: lineH, fontFamily, marginBottom: Math.round(s.size * 0.9) } as const;
  const renderPara = (t: string, i: number, active: boolean) => (
    <Text
      key={i}
      selectable={false}
      onLongPress={() => void highlight(t)}
      style={[paraStyle, hl.has(t) && { backgroundColor: s.theme === 'dark' ? '#5a4a1a' : '#fbe7a1' }, active && { backgroundColor: s.theme === 'dark' ? '#2b3a2b' : '#e4f0d8' }]}
    >
      {t}
    </Text>
  );

  if (!visible) return null;
  const allParas = L?.paras || [];
  return (
    <Modal visible animationType="slide" presentationStyle="fullScreen" onRequestClose={props.onClose} statusBarTranslucent>
      <View testID="story-reader" style={[st.root, { backgroundColor: T.bg }, Platform.OS === 'web' && ({ userSelect: 'none' } as object)]}>
        <ContentShield enabled={canPlay} />
        {/* body */}
        <View style={{ flex: 1 }} {...pan.panHandlers}>
          {locked ? (
            <Pressable testID="rd-locked" style={st.center} onPress={(e) => onTap(e.nativeEvent.pageX)}>
              <Text style={{ fontSize: 48 }}>🔒</Text>
              <Text style={[st.h1, { color: T.fg, fontFamily: serif }]}>{ep?.title}</Text>
              <Text style={{ color: T.sub, marginVertical: 10, textAlign: 'center' }}>Chương {idx + 1} cần mở khóa để đọc tiếp.</Text>
              <Pressable testID="rd-unlock" style={[st.cta, { backgroundColor: T.acc }]} onPress={props.isAuthenticated ? props.onUnlock : props.onLogin}>
                <Text style={st.ctaT}>{props.isAuthenticated ? `Mở khóa cả truyện · ${props.priceLabel}` : 'Đăng nhập để đọc'}</Text>
              </Pressable>
            </Pressable>
          ) : loading && !L ? (
            <View style={st.center}>
              <ActivityIndicator color={T.acc} />
            </View>
          ) : s.mode === 'paged' ? (
            <Pressable testID="rd-body" style={{ flex: 1, paddingHorizontal: padX, paddingTop: insets.top + 64, paddingBottom: insets.bottom + 80 }} onPress={(e) => onTap(e.nativeEvent.pageX)}>
              {page === 0 ? <Text style={[st.h1, { color: T.fg, fontFamily }]}>{ep?.title}</Text> : null}
              {page === 0 && L?.images.map((u) => <Image key={u} source={{ uri: u }} style={st.img} contentFit="contain" />)}
              {(pages[page] || []).map((t, i) => renderPara(t, i, false))}
            </Pressable>
          ) : (
            <ScrollView
              ref={scrollRef}
              testID="rd-body"
              scrollEventThrottle={64}
              onContentSizeChange={(_w, h) => {
                contentH.current = h;
                if (frac > 0) scrollRef.current?.scrollTo({ y: frac * Math.max(0, h - H), animated: false });
              }}
              onScroll={(e) => {
                const { contentOffset, contentSize, layoutMeasurement } = e.nativeEvent;
                const max = Math.max(1, contentSize.height - layoutMeasurement.height);
                setFrac(Math.min(1, Math.max(0, contentOffset.y / max)));
              }}
              contentContainerStyle={{ paddingHorizontal: padX, paddingTop: insets.top + 64, paddingBottom: insets.bottom + 120 }}
            >
              <Pressable onPress={(e) => onTap(e.nativeEvent.pageX)}>
                <Text style={[st.h1, { color: T.fg, fontFamily }]}>{ep?.title}</Text>
                {L?.images.map((u) => <Image key={u} source={{ uri: u }} style={st.img} contentFit="contain" />)}
                {allParas.map((t, i) => renderPara(t, i, false))}
                {err ? <Text style={{ color: T.acc }}>{err}</Text> : null}
                {idx < chapters.length - 1 ? (
                  <Pressable testID="rd-next-end" style={[st.cta, { backgroundColor: T.acc, alignSelf: 'center', marginTop: 12 }]} onPress={() => goChapter(idx + 1)}>
                    <Text style={st.ctaT}>Chương tiếp theo →</Text>
                  </Pressable>
                ) : (
                  <Text style={{ color: T.sub, textAlign: 'center', marginTop: 12 }}>— Hết —</Text>
                )}
              </Pressable>
            </ScrollView>
          )}
        </View>

        {/* top bar */}
        {chrome ? (
          <View testID="rd-top" style={[st.top, { paddingTop: insets.top + 6, backgroundColor: T.bar, borderColor: T.line }]}>
            <Pressable testID="rd-back" accessibilityLabel="Quay lại" style={st.ib} onPress={props.onClose}>
              <Text style={[st.ibT, { color: T.fg }]}>←</Text>
            </Pressable>
            <View style={{ flex: 1, minWidth: 0 }}>
              <Text numberOfLines={1} style={{ color: T.fg, fontWeight: '700' }}>{props.title}</Text>
              <Text numberOfLines={1} style={{ color: T.sub, fontSize: 12 }}>{ep?.title}</Text>
            </View>
            <Pressable testID="rd-toc-btn" accessibilityLabel="Mục lục" style={st.ib} onPress={() => setPanel(panel === 'toc' ? '' : 'toc')}>
              <Text style={[st.ibT, { color: T.fg }]}>☰</Text>
            </Pressable>
            <Pressable testID="rd-bm-btn" accessibilityLabel="Dấu trang" style={st.ib} onPress={toggleBm}>
              <Text style={[st.ibT, { opacity: locked ? 0.4 : 1 }]}>{here ? '🔖' : '🏷️'}</Text>
            </Pressable>
            {narrs.length ? (
              <Pressable testID="rd-audio-btn" accessibilityLabel="Sách nói" style={[st.ib, audioOn && { backgroundColor: T.line }]} onPress={openNarration}>
                <Text style={st.ibT}>🎧</Text>
              </Pressable>
            ) : null}
            <Pressable testID="rd-settings-btn" accessibilityLabel="Cài đặt" style={[st.ib, panel === 'settings' && { backgroundColor: T.line }]} onPress={() => setPanel(panel === 'settings' ? '' : 'settings')}>
              <Text style={[st.ibT, { color: T.fg, fontFamily: serif, fontWeight: '700' }]}>Aa</Text>
            </Pressable>
          </View>
        ) : null}

        {/* narration */}
        {audioOn ? (
          <View style={[st.audioWrap, { bottom: (chrome ? 74 : 12) + insets.bottom }]}>
            {canPlay && audioUri ? (
              <Narration uri={audioUri} T={T} speed={speed} onSpeed={setSpeed} title={narrs[0]?.title || ''} />
            ) : (
              <View testID="rd-audio" style={[st.audio, { backgroundColor: T.bar, borderColor: T.line }]}>
                <Text style={{ color: T.sub, flex: 1 }}>{canPlay ? 'Đang tải sách nói…' : '🔒 Sách nói cần mở khóa.'}</Text>
              </View>
            )}
          </View>
        ) : null}

        {/* bottom bar */}
        {chrome ? (
          <View testID="rd-bottom" style={[st.bottom, { paddingBottom: insets.bottom + 8, backgroundColor: T.bar, borderColor: T.line }]}>
            <View style={[st.track, { backgroundColor: T.line }]}>
              <View testID="rd-progress-fill" style={{ width: `${Math.round(overall * 100)}%`, height: '100%', backgroundColor: T.acc, borderRadius: 2 }} />
            </View>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <Pressable testID="rd-prev-ch" style={st.ib} disabled={idx <= 0} onPress={() => goChapter(idx - 1)}>
                <Text style={[st.ibT, { color: T.fg, opacity: idx <= 0 ? 0.3 : 1 }]}>‹</Text>
              </Pressable>
              <Text testID="rd-progress" style={{ flex: 1, color: T.sub, fontSize: 12, textAlign: 'center' }}>
                {`Chương ${idx + 1}/${chapters.length} · ${Math.round((locked ? 0 : chFrac) * 100)}%`}
                {s.mode === 'paged' && !locked ? `  ·  Trang ${page + 1}/${pageCount}` : ''}
                {`  ·  Cả truyện ${Math.round(overall * 100)}%`}
              </Text>
              <Pressable testID="rd-next-ch" style={st.ib} disabled={idx >= chapters.length - 1} onPress={() => goChapter(idx + 1)}>
                <Text style={[st.ibT, { color: T.fg, opacity: idx >= chapters.length - 1 ? 0.3 : 1 }]}>›</Text>
              </Pressable>
            </View>
          </View>
        ) : null}

        {/* panels */}
        {panel ? <Pressable style={st.scrim} onPress={() => setPanel('')} /> : null}
        {panel === 'toc' ? (
          <View testID="rd-toc" style={[st.drawer, { backgroundColor: T.bar, paddingTop: insets.top + 8, paddingBottom: insets.bottom + 8, width: Math.min(340, W * 0.86) }]}>
            <View style={{ flexDirection: 'row', gap: 6, paddingHorizontal: 10, marginBottom: 8 }}>
              <Pressable style={[st.tab, tocTab === 'toc' && { backgroundColor: T.line }]} onPress={() => setTocTab('toc')}>
                <Text style={{ color: T.fg, fontWeight: '700' }}>Mục lục</Text>
              </Pressable>
              <Pressable testID="rd-bm-tab" style={[st.tab, tocTab === 'bm' && { backgroundColor: T.line }]} onPress={() => setTocTab('bm')}>
                <Text style={{ color: T.fg, fontWeight: '700' }}>Dấu trang · {bms.length}</Text>
              </Pressable>
              <View style={{ flex: 1 }} />
              <Pressable style={st.ib} onPress={() => setPanel('')}>
                <Text style={[st.ibT, { color: T.fg }]}>✕</Text>
              </Pressable>
            </View>
            <ScrollView>
              {tocTab === 'toc' ? (
                <>
                  {props.coverUrl ? <Image source={{ uri: props.coverUrl }} style={st.tocCover} contentFit="cover" /> : null}
                  {chapters.map((c, i) => {
                    const lk = !canPlay && !free(c);
                    return (
                      <Pressable key={c.id} testID={`rd-toc-${i}`} style={[st.row, i === idx && { backgroundColor: T.line }]} onPress={() => { goChapter(i); setPanel(''); }}>
                        <Text style={[st.num, { color: T.fg, backgroundColor: T.line }]}>{i + 1}</Text>
                        <View style={{ flex: 1 }}>
                          <Text style={{ color: T.fg }} numberOfLines={2}>{c.title}</Text>
                          {i === idx ? <Text style={{ color: T.acc, fontSize: 11 }}>Đang đọc · {Math.round(chFrac * 100)}%</Text> : null}
                        </View>
                        <Text style={[st.tag, { color: lk ? T.sub : '#2f7d32', backgroundColor: T.line }]}>{lk ? '🔒' : free(c) && !canPlay ? 'Miễn phí' : '✓'}</Text>
                      </Pressable>
                    );
                  })}
                  {narrs.map((n) => (
                    <Pressable key={n.id} style={st.row} onPress={() => { setPanel(''); void openNarration(); }}>
                      <Text style={[st.num, { backgroundColor: T.line }]}>🎧</Text>
                      <View style={{ flex: 1 }}>
                        <Text style={{ color: T.fg }}>{n.title}</Text>
                        <Text style={{ color: T.acc, fontSize: 11 }}>Sách nói · {fmt(n.durationSec || 0)}</Text>
                      </View>
                      <Text style={[st.tag, { backgroundColor: T.line }]}>{canPlay ? '▶' : '🔒'}</Text>
                    </Pressable>
                  ))}
                  <Text style={{ color: T.sub, fontSize: 11, padding: 10 }}>Chương 🔒 cần license để đọc. Nội dung được bảo vệ: không chụp / sao chép. Tải bản .aimc ở trang sản phẩm.</Text>
                </>
              ) : bms.length ? (
                bms.map((b) => {
                  const ci = chapters.findIndex((c) => c.id === b.episodeId);
                  return (
                    <View key={b.id} style={st.row}>
                      <Pressable style={{ flex: 1 }} onPress={() => { if (ci >= 0) { setIdx(ci); setFrac(b.fraction); setPage(b.page); } setPanel(''); }}>
                        <Text style={{ color: T.fg }}>{b.kind === 'highlight' ? '🖍 ' : '🔖 '}Chương {ci + 1} · {Math.round(b.fraction * 100)}%</Text>
                        {b.quote ? <Text numberOfLines={2} style={{ color: T.sub, fontSize: 12 }}>“{b.quote}”</Text> : null}
                      </Pressable>
                      <Pressable style={st.ib} onPress={() => void removeBm(b.id)}>
                        <Text style={{ color: T.sub }}>✕</Text>
                      </Pressable>
                    </View>
                  );
                })
              ) : (
                <Text style={{ color: T.sub, padding: 12 }}>Chưa có dấu trang. Nhấn 🏷️ để đánh dấu, nhấn giữ một đoạn để tô sáng.</Text>
              )}
            </ScrollView>
          </View>
        ) : null}
        {panel === 'settings' ? (
          <View testID="rd-settings" style={[st.sheet, { backgroundColor: T.bar, paddingBottom: insets.bottom + 14 }]}>
            <Row label="Cỡ chữ" T={T}>
              <Seg T={T} items={[['−', 'A−'], ['n', String(s.size)], ['+', 'A+']]} on="" onPick={(k) => k !== 'n' && upd({ size: Math.max(14, Math.min(30, s.size + (k === '+' ? 1 : -1))) })} ids={{ '+': 'rd-font-up', '−': 'rd-font-down' }} />
            </Row>
            <Row label="Phông" T={T}>
              <Seg T={T} items={[['serif', 'Serif'], ['sans', 'Sans']]} on={s.family} onPick={(k) => upd({ family: k as Settings['family'] })} />
            </Row>
            <Row label="Giãn dòng" T={T}>
              <Seg T={T} items={[['1.4', 'Hẹp'], ['1.7', 'Vừa'], ['2', 'Rộng']]} on={String(s.line)} onPick={(k) => upd({ line: Number(k) })} />
            </Row>
            <Row label="Lề" T={T}>
              <Seg T={T} items={[['0', 'Hẹp'], ['1', 'Vừa'], ['2', 'Rộng']]} on={String(s.margin)} onPick={(k) => upd({ margin: Number(k) as Settings['margin'] })} />
            </Row>
            <Row label="Giao diện" T={T}>
              <View style={{ flexDirection: 'row', gap: 8 }}>
                {(['light', 'sepia', 'dark'] as const).map((k) => (
                  <Pressable key={k} testID={`rd-theme-${k}`} onPress={() => upd({ theme: k })} style={[st.sw, { backgroundColor: THEMES[k].bg, borderColor: s.theme === k ? T.acc : T.line }]}>
                    <Text style={{ color: THEMES[k].fg, fontWeight: '700' }}>{k === 'light' ? 'Sáng' : k === 'sepia' ? 'Sepia' : 'Tối'}</Text>
                  </Pressable>
                ))}
              </View>
            </Row>
            <Row label="Chế độ" T={T}>
              <Seg T={T} items={[['scroll', '↕ Cuộn'], ['paged', '⇆ Lật trang']]} on={s.mode} onPick={(k) => { upd({ mode: k as Settings['mode'] }); setPage(0); }} ids={{ scroll: 'rd-mode-scroll', paged: 'rd-mode-paged' }} />
            </Row>
            <Text style={{ color: T.sub, fontSize: 12, marginTop: 6 }}>Chạm trái / phải để lật trang, chạm giữa để ẩn / hiện thanh công cụ. Vuốt ngang cũng lật trang.</Text>
          </View>
        ) : null}
      </View>
    </Modal>
  );
}

function fmt(sec: number) {
  const s = Math.max(0, Math.floor(sec));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
}

function Narration({ uri, T, speed, onSpeed, title }: { uri: string; T: (typeof THEMES)['light']; speed: number; onSpeed: (n: number) => void; title: string }) {
  const player = useAudioPlayer({ uri });
  const status = useAudioPlayerStatus(player);
  useEffect(() => {
    try {
      player.setPlaybackRate(speed, 'high');
    } catch {
      /* ignore */
    }
  }, [player, speed]);
  const dur = status.duration || 0;
  const pos = status.currentTime || 0;
  return (
    <View testID="rd-audio" style={[st.audio, { backgroundColor: T.bar, borderColor: T.line }]}>
      <Pressable testID="rd-play" accessibilityLabel={status.playing ? 'Tạm dừng' : 'Phát'} style={[st.play, { backgroundColor: T.acc }]} onPress={() => (status.playing ? player.pause() : player.play())}>
        <Text style={{ color: '#fff', fontSize: 16 }}>{status.playing ? '❚❚' : '▶'}</Text>
      </Pressable>
      <Pressable style={st.ib} onPress={() => player.seekTo(Math.max(0, pos - 10))}>
        <Text style={{ color: T.fg }}>↺10</Text>
      </Pressable>
      <View style={{ flex: 1, minWidth: 0 }}>
        <Text numberOfLines={1} style={{ color: T.fg, fontSize: 12 }}>{title}</Text>
        <View style={[st.track, { backgroundColor: T.line, marginVertical: 4 }]}>
          <View style={{ width: `${dur ? Math.round((pos / dur) * 100) : 0}%`, height: '100%', backgroundColor: T.acc }} />
        </View>
        <Text testID="rd-audio-time" style={{ color: T.sub, fontSize: 11 }}>{fmt(pos)} / {fmt(dur)}</Text>
      </View>
      <Pressable testID="rd-speed" style={[st.speed, { borderColor: T.line }]} onPress={() => onSpeed(SPEEDS[(SPEEDS.indexOf(speed) + 1) % SPEEDS.length])}>
        <Text style={{ color: T.fg, fontWeight: '700' }}>{speed}×</Text>
      </Pressable>
    </View>
  );
}

function Row({ label, T, children }: { label: string; T: (typeof THEMES)['light']; children: React.ReactNode }) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginVertical: 7, gap: 8 }}>
      <Text style={{ color: T.fg }}>{label}</Text>
      {children}
    </View>
  );
}
function Seg({ T, items, on, onPick, ids }: { T: (typeof THEMES)['light']; items: [string, string][]; on: string; onPick: (k: string) => void; ids?: Record<string, string> }) {
  return (
    <View style={{ flexDirection: 'row', backgroundColor: T.line, borderRadius: 10, padding: 3 }}>
      {items.map(([k, l]) => (
        <Pressable key={k} testID={ids?.[k]} onPress={() => onPick(k)} style={[{ paddingHorizontal: 13, minHeight: 40, justifyContent: 'center', borderRadius: 8 }, on === k && { backgroundColor: T.bg }]}>
          <Text style={{ color: T.fg, fontWeight: on === k || k === 'n' ? '700' : '400' }}>{l}</Text>
        </Pressable>
      ))}
    </View>
  );
}

const st = StyleSheet.create({
  root: { flex: 1 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 },
  h1: { fontSize: 22, fontWeight: '700', marginBottom: 14, textAlign: 'center' },
  img: { width: '100%', height: 260, borderRadius: 10, marginBottom: 16 },
  cta: { paddingHorizontal: 22, minHeight: 46, borderRadius: 23, justifyContent: 'center' },
  ctaT: { color: '#fff', fontWeight: '700' },
  top: { position: 'absolute', left: 0, right: 0, top: 0, flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 8, paddingBottom: 6, borderBottomWidth: StyleSheet.hairlineWidth },
  bottom: { position: 'absolute', left: 0, right: 0, bottom: 0, paddingHorizontal: 10, paddingTop: 8, borderTopWidth: StyleSheet.hairlineWidth },
  ib: { minWidth: 44, minHeight: 44, alignItems: 'center', justifyContent: 'center', borderRadius: 10 },
  ibT: { fontSize: 20 },
  track: { height: 4, borderRadius: 2, overflow: 'hidden', marginBottom: 4 },
  scrim: { position: 'absolute', left: 0, right: 0, top: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.35)' },
  drawer: { position: 'absolute', left: 0, top: 0, bottom: 0 },
  sheet: { position: 'absolute', left: 0, right: 0, bottom: 0, borderTopLeftRadius: 18, borderTopRightRadius: 18, padding: 16, maxWidth: 560, alignSelf: 'center', width: '100%' },
  tab: { paddingHorizontal: 10, minHeight: 36, justifyContent: 'center', borderRadius: 8 },
  tocCover: { height: 110, marginHorizontal: 10, borderRadius: 10, marginBottom: 8 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 10, paddingVertical: 10 },
  num: { width: 28, height: 28, borderRadius: 14, textAlign: 'center', lineHeight: 28, overflow: 'hidden' },
  tag: { fontSize: 11, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8, overflow: 'hidden' },
  sw: { paddingHorizontal: 14, minHeight: 42, justifyContent: 'center', borderRadius: 10, borderWidth: 2 },
  audioWrap: { position: 'absolute', left: 10, right: 10, alignItems: 'center' },
  audio: { flexDirection: 'row', alignItems: 'center', gap: 8, padding: 8, borderRadius: 14, borderWidth: 1, width: '100%', maxWidth: 620 },
  play: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
  speed: { minWidth: 52, minHeight: 40, borderWidth: 1, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
});
