import React from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, ViewStyle } from 'react-native';
import { useTheme } from '@/hooks/useT';

type Props = {
  title: string;
  onPress?: () => void;
  disabled?: boolean;
  loading?: boolean;
  variant?: 'primary' | 'dark' | 'outline' | 'danger';
  style?: ViewStyle;
};

export function Button({ title, onPress, disabled, loading, variant = 'primary', style }: Props) {
  const { colors } = useTheme();
  const bg =
    variant === 'primary' ? colors.tint : variant === 'dark' ? colors.luxDark : variant === 'danger' ? colors.danger : 'transparent';
  const fg = variant === 'outline' ? colors.text : variant === 'primary' ? colors.tintText : '#f2efe8';
  const border = variant === 'outline' ? colors.border : 'transparent';
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={title}
      onPress={onPress}
      disabled={disabled || loading}
      style={({ pressed }) => [
        styles.btn,
        { backgroundColor: bg, borderColor: border, opacity: pressed || disabled ? 0.85 : 1, minHeight: 48 },
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={fg} />
      ) : (
        <Text style={[styles.text, { color: fg }]} numberOfLines={1}>
          {title}
        </Text>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  btn: { paddingHorizontal: 16, paddingVertical: 14, borderRadius: 8, alignItems: 'center', justifyContent: 'center', borderWidth: 1 },
  text: { fontWeight: '800', letterSpacing: 0.3, fontSize: 13, textTransform: 'uppercase' },
});
