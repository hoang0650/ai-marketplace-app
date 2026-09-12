import React from 'react';
import { View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '@/hooks/useT';

export function Screen({ children, padded = true }: { children: React.ReactNode; padded?: boolean }) {
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();
  return (
    <View style={{ flex: 1, backgroundColor: colors.background, paddingTop: insets.top, paddingHorizontal: padded ? 16 : 0 }}>
      {children}
    </View>
  );
}
