import React from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { href } from '@/lib/href';
import { useTheme } from '@/hooks/useT';
import { useT } from '@/hooks/useT';
import { CATEGORY_ICONS, HOME_CATEGORY_IDS, HOME_HUBS, categoryLabel, categoryMeta } from '@/constants/categories';
import { SectionHeader } from '@/components/ui/SectionHeader';

export const HubRow = React.memo(function HubRow() {
  const router = useRouter();
  const { colors } = useTheme();
  const { t } = useT();

  return (
    <View style={styles.wrap}>
      <SectionHeader title={t('home.browseCats')} action={t('common.seeAll')} onPress={() => router.push('/(tabs)/explore')} />
      <ScrollView
        horizontal
        nestedScrollEnabled
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.rail}
      >
        {HOME_CATEGORY_IDS.map((id) => {
          const Icon = CATEGORY_ICONS[id] || CATEGORY_ICONS['text-to-text'];
          const meta = categoryMeta(id);
          return (
            <Pressable
              key={id}
              accessibilityRole="button"
              accessibilityLabel={categoryLabel(id, t, id, 'label')}
              onPress={() => router.push(href(meta?.hubHref || `/category/${id}`))}
              style={({ pressed }) => [
                styles.tile,
                { backgroundColor: colors.cardBackground, borderColor: colors.border, opacity: pressed ? 0.85 : 1 },
              ]}
            >
              <View style={[styles.icon, { backgroundColor: colors.mist }]}>
                <Icon size={18} color={colors.tint} />
              </View>
              <Text style={[styles.label, { color: colors.text }]} numberOfLines={2}>
                {categoryLabel(id, t, id, 'short')}
              </Text>
            </Pressable>
          );
        })}
        {HOME_HUBS.map((hub) => {
          const Icon = hub.icon;
          return (
            <Pressable
              key={hub.id}
              accessibilityRole="button"
              accessibilityLabel={t(hub.titleKey)}
              onPress={() => router.push(href(hub.href))}
              style={({ pressed }) => [
                styles.tile,
                { backgroundColor: colors.cardBackground, borderColor: colors.border, opacity: pressed ? 0.85 : 1 },
              ]}
            >
              <View style={[styles.icon, { backgroundColor: colors.mist }]}>
                <Icon size={18} color={colors.tint} />
              </View>
              <Text style={[styles.label, { color: colors.text }]} numberOfLines={2}>
                {t(hub.shortKey)}
              </Text>
            </Pressable>
          );
        })}
      </ScrollView>
    </View>
  );
});

const styles = StyleSheet.create({
  wrap: { marginTop: 4, marginBottom: 8 },
  rail: { gap: 8, paddingRight: 8, paddingBottom: 2 },
  tile: {
    width: 76,
    borderWidth: 1,
    borderRadius: 14,
    paddingTop: 10,
    paddingBottom: 8,
    paddingHorizontal: 6,
    alignItems: 'center',
    gap: 6,
  },
  icon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  label: {
    fontSize: 11,
    fontWeight: '700',
    lineHeight: 14,
    textAlign: 'center',
    minHeight: 28,
    includeFontPadding: false,
  },
});
