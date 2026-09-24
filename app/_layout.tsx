import 'react-native-gesture-handler';
import 'react-native-reanimated';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Stack, useRouter, useSegments } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import React, { useEffect } from 'react';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { StatusBar } from 'expo-status-bar';
import { useAuthStore } from '@/stores/authStore';
import { useSettingsStore } from '@/stores/settingsStore';
import { useRecentStore } from '@/stores/recentStore';
import { useTheme } from '@/hooks/useT';
import { AuthSessionSync } from '@/hooks/useAuth';
import { AnalyticsService } from '@/lib/analytics';
import { tokenUnexpired } from '@/lib/jwt';

SplashScreen.preventAutoHideAsync();
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 60_000,
      gcTime: 10 * 60_000,
      refetchOnWindowFocus: false,
      refetchOnReconnect: false,
      retry: 1,
    },
  },
});

function AuthGate({ children }: { children: React.ReactNode }) {
  const hydrated = useAuthStore((s) => s.hydrated);
  const settingsHydrated = useSettingsStore((s) => s.hydrated);
  const onboarded = useSettingsStore((s) => s.onboarded);
  const token = useAuthStore((s) => s.token);
  const isAuthenticated = tokenUnexpired(token);
  const segments = useSegments();
  const router = useRouter();

  useEffect(() => {
    if (!hydrated || !settingsHydrated) return;
    const root = String(segments?.[0] || '');
    if (!onboarded && root !== 'onboarding') {
      router.replace('/onboarding');
      return;
    }
    const inAuth = root === 'auth';
    if (isAuthenticated && inAuth) router.replace('/(tabs)');
  }, [hydrated, settingsHydrated, onboarded, isAuthenticated, segments, router]);

  return <>{children}</>;
}

function ThemedStack() {
  const { colors, isDark } = useTheme();
  return (
    <>
      <StatusBar style={isDark ? 'light' : 'dark'} />
      <Stack
        screenOptions={{
          headerBackTitle: 'Back',
          headerStyle: { backgroundColor: colors.surface },
          headerTintColor: colors.text,
          headerShadowVisible: false,
          contentStyle: { backgroundColor: colors.background },
        }}
      >
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="onboarding" options={{ headerShown: false }} />
        <Stack.Screen name="auth" options={{ headerShown: false }} />
        <Stack.Screen name="login" options={{ headerShown: false }} />
        <Stack.Screen name="register" options={{ headerShown: false }} />
        <Stack.Screen name="oauthredirect" options={{ headerShown: false }} />
        <Stack.Screen name="product/[slug]" options={{ title: '' }} />
        <Stack.Screen name="chat/[id]" options={{ title: '' }} />
        <Stack.Screen name="order/[id]" options={{ title: '' }} />
        <Stack.Screen name="cart/index" options={{ title: '' }} />
        <Stack.Screen name="play/[slug]" options={{ headerShown: false, animation: 'fade' }} />
        <Stack.Screen name="seller/[slug]" options={{ title: '' }} />
        <Stack.Screen name="legal/index" options={{ title: 'Trung tâm pháp lý' }} />
        <Stack.Screen name="legal/[type]" options={{ title: 'Pháp lý' }} />
        <Stack.Screen name="work" options={{ headerShown: false }} />
        <Stack.Screen name="agents" options={{ title: 'Agents' }} />
        <Stack.Screen name="hire-agent" options={{ headerShown: false }} />
        <Stack.Screen name="video-ai" options={{ title: 'Watch AI films' }} />
        <Stack.Screen name="stories" options={{ title: 'Stories & books' }} />
        <Stack.Screen name="licenses/index" options={{ title: 'License' }} />
        <Stack.Screen name="usage/index" options={{ title: 'Usage' }} />
        <Stack.Screen name="reviews/create" options={{ title: 'Viết đánh giá' }} />
        <Stack.Screen name="category/[id]" options={{ title: '' }} />
        <Stack.Screen name="+not-found" />
      </Stack>
    </>
  );
}

export default function RootLayout() {
  const hydrateAuth = useAuthStore((s) => s.hydrate);
  const hydrateSettings = useSettingsStore((s) => s.hydrate);
  const hydrateRecent = useRecentStore((s) => s.hydrate);
  const authHydrated = useAuthStore((s) => s.hydrated);
  const settingsHydrated = useSettingsStore((s) => s.hydrated);
  const ready = authHydrated && settingsHydrated;

  useEffect(() => {
    void Promise.all([hydrateAuth(), hydrateSettings(), hydrateRecent()]);
    AnalyticsService.track('app_open');
    void import('expo-screen-orientation')
      .then((SO) => SO.lockAsync(SO.OrientationLock.PORTRAIT_UP))
      .catch(() => {});
  }, [hydrateAuth, hydrateSettings, hydrateRecent]);

  useEffect(() => {
    if (ready) void SplashScreen.hideAsync();
  }, [ready]);

  return (
    <QueryClientProvider client={queryClient}>
      <GestureHandlerRootView style={{ flex: 1 }}>
        <AuthGate>
          <AuthSessionSync />
          <ThemedStack />
        </AuthGate>
      </GestureHandlerRootView>
    </QueryClientProvider>
  );
}
