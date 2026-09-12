import React from 'react';
import { Pressable, StyleSheet, Text } from 'react-native';
import { useTheme } from '@/hooks/useT';

export function Chip({ label, active, onPress }: { label: string; active?: boolean; onPress?: () => void }) {
  const { colors } = useTheme();
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityState={{ selected: !!active }}
      style={[
        styles.chip,
        {
          backgroundColor: active ? colors.luxDark : colors.cardBackground,
          borderColor: active ? colors.luxDark : colors.border,
        },
      ]}
    >
      <Text
        style={[styles.label, { color: active ? '#f2efe8' : colors.text }]}
        numberOfLines={1}
      >
        {label}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  chip: {
    alignSelf: 'flex-start',
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 22,
    minHeight: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  label: {
    fontWeight: '700',
    fontSize: 13,
    lineHeight: 18,
    includeFontPadding: false,
    textAlignVertical: 'center',
  },
});
