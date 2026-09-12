import React from 'react';
import { ActivityIndicator, Image, Pressable, StyleSheet, ViewStyle } from 'react-native';

type Props = {
  onPress?: () => void;
  disabled?: boolean;
  loading?: boolean;
  kind?: 'pay' | 'buy';
  style?: ViewStyle;
};

const SRC = {
  pay: require('@/assets/images/google-pay/pay-dark.png'),
  buy: require('@/assets/images/google-pay/buy-dark.png'),
};

/** Official Google Pay button asset — do not restyle the artwork. */
export function GooglePayButton({ onPress, disabled, loading, kind = 'pay', style }: Props) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={kind === 'buy' ? 'Buy with Google Pay' : 'Pay with Google Pay'}
      onPress={onPress}
      disabled={disabled || loading}
      style={({ pressed }) => [styles.wrap, { opacity: pressed || disabled ? 0.85 : 1 }, style]}
    >
      {loading ? (
        <ActivityIndicator color="#fff" style={styles.loader} />
      ) : (
        <Image source={SRC[kind]} style={styles.img} resizeMode="contain" />
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  wrap: {
    minWidth: 152,
    minHeight: 48,
    margin: 8,
    borderRadius: 24,
    overflow: 'hidden',
    backgroundColor: '#000',
    alignItems: 'center',
    justifyContent: 'center',
  },
  img: {
    width: '100%',
    height: 48,
  },
  loader: {
    height: 48,
  },
});
