import React from 'react';
import { StyleSheet, Text, TextInput, TextInputProps, View } from 'react-native';
import { useTheme } from '@/hooks/useT';

type Props = TextInputProps & { label?: string; error?: string };

export function Input({ label, error, style, ...rest }: Props) {
  const { colors } = useTheme();
  return (
    <View style={{ marginBottom: 12 }}>
      {label ? <Text style={[styles.label, { color: colors.textSecondary }]}>{label}</Text> : null}
      <TextInput
        placeholderTextColor={colors.textSecondary}
        style={[
          styles.input,
          { color: colors.text, borderColor: error ? colors.danger : colors.border, backgroundColor: colors.cardBackground },
          style,
        ]}
        {...rest}
      />
      {error ? <Text style={{ color: colors.danger, marginTop: 4, fontSize: 12 }}>{error}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  label: { fontSize: 12, fontWeight: '700', marginBottom: 6, letterSpacing: 0.3 },
  input: { borderWidth: 1, borderRadius: 8, paddingHorizontal: 14, paddingVertical: 14, fontSize: 16, minHeight: 48 },
});
