import React, { useState } from 'react';
import { Pressable, ScrollView, Share, StyleSheet, Text, View } from 'react-native';
import { Image } from 'expo-image';
import { useQuery } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import { productsApi, reviewsApi } from '@/api';
import type { Product } from '@/api/types';
import { PlaygroundPanel } from '@/components/content/PlaygroundPanel';
import { Button } from '@/components/ui/Button';
import { Chip } from '@/components/ui/Chip';
import { categoryLabel, isPlaygroundCategory } from '@/constants/categories';
import { usePlayground, type PlaygroundState } from '@/hooks/usePlayground';
import { useTheme } from '@/hooks/useT';
import { useT } from '@/hooks/useT';
import { href } from '@/lib/href';
import { displayRuntime } from '@/lib/runpod-urls';
import { formatDate, productPrice } from '@/utils/format';

type Tab = 'playground' | 'api' | 'overview' | 'reviews';

type Props = {
  product: Product;
  isAuthenticated: boolean;
  onNeedAuth: () => void;
  onNeedWallet: () => void;
  onWriteReview: () => void;
};

export function ProductWorkspace({ product, isAuthenticated, onNeedAuth, onNeedWallet, onWriteReview }: Props) {
  const { colors } = useTheme();
  const { t, language } = useT();
  const router = useRouter();
  const [tab, setTab] = useState<Tab>('playground');
  const pg = usePlayground(product, isAuthenticated);
  const related = useQuery({
    queryKey: ['related', product.category, product.id],
    queryFn: () => productsApi.list({ category: product.category, limit: 8 }),
  });
  const peers = (related.data || []).filter((x) => x.id !== product.id).slice(0, 6);

  return (
    <View>
      {peers.length ? (
        <View style={{ marginBottom: 8 }}>
          <View style={styles.relatedHead}>
            <Text style={[styles.relatedTitle, { color: colors.text }]}>{t('pd.related')}</Text>
            <Text style={{ color: colors.textSecondary, fontSize: 12 }}>{t('pd.swipe')}</Text>
          </View>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 10, paddingBottom: 8 }}>
            {peers.map((item) => (
              <Pressable
                key={item.id}
                onPress={() => router.push(href(`/product/${item.slug}`))}
                style={[styles.relatedCard, { borderColor: colors.border, backgroundColor: colors.cardBackground }]}
              >
                {item.coverUrl ? (
                  <Image source={{ uri: item.coverUrl }} style={styles.relatedCover} contentFit="cover" />
                ) : (
                  <View style={[styles.relatedCover, { backgroundColor: colors.luxDark }]} />
                )}
                <View style={{ flex: 1, minWidth: 0 }}>
                  <Text style={{ color: colors.text, fontWeight: '700' }} numberOfLines={1}>
                    {item.name}
                  </Text>
                  <Text style={{ color: colors.textSecondary, fontSize: 11 }} numberOfLines={1}>
                    {categoryLabel(item.category, t, item.category)}
                  </Text>
                  <Text style={{ color: '#c0392b', fontWeight: '800', fontSize: 12 }}>{productPrice(item)}</Text>
                </View>
              </Pressable>
            ))}
          </ScrollView>
        </View>
      ) : null}

      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.tabs}>
        {(['playground', 'api', 'overview', 'reviews'] as Tab[]).map((id) => (
          <Pressable key={id} onPress={() => setTab(id)} style={[styles.tab, tab === id ? { borderBottomColor: colors.text } : null]}>
            <Text style={{ color: tab === id ? colors.text : colors.textSecondary, fontWeight: tab === id ? '800' : '600' }}>
              {t(`pd.tab.${id}`)}
            </Text>
          </Pressable>
        ))}
      </ScrollView>

      {tab === 'playground' && isPlaygroundCategory(product.category) ? (
        <PlaygroundPanel
          product={product}
          pg={pg}
          isAuthenticated={isAuthenticated}
          onNeedAuth={onNeedAuth}
          onNeedWallet={onNeedWallet}
        />
      ) : null}
      {tab === 'api' ? <ApiTab product={product} pg={pg} /> : null}
      {tab === 'overview' ? <OverviewTab product={product} /> : null}
      {tab === 'reviews' ? <ReviewsTab product={product} isAuthenticated={isAuthenticated} onWriteReview={onWriteReview} /> : null}
    </View>
  );
}

