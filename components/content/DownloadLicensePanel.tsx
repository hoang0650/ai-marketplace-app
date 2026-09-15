import React, { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import type { IssuedLicense, Product } from '@/api/types';
import { Button } from '@/components/ui/Button';
import { isDatasetCategory } from '@/constants/categories';
import { useTheme } from '@/hooks/useT';
import { useT } from '@/hooks/useT';
import { href } from '@/lib/href';
import { formatDate } from '@/utils/format';

type Props = {
  product: Product;
  canUnlock: boolean;
  license?: IssuedLicense | null;
  onBuy: () => void;
};

export function DownloadLicensePanel({ product, canUnlock, license, onBuy }: Props) {
  const { colors } = useTheme();
  const { t, language } = useT();
  const router = useRouter();
  const [marked, setMarked] = useState(false);
  const dataset = isDatasetCategory(product.category);
  const guide =
    String(product.apiDocsMarkdown || '').trim() ||
    t(dataset ? 'download.guideFallbackDataset' : 'download.guideFallbackSkill');

  return (
    <View style={[styles.wrap, { borderColor: colors.border, backgroundColor: colors.cardBackground }]}>
      <Text style={[styles.title, { color: colors.text }]}>
        {t(dataset ? 'download.tabDataset' : 'download.tabSkill')}
      </Text>
      <Text style={{ color: colors.textSecondary, lineHeight: 20, marginTop: 6 }}>
        {t(dataset ? 'download.drmDataset' : 'download.drmSkill')}
      </Text>

      {license?.licenseKey ? (
        <View style={[styles.keyBox, { borderColor: colors.border, backgroundColor: colors.background }]}>
          <Text style={{ color: colors.textSecondary, fontSize: 11, fontWeight: '700' }}>{t('license.key')}</Text>
          <Text selectable style={{ color: colors.text, fontFamily: 'monospace', fontSize: 15, fontWeight: '800', marginTop: 4 }}>
            {license.licenseKey}
          </Text>
          {license.expiresAt ? (
            <Text style={{ color: colors.textSecondary, marginTop: 6 }}>
              {t('license.expires', { date: formatDate(license.expiresAt, language) })}
            </Text>
          ) : null}
        </View>
      ) : null}

      {!canUnlock ? (
        <>
          <Text style={{ color: colors.text, marginTop: 12, lineHeight: 20 }}>
            {t(dataset ? 'download.paywallDataset' : 'download.paywallSkill')}
          </Text>
          <Button
            title={t(dataset ? 'product.cta.buyDataset' : 'product.cta.buySkill')}
            onPress={onBuy}
            style={{ marginTop: 12 }}
          />
        </>
      ) : (
        <>
          <Button
            title={t(
              marked
                ? dataset
                  ? 'download.markedDataset'
                  : 'download.markedSkill'
                : dataset
                  ? 'download.markDataset'
                  : 'download.markSkill',
            )}
            onPress={() => setMarked(true)}
            style={{ marginTop: 12 }}
          />
          <Pressable onPress={() => router.push(href('/licenses'))} style={{ marginTop: 10, minHeight: 44, justifyContent: 'center' }}>
            <Text style={{ color: colors.tint, fontWeight: '700' }}>{t('license.mine')} →</Text>
          </Pressable>
          {marked ? (
            <Text style={{ color: colors.textSecondary, marginTop: 8, lineHeight: 20 }}>
              {t(dataset ? 'download.hintDataset' : 'download.hintSkill')}
            </Text>
          ) : null}
          <Text style={[styles.guideTitle, { color: colors.text }]}>
            {t(dataset ? 'download.guideDataset' : 'download.guideSkill')}
          </Text>
          <Text selectable style={[styles.guideBody, { color: colors.textSecondary, borderColor: colors.border, backgroundColor: colors.background }]}>
            {guide}
          </Text>
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { borderWidth: 1, borderRadius: 16, padding: 14, marginTop: 16 },
  title: { fontSize: 16, fontWeight: '800' },
  keyBox: { borderWidth: 1, borderRadius: 12, padding: 12, marginTop: 12 },
  guideTitle: { fontSize: 14, fontWeight: '800', marginTop: 16, marginBottom: 8 },
  guideBody: {
    fontFamily: 'monospace',
    fontSize: 12,
    lineHeight: 18,
    padding: 12,
    borderRadius: 10,
    borderWidth: 1,
    overflow: 'hidden',
  },
});
