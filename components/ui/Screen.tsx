import React from 'react';
import { Platform, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useSegments } from 'expo-router';
import { useTheme } from '@/hooks/useT';

export function Screen({ children, padded = true }: { children: React.ReactNode; padded?: boolean }) {
  const segments = useSegments();
  const nativeTab = Platform.OS === 'ios' && segments[0] === '(tabs)';
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();
  return (
    <View style={{ flex: 1, backgroundColor: colors.background, paddingTop: insets.top, paddingBottom: nativeTab ? insets.bottom : 0, paddingLeft: insets.left + (padded ? 16 : 0), paddingRight: insets.right + (padded ? 16 : 0) }}>
      {children}
    </View>
  );
}