function ApiTab({ product, pg }: { product: Product; pg: PlaygroundState }) {
  const { colors } = useTheme();
  const [copied, setCopied] = useState(false);
  const [showKeys, setShowKeys] = useState(false);
  const [keys, setKeys] = useState<Array<{ id: string; name: string; prefix: string }>>([]);
  const snippet = pg.apiSnippet();

  return (
    <View style={[styles.pane, { borderColor: colors.border, backgroundColor: colors.cardBackground }]}>
      <View style={styles.apiBar}>
        <Pressable
          onPress={() => {
            const secret = `phai_${Math.random().toString(36).slice(2)}${Math.random().toString(36).slice(2)}`;
            setKeys((list) => [{ id: secret, name: `Key ${list.length + 1}`, prefix: `${secret.slice(0, 12)}…` }, ...list]);
            setShowKeys(true);
          }}
          style={{ minHeight: 44, justifyContent: 'center' }}
        >
          <Text style={{ color: colors.text, fontWeight: '700' }}>+ Create an API key</Text>
        </Pressable>
        <Pressable onPress={() => setShowKeys(!showKeys)} style={{ minHeight: 44, justifyContent: 'center' }}>
          <Text style={{ color: colors.tint, fontWeight: '700' }}>{showKeys ? 'Hide keys' : 'All API keys'} →</Text>
        </Pressable>
      </View>
      {showKeys ? (
        <Text style={{ color: colors.textSecondary, marginBottom: 12 }}>
          {keys.length ? keys.map((k) => `${k.prefix} · ${k.name}`).join('\n') : 'No keys yet — create one to call this model.'}
        </Text>
      ) : null}

      <View style={styles.wrap}>
        {(['curl', 'python', 'javascript'] as const).map((id) => (
          <Chip key={id} label={id === 'curl' ? 'cURL' : id === 'python' ? 'Python' : 'JavaScript'} active={pg.apiClient === id} onPress={() => pg.setApiClient(id)} />
        ))}
      </View>
      <View style={styles.wrap}>
        {(['POST', 'GET'] as const).map((id) => (
          <Chip key={id} label={id} active={pg.apiMethod === id} onPress={() => pg.setApiMethod(id)} />
        ))}
        {(['run', 'runsync', 'status'] as const).map((id) => (
          <Chip key={id} label={`/${id}`} active={pg.apiAction === id} onPress={() => pg.setApiAction(id)} />
        ))}
      </View>
      <Pressable
        onPress={async () => {
          await Share.share({ message: snippet });
          setCopied(true);
        }}
        style={{ alignSelf: 'flex-end', minHeight: 44, justifyContent: 'center' }}
      >
        <Text style={{ color: colors.tint, fontWeight: '800' }}>{copied ? 'Copied' : 'Copy'}</Text>
      </Pressable>
      <Text selectable style={[styles.code, { color: colors.text, backgroundColor: colors.background, borderColor: colors.border }]}>
        {snippet}
      </Text>
      <Text style={{ color: colors.text, fontWeight: '800', marginTop: 16, marginBottom: 8 }}>Docs</Text>
      <Text selectable style={{ color: colors.textSecondary, lineHeight: 20 }}>
        {product.apiDocsMarkdown || 'POST /v1/chat/completions with OpenAI-compatible messages.'}
      </Text>
    </View>
  );
}

