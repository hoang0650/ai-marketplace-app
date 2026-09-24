import React from 'react';
import { Stack } from 'expo-router';
import { useTheme } from '@/hooks/useT';

/** Agent hub — same hierarchy as web `/hire-agent`, `/hire-agent/marketplace`, `/hire-agent/:agentId`. */
export default function HireAgentLayout() {
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
      <Stack.Screen name="marketplace" />
      <Stack.Screen name="[agentId]/index" />
      <Stack.Screen name="[agentId]/setup" />
    </Stack>
  );
}
