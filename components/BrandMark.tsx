import React from 'react';
import { Image, StyleSheet, Text, View } from 'react-native';
import { displayFont } from '@/constants/fonts';

type Props = {
  size?: number;
  showName?: boolean;
  color?: string;
  compact?: boolean;
};

export function BrandMark({ size = 36, showName = true, color = '#1a1a1a', compact }: Props) {
  return (
    <View style={styles.row}>
      <Image source={require('@/assets/images/mark.png')} style={[styles.mark, { width: size, height: size, borderRadius: size * 0.22 }]} />
      {showName ? (
        <Text style={[styles.name, compact && styles.nameCompact, { color }]}>AI Markets</Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  mark: { backgroundColor: '#111' },
  name: {
    fontSize: 22,
    fontWeight: '600',
    letterSpacing: 0.2,
    fontFamily: displayFont,
  },
  nameCompact: { fontSize: 18 },
});
