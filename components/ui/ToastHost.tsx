import React from 'react';
import { Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useToastStore } from '@/stores/toastStore';

export function ToastHost() {
  const message = useToastStore((s) => s.message);
  const insets = useSafeAreaInsets();
  if (!message) return null;
  return (
    <View
      pointerEvents="none"
      style={{
        position: 'absolute',
        left: 16,
        right: 16,
        bottom: insets.bottom + 24,
        backgroundColor: '#111111',
        borderRadius: 14,
        paddingHorizontal: 16,
        paddingVertical: 14,
        zIndex: 50,
      }}
    >
      <Text style={{ color: '#f2efe8', fontWeight: '700', lineHeight: 20 }}>{message}</Text>
    </View>
  );
}
