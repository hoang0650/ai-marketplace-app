import React from 'react';
import { Redirect, Stack, useSegments } from 'expo-router';
import { useTheme } from '@/hooks/useT';
import { WORK_BOARD_ENABLED } from '@/constants/features';

export default function WorkLayout() {
  const { colors } = useTheme();
  const segments = useSegments() as string[];
  if (!WORK_BOARD_ENABLED && segments[1] !== 'contracts') return <Redirect href="/" />;
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
      <Stack.Screen name="jobs" />
      <Stack.Screen name="talents" />
      <Stack.Screen name="post" />
      <Stack.Screen name="manage" />
      <Stack.Screen name="contracts" />
      <Stack.Screen name="job/[slug]" />
      <Stack.Screen name="talent/[slug]" />
    </Stack>
  );
}