function OverviewTab({ product }: { product: Product }) {
  const { colors } = useTheme();
  const { t, language } = useT();
  const runtime = displayRuntime(product);
  const changelog = product.changelog || [];
  return (
    <View style={[styles.pane, { borderColor: colors.border, backgroundColor: colors.cardBackground }]}>
      <Text style={{ color: colors.text, lineHeight: 22 }}>{product.description || product.tagline}</Text>
      <View style={[styles.wrap, { marginTop: 12 }]}>
        {(product.tags || []).map((tag) => (
          <View key={tag} style={[styles.tag, { borderColor: colors.border }]}>
            <Text style={{ color: colors.text, fontSize: 12 }}>{tag}</Text>
          </View>
        ))}
      </View>
      <Text style={[styles.section, { color: colors.text }]}>Runtime</Text>
      <RuntimeRow label="Public Endpoint (/runsync)" value={runtime.publicEndpoint} />
      <RuntimeRow label="Async (/run)" value={runtime.serverlessEndpoint} />
      <RuntimeRow label="Tokenize" value={runtime.tokenizeEndpoint} />
      <RuntimeRow label="Gateway / OpenAI base" value={runtime.gatewayUrl} />
      {runtime.skills.length ? (
        <View style={[styles.wrap, { marginTop: 8 }]}>
          {runtime.skills.map((s) => (
            <View key={s} style={[styles.tag, { borderColor: colors.border }]}>
              <Text style={{ color: colors.text, fontSize: 12 }}>{s}</Text>
            </View>
          ))}
        </View>
      ) : null}
      <Text style={[styles.section, { color: colors.text }]}>Changelog</Text>
      {changelog.length ? (
        changelog.map((c) => (
          <View key={`${c.version}-${c.date}`} style={{ marginBottom: 12 }}>
            <Text style={{ color: colors.text, fontWeight: '700' }}>
              {c.version} <Text style={{ color: colors.textSecondary, fontWeight: '400' }}>{formatDate(c.date, language)}</Text>
            </Text>
            <Text style={{ color: colors.textSecondary, lineHeight: 20 }}>{c.notes}</Text>
          </View>
        ))
      ) : (
        <Text style={{ color: colors.textSecondary }}>{t('common.empty')}</Text>
      )}
    </View>
  );
}

function RuntimeRow({ label, value }: { label: string; value: string }) {
  const { colors } = useTheme();
  if (!value) return null;
  return (
    <View style={{ marginBottom: 10 }}>
      <Text style={{ color: colors.textSecondary, fontSize: 11, fontWeight: '800', letterSpacing: 0.4, textTransform: 'uppercase' }}>
        {label}
      </Text>
      <Text selectable style={{ color: colors.text, fontFamily: 'monospace', fontSize: 12, marginTop: 2 }}>
        {value}
      </Text>
    </View>
  );
}

function ReviewsTab({
  product,
  isAuthenticated,
  onWriteReview,
}: {
  product: Product;
  isAuthenticated: boolean;
  onWriteReview: () => void;
}) {
  const { colors } = useTheme();
  const { t } = useT();
  const reviews = useQuery({
    queryKey: ['reviews', product.id],
    queryFn: () => reviewsApi.list(product.id),
    enabled: !!product.id,
  });
  return (
    <View style={[styles.pane, { borderColor: colors.border, backgroundColor: colors.cardBackground }]}>
      {(reviews.data || []).length ? (
        (reviews.data || []).map((r) => (
          <View key={r.id} style={{ marginBottom: 14 }}>
            <Text style={{ color: colors.text, fontWeight: '700' }}>
              {r.title || r.userName} · ★ {r.rating}
            </Text>
            <Text style={{ color: colors.textSecondary, fontSize: 12 }}>{r.userName}</Text>
            <Text style={{ color: colors.text, marginTop: 4, lineHeight: 20 }}>{r.body}</Text>
          </View>
        ))
      ) : (
        <Text style={{ color: colors.textSecondary, marginBottom: 12 }}>{t('common.empty')}</Text>
      )}
      {isAuthenticated ? <Button title={t('review.title')} variant="outline" onPress={onWriteReview} /> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  relatedHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  relatedTitle: { fontSize: 16, fontWeight: '800' },
  relatedCard: {
    width: 220,
    flexDirection: 'row',
    gap: 10,
    borderWidth: 1,
    borderRadius: 12,
    padding: 8,
    alignItems: 'center',
  },
  relatedCover: { width: 56, height: 56, borderRadius: 8 },
  tabs: { gap: 18, paddingVertical: 4, marginBottom: 4 },
  tab: { paddingVertical: 10, borderBottomWidth: 2, borderBottomColor: 'transparent', minHeight: 44, justifyContent: 'center' },
  pane: { borderWidth: 1, borderRadius: 16, padding: 14, marginTop: 12 },
  wrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 8 },
  apiBar: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  code: { fontFamily: 'monospace', fontSize: 12, lineHeight: 18, padding: 12, borderRadius: 10, borderWidth: 1, overflow: 'hidden' },
  section: { fontSize: 20, fontWeight: '700', marginTop: 20, marginBottom: 10 },
  tag: { borderWidth: 1, borderRadius: 999, paddingHorizontal: 10, paddingVertical: 6 },
});
