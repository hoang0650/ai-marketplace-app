import React from 'react';
import { Pressable, StyleSheet } from 'react-native';
import { Heart } from 'lucide-react-native';
import { useRouter } from 'expo-router';
import { useWishlist } from '@/hooks/useWishlist';
import { useTheme } from '@/hooks/useT';

export function WishButton({
  productId,
  variant = 'overlay',
}: {
  productId: string;
  variant?: 'overlay' | 'inline';
}) {
  const router = useRouter();
  const { colors } = useTheme();
  const { saved, toggle, isAuthenticated, togglingId } = useWishlist();
  const on = saved(productId);
  return (
    <Pressable
      onPress={(e) => {
        e?.stopPropagation?.();
        if (!isAuthenticated) {
          router.push('/auth/login');
          return;
        }
        toggle(productId);
      }}
      disabled={togglingId === productId}
      hitSlop={8}
      accessibilityRole="button"
      accessibilityLabel={on ? 'saved' : 'save'}
      accessibilityState={{ selected: on }}
      style={variant === 'overlay' ? styles.heart : [styles.inline, { minWidth: 44, minHeight: 44 }]}
    >
      <Heart size={variant === 'overlay' ? 16 : 22} color={on ? colors.tint : variant === 'overlay' ? '#fff' : colors.text} fill={on ? colors.tint : 'transparent'} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  heart: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(0,0,0,0.45)',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 2,
  },
  inline: {
    alignItems: 'center',
    justifyContent: 'center',
  },
});
