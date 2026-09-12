import React from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { Search } from 'lucide-react-native';
import { useTheme } from '@/hooks/useT';

type Props = {
  placeholder: string;
  onPress?: () => void;
  editable?: boolean;
  value?: string;
  onChangeText?: (t: string) => void;
  autoFocus?: boolean;
};

export function SearchBar({ placeholder, onPress, editable = true, value, onChangeText, autoFocus }: Props) {
  const { colors } = useTheme();
  if (!editable) {
    return (
      <Pressable
        onPress={onPress}
        accessibilityRole="search"
        accessibilityLabel={placeholder}
        style={[styles.bar, { backgroundColor: colors.cardBackground, borderColor: colors.border }]}
      >
        <Search size={16} color={colors.textSecondary} />
        <Text style={{ color: colors.textSecondary, flex: 1 }}>{placeholder}</Text>
      </Pressable>
    );
  }
  return (
    <View style={[styles.bar, { backgroundColor: colors.cardBackground, borderColor: colors.border }]}>
      <Search size={16} color={colors.textSecondary} />
      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={colors.textSecondary}
        autoFocus={autoFocus}
        style={{ flex: 1, color: colors.text, fontSize: 16, paddingVertical: 12 }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  bar: { flexDirection: 'row', alignItems: 'center', gap: 8, borderWidth: 1, borderRadius: 12, paddingHorizontal: 12, minHeight: 48 },
});
