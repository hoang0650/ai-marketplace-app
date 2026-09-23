import React, { useCallback, useRef, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  Pressable,
  StyleSheet,
  NativeSyntheticEvent,
  NativeScrollEvent,
  useWindowDimensions,
} from 'react-native';
import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import type { Banner } from '@/api/types';
import { useTheme } from '@/hooks/useT';
import { openBanner } from '@/lib/bannerLink';

type Props = {
  banners: Banner[];
  /** Aspect: hero is wider; square rails for offers/partners */
  variant?: 'hero' | 'square';
};

export function BannerCarousel({ banners, variant = 'hero' }: Props) {
  const router = useRouter();
  const { colors } = useTheme();
  const { width: winW } = useWindowDimensions();
  const pad = 16;
  const gap = 10;
  const cardW = variant === 'hero' ? winW - pad * 2 : Math.min(168, winW * 0.42);
  const cardH = variant === 'hero' ? Math.round(cardW * 0.48) : cardW;
  const [index, setIndex] = useState(0);
  const scrolling = useRef(false);

  const onScroll = useCallback(
    (e: NativeSyntheticEvent<NativeScrollEvent>) => {
      const x = e.nativeEvent.contentOffset.x;
      const i = Math.round(x / (cardW + gap));
      if (i !== index && i >= 0 && i < banners.length) setIndex(i);
    },
    [banners.length, cardW, gap, index],
  );

  if (!banners.length) return null;

  return (
    <View style={styles.wrap}>
      <ScrollView
        horizontal
        pagingEnabled={variant === 'hero'}
        decelerationRate="fast"
        snapToInterval={cardW + gap}
        snapToAlignment="start"
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ paddingHorizontal: pad, gap }}
        onScroll={onScroll}
        scrollEventThrottle={16}
        onScrollBeginDrag={() => {
          scrolling.current = true;
        }}
        onMomentumScrollEnd={() => {
          scrolling.current = false;
        }}
      >
        {banners.map((b) => (
          <Pressable
            key={b.id}
            accessibilityRole="button"
            accessibilityLabel={b.title}
            onPress={() => openBanner(router, b)}
            style={({ pressed }) => [
              styles.card,
              {
                width: cardW,
                height: cardH,
                borderColor: colors.border,
                opacity: pressed ? 0.92 : 1,
              },
            ]}
          >
            <Image source={{ uri: b.imageUrl }} style={StyleSheet.absoluteFill} contentFit="cover" transition={0} />
            <View style={styles.shade} />
            <View style={styles.copy}>
              <Text style={styles.title} numberOfLines={2}>
                {b.title}
              </Text>
              {b.subtitle ? (
                <Text style={styles.sub} numberOfLines={2}>
                  {b.subtitle}
                </Text>
              ) : null}
            </View>
          </Pressable>
        ))}
      </ScrollView>
      {variant === 'hero' && banners.length > 1 ? (
        <View style={styles.dots}>
          {banners.map((b, i) => (
            <View
              key={b.id}
              style={[styles.dot, { backgroundColor: i === index ? colors.tint : colors.border }]}
            />
          ))}
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { marginTop: 4, marginBottom: 4 },
  card: { borderRadius: 14, overflow: 'hidden', borderWidth: StyleSheet.hairlineWidth },
  shade: {
    ...StyleSheet.absoluteFill,
    backgroundColor: 'rgba(17,17,17,0.42)',
  },
  copy: { flex: 1, justifyContent: 'flex-end', padding: 14 },
  title: { color: '#f2efe8', fontSize: 16, fontWeight: '700' },
  sub: { color: 'rgba(245,240,232,0.78)', marginTop: 4, fontSize: 12, lineHeight: 16 },
  dots: { flexDirection: 'row', justifyContent: 'center', gap: 6, marginTop: 8 },
  dot: { width: 6, height: 6, borderRadius: 3 },
});
