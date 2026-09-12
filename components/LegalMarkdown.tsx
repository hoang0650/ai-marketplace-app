import React from 'react';
import { Linking, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import type { ThemeColors } from '@/theme/tokens';
import { href } from '@/lib/href';
import { slugFromLegalFile } from '@/constants/legal';

type Block =
  | { type: 'h1' | 'h2' | 'h3' | 'h4' | 'p' | 'quote'; text: string }
  | { type: 'ul' | 'ol'; items: string[] }
  | { type: 'hr' }
  | { type: 'code'; text: string }
  | { type: 'table'; rows: string[][] };

const TOKEN = /(\*\*[^*]+\*\*|`[^`]+`|\[[^\]]+\]\([^)]+\))/g;

function Inline({ text, color, linkColor, base }: { text: string; color: string; linkColor: string; base: object }) {
  const router = useRouter();
  const parts = text.split(TOKEN).filter(Boolean);
  return (
    <>
      {parts.map((part, i) => {
        if (part.startsWith('**') && part.endsWith('**')) {
          return (
            <Text key={i} style={[base, { color, fontWeight: '700' }]}>
              {part.slice(2, -2)}
            </Text>
          );
        }
        if (part.startsWith('`') && part.endsWith('`')) {
          return (
            <Text key={i} style={[base, styles.code, { color }]}>
              {part.slice(1, -1)}
            </Text>
          );
        }
        const link = /^\[([^\]]+)\]\(([^)]+)\)$/.exec(part);
        if (link) {
          const label = link[1];
          const target = link[2];
          const onPress = () => {
            if (/^https?:\/\//i.test(target) || target.startsWith('mailto:')) {
              void Linking.openURL(target);
              return;
            }
            if (target.endsWith('.md')) {
              router.push(href(`/legal/${slugFromLegalFile(target)}`));
              return;
            }
            if (target.startsWith('/legal/')) {
              router.push(href(target));
            }
          };
          return (
            <Text key={i} onPress={onPress} style={[base, { color: linkColor, textDecorationLine: 'underline' }]}>
              {label}
            </Text>
          );
        }
        return (
          <Text key={i} style={[base, { color }]}>
            {part}
          </Text>
        );
      })}
    </>
  );
}

function splitTableRow(line: string): string[] {
  const parts = line.trim().split('|');
  if (parts[0] === '') parts.shift();
  if (parts.length && parts[parts.length - 1] === '') parts.pop();
  return parts.map((c) => c.trim());
}

function emphasisHeading(title: string): string {
  if (/\*\*/.test(title)) return title;
  return title.replace(/^(Điều\s+\d+[.:]?)/i, '**$1**').replace(/^(\d+\.\d+\.?)/, '**$1**');
}

function parseBlocks(source: string): Block[] {
  const lines = source.replace(/\r\n/g, '\n').trim().split('\n');
  const blocks: Block[] = [];
  let i = 0;

  while (i < lines.length) {
    const line = lines[i];
    if (!line.trim()) {
      i += 1;
      continue;
    }
    if (line.startsWith('```')) {
      const buf: string[] = [];
      i += 1;
      while (i < lines.length && !lines[i].startsWith('```')) {
        buf.push(lines[i]);
        i += 1;
      }
      if (i < lines.length) i += 1;
      blocks.push({ type: 'code', text: buf.join('\n') });
      continue;
    }
    if (/^---+$/.test(line.trim())) {
      blocks.push({ type: 'hr' });
      i += 1;
      continue;
    }
    const heading = /^(#{1,4})\s+(.+)$/.exec(line);
    if (heading) {
      const level = heading[1].length as 1 | 2 | 3 | 4;
      blocks.push({ type: `h${level}` as 'h1' | 'h2' | 'h3' | 'h4', text: emphasisHeading(heading[2].trim()) });
      i += 1;
      continue;
    }
    if (line.startsWith('> ')) {
      const quote: string[] = [];
      while (i < lines.length && lines[i].startsWith('> ')) {
        quote.push(lines[i].slice(2));
        i += 1;
      }
      blocks.push({ type: 'quote', text: quote.join(' ') });
      continue;
    }
    if (line.includes('|') && i + 1 < lines.length && /^\s*\|?[\s:|-]+$/.test(lines[i + 1])) {
      const rows: string[][] = [];
      while (i < lines.length && lines[i].includes('|')) {
        const cells = splitTableRow(lines[i]);
        if (!cells.length || cells.every((c) => /^[-:]+$/.test(c))) {
          i += 1;
          continue;
        }
        rows.push(cells);
        i += 1;
      }
      if (rows.length) blocks.push({ type: 'table', rows });
      continue;
    }
    if (/^\s*[-*]\s+/.test(line)) {
      const items: string[] = [];
      while (i < lines.length && /^\s*[-*]\s+/.test(lines[i])) {
        items.push(lines[i].replace(/^\s*[-*]\s+/, ''));
        i += 1;
      }
      blocks.push({ type: 'ul', items });
      continue;
    }
    if (/^\s*\d+\.\s+/.test(line)) {
      const items: string[] = [];
      while (i < lines.length && /^\s*\d+\.\s+/.test(lines[i])) {
        items.push(lines[i].replace(/^\s*\d+\.\s+/, ''));
        i += 1;
      }
      blocks.push({ type: 'ol', items });
      continue;
    }
    const para: string[] = [];
    while (
      i < lines.length &&
      lines[i].trim() &&
      !/^(#{1,4}\s+|[-*]\s+|\d+\.\s+|> |```|---+$)/.test(lines[i]) &&
      !lines[i].includes('|')
    ) {
      para.push(lines[i].trim());
      i += 1;
    }
    if (para.length) blocks.push({ type: 'p', text: para.join(' ') });
  }
  return blocks;
}

