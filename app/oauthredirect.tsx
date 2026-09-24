import { useEffect } from 'react';
import { ActivityIndicator, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useAuth } from '@/hooks/useAuth';
import { useTheme } from '@/hooks/useT';

/**
 * Deep-link landing for `aimarkets://oauthredirect` (API-hosted Google sign-in).
 * The sign-in promise normally consumes the link; this screen only returns to
 * the caller, or finishes the session if the app was relaunched mid-flow.
 */
export default function OAuthRedirectScreen() {
  const router = useRouter();
  const { colors } = useTheme();
  const { loginWithGoogle } = useAuth();
  const params = useLocalSearchParams<{ token?: string; refreshToken?: string }>();

  useEffect(() => {
    if (router.canGoBack()) {
      router.back();
      return;
    }
    const token = typeof params.token === 'string' ? params.token : '';
    if (!token) {
      router.replace('/auth/login');
      return;
    }
    loginWithGoogle({ token, refreshToken: params.refreshToken || undefined })
      .then(() => router.replace('/(tabs)'))
      .catch(() => router.replace('/auth/login'));
    // Run once per deep link.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.background }}>
      <ActivityIndicator color={colors.tint} />
    </View>
  );
}
