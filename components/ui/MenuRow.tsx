import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { ChevronRight, type LucideIcon } from 'lucide-react-native';
import { useTheme } from '@/hooks/useT';

export function MenuGroup({ children }: { children: React.ReactNode }) {
  const { colors } = useTheme();
  return (
    <View style={[styles.group, { backgroundColor: colors.cardBackground, borderColor: colors.border }]}>
      {children}
    </View>
  );
}

export function MenuRow({
  label,
  hint,
  icon: Icon,
  onPress,
  last,
}: {
  label: string;
  hint?: string;
  icon: LucideIcon;
  onPress: () => void;
  last?: boolean;
}) {
  const { colors } = useTheme();
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={label}
      style={({ pressed }) => [
        styles.row,
        !last && { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.border },
        { opacity: pressed ? 0.72 : 1 },
      ]}
    >
      <View style={[styles.iconWrap, { backgroundColor: colors.mist }]}>
        <Icon size={18} color={colors.text} strokeWidth={2} />
      </View>
      <View style={styles.copy}>
        <Text style={[styles.label, { color: colors.text }]} numberOfLines={1}>
          {label}
        </Text>
        {hint ? (
          <Text style={[styles.hint, { color: colors.textSecondary }]} numberOfLines={1}>
            {hint}
          </Text>
        ) : null}
      </View>
      <ChevronRight size={18} color={colors.textSecondary} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  group: { borderWidth: 1, borderRadius: 16, overflow: 'hidden', marginBottom: 16 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: 56,
    paddingHorizontal: 14,
    paddingVertical: 12,
    gap: 12,
  },
  iconWrap: { width: 36, height: 36, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  copy: { flex: 1 },
  label: { fontSize: 15, fontWeight: '600', lineHeight: 20, includeFontPadding: false },
  hint: { fontSize: 12, lineHeight: 16, marginTop: 2, includeFontPadding: false },
});