export function LegalMarkdown({ content, colors }: { content: string; colors: ThemeColors }) {
  const blocks = parseBlocks(content);
  const inline = (text: string, base: object, color = colors.text) => (
    <Inline text={text} color={color} linkColor={colors.tint} base={base} />
  );

  return (
    <View style={styles.wrap}>
      {blocks.map((b, idx) => {
        if (b.type === 'hr') return <View key={idx} style={[styles.hr, { backgroundColor: colors.border }]} />;
        if (b.type === 'code') {
          return (
            <ScrollView key={idx} horizontal style={[styles.codeBox, { backgroundColor: colors.mist, borderColor: colors.border }]}>
              <Text style={[styles.code, { color: colors.text }]}>{b.text}</Text>
            </ScrollView>
          );
        }
        if (b.type === 'table') {
          return (
            <ScrollView key={idx} horizontal style={[styles.tableWrap, { borderColor: colors.border }]}>
              <View>
                {b.rows.map((row, r) => (
                  <View key={r} style={[styles.tr, { borderColor: colors.border, backgroundColor: r === 0 ? colors.mist : 'transparent' }]}>
                    {row.map((cell, c) => (
                      <Text key={c} style={[r === 0 ? styles.th : styles.td, { color: colors.text, width: 140 }]}>
                        {cell}
                      </Text>
                    ))}
                  </View>
                ))}
              </View>
            </ScrollView>
          );
        }
        if (b.type === 'ul' || b.type === 'ol') {
          return (
            <View key={idx} style={styles.list}>
              {b.items.map((item, j) => (
                <View key={j} style={styles.li}>
                  <Text style={[styles.bullet, { color: colors.tint }]}>{b.type === 'ol' ? `${j + 1}.` : '•'}</Text>
                  <Text style={[styles.body, { color: colors.text, flex: 1 }]}>{inline(item, styles.body)}</Text>
                </View>
              ))}
            </View>
          );
        }
        if (b.type === 'quote') {
          return (
            <View key={idx} style={[styles.quote, { borderColor: colors.tint }]}>
              <Text style={[styles.body, { color: colors.textSecondary }]}>{inline(b.text, styles.body, colors.textSecondary)}</Text>
            </View>
          );
        }
        if (b.type === 'h1' || b.type === 'h2' || b.type === 'h3' || b.type === 'h4' || b.type === 'p') {
          const style = { h1: styles.h1, h2: styles.h2, h3: styles.h3, h4: styles.h4, p: styles.body }[b.type];
          return (
            <Text key={idx} style={[style, { color: colors.text }]}>
              {inline(b.text, style)}
            </Text>
          );
        }
        return null;
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: 12, paddingBottom: 8 },
  h1: { fontSize: 22, fontWeight: '700', lineHeight: 30, includeFontPadding: false },
  h2: { fontSize: 18, fontWeight: '700', lineHeight: 26, marginTop: 8, includeFontPadding: false },
  h3: { fontSize: 16, fontWeight: '700', lineHeight: 24, marginTop: 4, includeFontPadding: false },
  h4: { fontSize: 15, fontWeight: '700', lineHeight: 22, includeFontPadding: false },
  body: { fontSize: 15, fontWeight: '400', lineHeight: 24, includeFontPadding: false },
  code: { fontFamily: 'monospace', fontSize: 13, lineHeight: 20 },
  codeBox: { borderWidth: 1, borderRadius: 10, padding: 12, maxHeight: 220 },
  list: { gap: 8 },
  li: { flexDirection: 'row', gap: 10, paddingLeft: 2 },
  bullet: { width: 18, fontSize: 15, lineHeight: 24, fontWeight: '700' },
  quote: { borderLeftWidth: 3, paddingLeft: 12, paddingVertical: 4 },
  hr: { height: 1, marginVertical: 8 },
  tableWrap: { borderWidth: 1, borderRadius: 10 },
  tr: { flexDirection: 'row', borderBottomWidth: StyleSheet.hairlineWidth },
  th: { fontSize: 12, fontWeight: '800', padding: 8 },
  td: { fontSize: 12, padding: 8, lineHeight: 18 },
});
