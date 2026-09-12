import React from 'react';
import { Stack } from 'expo-router';
import { useTheme } from '@/hooks/useT';

export default function WorkLayout() {
  const { colors } = useTheme();
  return (
    <Stack
      screenOptions={{
        headerBackTitle: 'Back',
        headerStyle: { backgroundColor: colors.surface },
        headerTintColor: colors.text,
        headerShadowVisible: false,
        contentStyle: { backgroundColor: colors.background },
      }}
    >
      <Stack.Screen name="index" />
      <Stack.Screen name="post" />
      <Stack.Screen name="job/[slug]" />
      <Stack.Screen name="talent/[slug]" />
    </Stack>
  );
}
