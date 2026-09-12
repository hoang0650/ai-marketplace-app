import React from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View, ViewStyle } from 'react-native';

type Props = {
  onPress?: () => void;
  disabled?: boolean;
  loading?: boolean;
  style?: ViewStyle;
};

/** Black Apple Pay CTA (PayPal capture). Do not restyle the fill or label. */
export function ApplePayButton({ onPress, disabled, loading, style }: Props) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel="Pay with Apple Pay"
      onPress={onPress}
      disabled={disabled || loading}
      style={({ pressed }) => [styles.btn, { opacity: pressed || disabled ? 0.85 : 1 }, style]}
    >
      {loading ? (
        <ActivityIndicator color="#fff" />
      ) : (
        <View style={styles.row}>
          <Text style={styles.logo}></Text>
          <Text style={styles.label}>Pay</Text>
        </View>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  btn: {
    minWidth: 140,
    minHeight: 48,
    margin: 8,
    borderRadius: 24,
    backgroundColor: '#000',
    alignItems: 'center',
    justifyContent: 'center',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  logo: {
    color: '#fff',
    fontSize: 22,
    lineHeight: 26,
  },
  label: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '500',
  },
});
