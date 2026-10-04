import React, { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Svg, { Circle, Line, Path, Rect, Text as SvgText } from 'react-native-svg';
import type { AdminDailyPoint } from '@/api/types';
import { useTheme } from '@/hooks/useT';

export type MetricKey = Exclude<keyof AdminDailyPoint, 'date'>;
export type ChartLine = { key: MetricKey; label: string; color: string };

const H = 190;
const PAD = { l: 40, r: 8, t: 10, b: 22 };

/** Round up to 1/2/2.5/5 × 10^n so axis ticks stay readable. */
function niceMax(v: number): number {
  if (v <= 0) return 1;
  const exp = 10 ** Math.floor(Math.log10(v));
  const step = [1, 2, 2.5, 5, 10].find((s) => s * exp >= v) || 10;
  return step * exp;
}

export function compact(v: number): string {
  if (Math.abs(v) >= 1_000_000) return `${+(v / 1_000_000).toFixed(1)}M`;
  if (Math.abs(v) >= 1_000) return `${+(v / 1_000).toFixed(1)}k`;
  return `${+v.toFixed(v < 10 && v % 1 ? 1 : 0)}`;
}

function useFrame(series: AdminDailyPoint[], width: number, max: number) {
  const n = series.length;
  const plotW = Math.max(0, width - PAD.l - PAD.r);
  const plotH = H - PAD.t - PAD.b;
  const colW = plotW / Math.max(1, n);
  const x = (i: number) => PAD.l + colW * (i + 0.5);
  const y = (v: number) => PAD.t + plotH * (1 - Math.min(v, max) / max);
  const step = Math.max(1, Math.ceil(n / 5));
  const labelIdx: number[] = [];
  for (let i = n - 1; i >= 0; i -= step) labelIdx.unshift(i);
  return { colW, x, y, labelIdx, ticks: [0, 0.25, 0.5, 0.75, 1].map((f) => f * max) };
}

function Axes({
  width,
  frame,
  series,
  label,
}: {
  width: number;
  frame: ReturnType<typeof useFrame>;
  series: AdminDailyPoint[];
  label: (date: string) => string;
}) {
  const { colors } = useTheme();
  return (
    <>
      {frame.ticks.map((t, i) => (
        <React.Fragment key={`t${i}`}>
          <Line x1={PAD.l} x2={width - PAD.r} y1={frame.y(t)} y2={frame.y(t)} stroke={colors.border} strokeWidth={1} />
          <SvgText x={PAD.l - 5} y={frame.y(t) + 3} fontSize={9} fill={colors.textSecondary} textAnchor="end">
            {compact(t)}
          </SvgText>
        </React.Fragment>
      ))}
      {frame.labelIdx.map((i) => (
        <SvgText key={`x${i}`} x={frame.x(i)} y={H - 6} fontSize={9} fill={colors.textSecondary} textAnchor="middle">
          {label(series[i].date)}
        </SvgText>
      ))}
    </>
  );
}

/** Multi-line revenue chart; tap a column to inspect it (defaults to the latest period). */
export function RevenueChart({
  series,
  lines,
  label,
  format,
}: {
  series: AdminDailyPoint[];
  lines: ChartLine[];
  label: (date: string, long?: boolean) => string;
  format: (v: number) => string;
}) {
  const { colors } = useTheme();
  const [width, setWidth] = useState(0);
  const [sel, setSel] = useState<number | null>(null);
  const max = niceMax(Math.max(0, ...series.flatMap((p) => lines.map((l) => p[l.key]))));
  const frame = useFrame(series, width, max);
  const idx = sel !== null && sel < series.length ? sel : series.length - 1;
  const point = series[idx];
  const path = (key: MetricKey) =>
    series.map((p, i) => `${i ? 'L' : 'M'}${frame.x(i).toFixed(1)} ${frame.y(p[key]).toFixed(1)}`).join(' ');
  const base = (H - PAD.b).toFixed(1);
  const area = series.length
    ? `${path(lines[0].key)} L${frame.x(series.length - 1).toFixed(1)} ${base} L${frame.x(0).toFixed(1)} ${base} Z`
    : '';

  return (
    <View onLayout={(e) => setWidth(e.nativeEvent.layout.width)}>
      {point ? (
        <View style={[styles.info, { borderColor: colors.border }]}>
          <Text style={{ color: colors.text, fontWeight: '800', fontSize: 12 }}>{label(point.date, true)}</Text>
          <View style={styles.infoRow}>
            {lines.map((l) => (
              <Text key={l.key} style={{ color: colors.textSecondary, fontSize: 12 }}>
                <Text style={{ color: l.color }}>● </Text>
                {l.label}: <Text style={{ color: colors.text, fontWeight: '700' }}>{format(point[l.key])}</Text>
              </Text>
            ))}
          </View>
        </View>
      ) : null}
      {width > 0 ? (
        <Svg width={width} height={H}>
          <Axes width={width} frame={frame} series={series} label={label} />
          <Path d={area} fill={colors.text} fillOpacity={0.06} />
          {lines.map((l) => (
            <Path key={l.key} d={path(l.key)} stroke={l.color} strokeWidth={2} fill="none" strokeLinejoin="round" strokeLinecap="round" />
          ))}
          {point ? (
            <>
              <Line
                x1={frame.x(idx)}
                x2={frame.x(idx)}
                y1={PAD.t}
                y2={H - PAD.b}
                stroke={colors.textSecondary}
                strokeDasharray="3 3"
              />
              {lines.map((l) => (
                <Circle key={l.key} cx={frame.x(idx)} cy={frame.y(point[l.key])} r={3.5} fill={l.color} />
              ))}
            </>
          ) : null}
          {series.map((p, i) => (
            <Rect
              key={p.date}
              x={frame.x(i) - frame.colW / 2}
              y={PAD.t}
              width={frame.colW}
              height={H - PAD.t - PAD.b}
              fill="transparent"
              onPress={() => setSel(i)}
            />
          ))}
        </Svg>
      ) : null}
    </View>
  );
}

/** Bar chart of one metric; tap a bar to inspect it. */
export function BarChart({
  series,
  metric,
  color,
  label,
  format,
}: {
  series: AdminDailyPoint[];
  metric: MetricKey;
  color: string;
  label: (date: string, long?: boolean) => string;
  format: (v: number) => string;
}) {
  const { colors } = useTheme();
  const [width, setWidth] = useState(0);
  const [sel, setSel] = useState<number | null>(null);
  const max = niceMax(Math.max(0, ...series.map((p) => p[metric])));
  const frame = useFrame(series, width, max);
  const barW = Math.max(2, frame.colW * 0.65);
  const idx = sel !== null && sel < series.length ? sel : series.length - 1;
  const point = series[idx];

  return (
    <View onLayout={(e) => setWidth(e.nativeEvent.layout.width)}>
      {point ? (
        <Text style={{ color: colors.textSecondary, fontSize: 12, marginBottom: 4 }}>
          {label(point.date, true)}: <Text style={{ color: colors.text, fontWeight: '800' }}>{format(point[metric])}</Text>
        </Text>
      ) : null}
      {width > 0 ? (
        <Svg width={width} height={H}>
          <Axes width={width} frame={frame} series={series} label={label} />
          {series.map((p, i) => {
            const top = frame.y(p[metric]);
            return (
              <Rect
                key={p.date}
                x={frame.x(i) - barW / 2}
                y={top}
                width={barW}
                height={H - PAD.b - top}
                rx={2}
                fill={color}
                fillOpacity={i === idx ? 1 : 0.75}
              />
            );
          })}
          {series.map((p, i) => (
            <Rect
              key={`hit-${p.date}`}
              x={frame.x(i) - frame.colW / 2}
              y={PAD.t}
              width={frame.colW}
              height={H - PAD.t - PAD.b}
              fill="transparent"
              onPress={() => setSel(i)}
            />
          ))}
        </Svg>
      ) : null}
    </View>
  );
}

export type DonutPart = { label: string; value: number; color: string };

export function Donut({ parts, total, center, caption }: { parts: DonutPart[]; total: number; center: string; caption: string }) {
  const { colors } = useTheme();
  const r = 62;
  const circ = 2 * Math.PI * r;
  const base = Math.max(total, parts.reduce((s, p) => s + p.value, 0)) || 1;
  let offset = 0;
  const segs = parts
    .filter((p) => p.value > 0)
    .map((p) => {
      const len = (p.value / base) * circ;
      const seg = { ...p, len, offset };
      offset += len;
      return seg;
    });
  return (
    <View style={{ alignItems: 'center' }}>
      <Svg width={170} height={170} viewBox="0 0 170 170">
        <Circle cx={85} cy={85} r={r} stroke={colors.border} strokeWidth={20} fill="none" />
        {segs.map((s) => (
          <Circle
            key={s.label}
            cx={85}
            cy={85}
            r={r}
            stroke={s.color}
            strokeWidth={20}
            fill="none"
            strokeDasharray={`${s.len} ${circ - s.len}`}
            strokeDashoffset={-s.offset}
            transform="rotate(-90 85 85)"
          />
        ))}
        <SvgText x={85} y={84} fontSize={20} fontWeight="800" fill={colors.text} textAnchor="middle">
          {center}
        </SvgText>
        <SvgText x={85} y={101} fontSize={10} fill={colors.textSecondary} textAnchor="middle">
          {caption}
        </SvgText>
      </Svg>
    </View>
  );
}

const styles = StyleSheet.create({
  info: { borderWidth: 1, borderRadius: 10, padding: 8, marginBottom: 6, gap: 4 },
  infoRow: { flexDirection: 'row', flexWrap: 'wrap', columnGap: 12, rowGap: 2 },
});
