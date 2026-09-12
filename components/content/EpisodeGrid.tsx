import React, { useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { ChevronRight, Lock, Volume2 } from 'lucide-react-native';
import type { ContentEpisode } from '@/api/types';
import { useT } from '@/hooks/useT';
import { isFilmCategory } from '@/constants/categories';

const PAGE = 50;
const COLS = 6;
const GAP = 8;

type Range = { start: number; end: number; label: string };

function buildRanges(total: number): Range[] {
  if (total <= 0) return [];
  const rows: Range[] = [];
  for (let start = 1; start <= total; start += PAGE) {
    const end = Math.min(start + PAGE - 1, total);
    rows.push({
      start,
      end,
      label: start === end ? String(start) : `${start} - ${end}`,
    });
  }
  return rows;
}

type Props = {
  episodes: ContentEpisode[];
  selectedId?: string;
  locked: boolean;
  unlockingId?: string;
  category?: string;
  onSelect: (ep: ContentEpisode) => void;
};

export function EpisodeGrid({ episodes, selectedId, locked, unlockingId, category, onSelect }: Props) {
  const { t } = useT();
  const sorted = useMemo(() => [...episodes].sort((a, b) => (a.index || 0) - (b.index || 0)), [episodes]);
  const ranges = useMemo(() => buildRanges(sorted.length), [sorted.length]);
  const [rangeIdx, setRangeIdx] = useState(0);
  const [showAll, setShowAll] = useState(false);
  const [width, setWidth] = useState(0);

  if (!sorted.length) {
    return <Text style={styles.empty}>{t('content.empty')}</Text>;
  }

  const range = ranges[Math.min(rangeIdx, Math.max(0, ranges.length - 1))];
  const visible = showAll
    ? sorted
    : sorted.filter((_, i) => i >= (range?.start || 1) - 1 && i < (range?.end || sorted.length));
  const selected = sorted.find((ep) => ep.id === selectedId);
  const allLabel = isFilmCategory(category) ? t('content.allEpisodes') : t('content.allChapters');
  const cell = width > 0 ? Math.floor((width - GAP * (COLS - 1)) / COLS) : 0;

  return (
    <View style={styles.panel} onLayout={(e) => setWidth(e.nativeEvent.layout.width - 24)}>
      <View style={styles.header}>
        <View style={styles.ranges}>
          {ranges.map((item, i) => {
            const active = !showAll && i === rangeIdx;
            return (
              <Pressable
                key={item.label}
                onPress={() => {
                  setShowAll(false);
                  setRangeIdx(i);
                }}
                style={styles.rangeHit}
              >
                <Text style={[styles.rangeText, active && styles.rangeActive]}>{item.label}</Text>
              </Pressable>
            );
          })}
        </View>
        <Pressable onPress={() => setShowAll(true)} style={styles.allHit}>
          <Text style={[styles.allText, showAll && styles.rangeActive]}>{allLabel}</Text>
          <ChevronRight size={16} color={showAll ? '#f2efe8' : 'rgba(242,239,232,0.55)'} />
        </Pressable>
      </View>

      {selected ? (
        <Text style={styles.nowPlaying} numberOfLines={1}>
          {t(isFilmCategory(category) ? 'content.episodeN' : 'content.chapterN', { n: selected.index })}
          {selected.title ? ` · ${selected.title}` : ''}
        </Text>
      ) : null}

      <View style={styles.grid}>
        {visible.map((ep) => {
          const active = ep.id === selectedId;
          const busy = unlockingId === ep.id;
          return (
            <Pressable
              key={ep.id}
              onPress={() => onSelect(ep)}
              style={[
                styles.cell,
                cell ? { width: cell, height: cell } : null,
                active && styles.cellActive,
              ]}
              accessibilityRole="button"
              accessibilityLabel={`${ep.index}. ${ep.title || ''}`}
              accessibilityState={{ selected: active }}
            >
              <Text style={[styles.num, active && styles.numActive]}>{ep.index}</Text>
              {locked && !active ? <Lock size={11} color="rgba(242,239,232,0.55)" style={styles.lock} /> : null}
              {active ? <Volume2 size={12} color="#f2efe8" style={styles.play} /> : null}
              {busy ? <View style={styles.busy} /> : null}
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  panel: {
    backgroundColor: '#141414',
    borderRadius: 16,
    padding: 12,
    marginTop: 4,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
    gap: 8,
  },
  ranges: { flexDirection: 'row', flexWrap: 'wrap', flex: 1, gap: 14 },
  rangeHit: { minHeight: 32, justifyContent: 'center' },
  rangeText: { color: 'rgba(242,239,232,0.5)', fontSize: 15, fontWeight: '700' },
  rangeActive: { color: '#f2efe8' },
  allHit: { flexDirection: 'row', alignItems: 'center', minHeight: 32, gap: 2, flexShrink: 0 },
  allText: { color: 'rgba(242,239,232,0.7)', fontSize: 13, fontWeight: '600' },
  nowPlaying: { color: 'rgba(242,239,232,0.75)', fontSize: 13, marginBottom: 10 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: GAP },
  cell: {
    borderRadius: 14,
    backgroundColor: '#2b2b2b',
    alignItems: 'center',
    justifyContent: 'center',
  },
  cellActive: { backgroundColor: '#7a353c' },
  num: { color: '#f2efe8', fontSize: 16, fontWeight: '700' },
  numActive: { color: '#fff' },
  lock: { position: 'absolute', top: 6, right: 6 },
  play: { position: 'absolute', bottom: 6, right: 6 },
  busy: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    backgroundColor: 'rgba(0,0,0,0.25)',
    borderRadius: 14,
  },
  empty: { color: '#7a756d', marginTop: 4 },
});
