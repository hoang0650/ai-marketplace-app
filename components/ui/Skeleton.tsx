import React from 'react';
import { StyleSheet, View } from 'react-native';
import { useTheme } from '@/hooks/useT';

export function Skeleton({ height = 16, width = '100%', radius = 8 }: { height?: number; width?: number | string; radius?: number }) {
  const { colors } = useTheme();
  return <View style={[styles.box, { height, width: width as number, borderRadius: radius, backgroundColor: colors.mist }]} />;
}

export function ProductSkeleton() {
  return (
    <View style={{ flex: 1, gap: 8 }}>
      <Skeleton height={128} radius={12} />
      <Skeleton height={14} width="80%" />
      <Skeleton height={12} width="50%" />
    </View>
  );
}

const styles = StyleSheet.create({
  box: { overflow: 'hidden' },
});
