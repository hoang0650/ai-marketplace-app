import { Platform } from 'react-native';
import * as WebBrowser from 'expo-web-browser';
import * as Linking from 'expo-linking';
import { API_CONFIG, GOOGLE_AUTH_CONFIG } from '@/api/client';
import { authApi } from '@/api/auth';
import type { GooglePrefill } from '@/api/types';

WebBrowser.maybeCompleteAuthSession();

export type GoogleSignInResult = {
  /** Session already created by API mobile callback */
  token?: string;
  refreshToken?: string;
  idToken?: string;
  code?: string;
  redirectUri?: string;
  clientId?: string;
  /** Signup mode: Google profile for prefill only (no session). */
  prefill?: GooglePrefill;
};

export type GoogleSignInMode = 'login' | 'signup';

const APP_RETURN_URL = 'aimarkets://oauthredirect';

/** Legacy HTTPS bridge (needs Authorized redirect URI). Prefer API mobile start. */
export const GOOGLE_HTTPS_REDIRECT_URI =
  process.env.EXPO_PUBLIC_GOOGLE_REDIRECT_URI?.trim() ||
  'https://www.aimarkets.vn/assets/oauth/google-mobile.html';

type ClientIds = { webClientId: string; iosClientId: string; androidClientId: string };

let pending: { id: number; resolve: (v: GoogleSignInResult) => void; reject: (e: Error) => void } | null = null;
let linkingSubscribed = false;
let waitSeq = 0;

function resolveClientIds(server?: { clientId?: string; iosClientId?: string; androidClientId?: string }): ClientIds {
  return {
    webClientId: GOOGLE_AUTH_CONFIG.webClientId || server?.clientId || '',
    iosClientId: GOOGLE_AUTH_CONFIG.iosClientId || server?.iosClientId || '',
    androidClientId: GOOGLE_AUTH_CONFIG.androidClientId || server?.androidClientId || '',
  };
}

export function getIosUrlScheme(iosClientId: string): string {
  return `com.googleusercontent.apps.${iosClientId.replace('.apps.googleusercontent.com', '')}`;
}

function isDedicatedNativeId(nativeId: string, webClientId: string) {
  return !!nativeId && nativeId.includes('.apps.googleusercontent.com') && nativeId !== webClientId;
}

function useNativeIos(clients: ClientIds) {
  return Platform.OS === 'ios' && isDedicatedNativeId(clients.iosClientId, clients.webClientId);
}

function mobileGoogleStartUrl(mode: GoogleSignInMode = 'login') {
  const params = new URLSearchParams({ mobile: '1', scheme: 'aimarkets' });
  if (mode === 'signup') params.set('mode', 'signup');
  return `${API_CONFIG.BASE_URL}/auth/google/start?${params.toString()}`;
}

function parseCallback(url: string): GoogleSignInResult | null {
  if (!url) return null;
  const isCb =
    url.includes('oauthredirect') ||
    url.includes('google-mobile.html') ||
    url.includes('com.googleusercontent.apps.');
  if (!isCb) return null;
  const parsed = Linking.parse(url);
  const read = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v);
  const err = read(parsed.queryParams?.google as string | string[] | undefined);
  const message = read(parsed.queryParams?.message as string | string[] | undefined);
  if (err === 'error') {
    throw new Error(message || 'Đăng nhập Google thất bại');
  }
  if (err === 'prefill') {
    return {
      prefill: {
        email: read(parsed.queryParams?.email as string | string[] | undefined) || '',
        name: read(parsed.queryParams?.name as string | string[] | undefined) || '',
        avatarUrl: read(parsed.queryParams?.avatar as string | string[] | undefined) || '',
        googleSignupToken: read(parsed.queryParams?.googleSignupToken as string | string[] | undefined) || '',
        hasAccount: false,
      },
    };
  }
  const token = read(parsed.queryParams?.token as string | string[] | undefined);
  const refreshToken = read(parsed.queryParams?.refreshToken as string | string[] | undefined);
  if (token) return { token, refreshToken };
  const code = read(parsed.queryParams?.code as string | string[] | undefined);
  const idToken = read(parsed.queryParams?.id_token as string | string[] | undefined);
  const redirectUri = url.includes('com.googleusercontent.apps.')
    ? url.split('?')[0].split('#')[0]
    : GOOGLE_HTTPS_REDIRECT_URI;
  if (code || idToken) return { code, idToken, redirectUri };
  return null;
}

function ensureLinkListener() {
  if (linkingSubscribed || Platform.OS === 'web') return;
  linkingSubscribed = true;
  Linking.addEventListener('url', ({ url }) => {
    try {
      const parsed = parseCallback(url);
      if (parsed && pending) {
        pending.resolve(parsed);
        pending = null;
        void WebBrowser.dismissBrowser();
      }
    } catch (e) {
      if (pending) {
        pending.reject(e instanceof Error ? e : new Error('Đăng nhập Google thất bại'));
        pending = null;
        void WebBrowser.dismissBrowser();
      }
    }
  });
}

function waitDeepLink(timeoutMs = 120_000) {
  const id = ++waitSeq;
  return new Promise<GoogleSignInResult>((resolve, reject) => {
    pending = { id, resolve, reject };
    setTimeout(() => {
      if (!pending || pending.id !== id) return;
      pending.reject(new Error('CANCELLED'));
      pending = null;
    }, timeoutMs);
  });
}

function buildNativeGoogleAuthUrl(clientId: string, redirectUri: string) {
  const url = new URL('https://accounts.google.com/o/oauth2/v2/auth');
  url.searchParams.set('client_id', clientId);
  url.searchParams.set('redirect_uri', redirectUri);
  url.searchParams.set('response_type', 'code');
  url.searchParams.set('scope', 'openid email profile');
  url.searchParams.set('prompt', 'select_account');
  url.searchParams.set('access_type', 'online');
  return url.toString();
}

export async function signInWithGoogle(mode: GoogleSignInMode = 'login'): Promise<GoogleSignInResult> {
  ensureLinkListener();
  const remote = await authApi.getGoogleConfig();
  if (!remote?.enabled && !GOOGLE_AUTH_CONFIG.webClientId && !GOOGLE_AUTH_CONFIG.iosClientId) {
    throw new Error('Google Sign-In chưa được cấu hình');
  }
  const clients = resolveClientIds(remote);
  const nativeIos = useNativeIos(clients);

  // iOS native client (if configured separately) keeps Google’s reverse-scheme redirect.
  if (nativeIos) {
    const clientId = clients.iosClientId;
    const redirectUri = `${getIosUrlScheme(clientId)}:/oauthredirect`;
    const deepWait = waitDeepLink();
    const prompt = WebBrowser.openAuthSessionAsync(buildNativeGoogleAuthUrl(clientId, redirectUri), redirectUri, {
      showInRecents: true,
    });
    const raced = await Promise.race([
      prompt.then((result) => ({ source: 'prompt' as const, result })),
      deepWait.then((payload) => ({ source: 'deeplink' as const, payload })),
    ]);
    if (raced.source === 'deeplink') return { ...raced.payload, clientId };
    pending = null;
    const result = raced.result;
    if (result.type === 'cancel' || result.type === 'dismiss') {
      try {
        return { ...(await waitDeepLink(25_000)), clientId };
      } catch {
        throw new Error('CANCELLED');
      }
    }
    if (result.type !== 'success' || !result.url) throw new Error('Đăng nhập Google thất bại');
    const parsed = parseCallback(result.url);
    if (parsed?.code || parsed?.idToken || parsed?.token) return { ...parsed, clientId };
    throw new Error('Không nhận được mã Google');
  }

  // Android / Expo / default: use API start — redirect_uri is already registered
  // (https://api.aimarkets.vn/v1/auth/google/callback). Avoids redirect_uri_mismatch.
  const startUrl = mobileGoogleStartUrl(mode);
  const deepWait = waitDeepLink();
  const prompt = WebBrowser.openAuthSessionAsync(startUrl, APP_RETURN_URL, { showInRecents: true });

  const raced = await Promise.race([
    prompt.then((result) => ({ source: 'prompt' as const, result })),
    deepWait.then((payload) => ({ source: 'deeplink' as const, payload })),
  ]);

  if (raced.source === 'deeplink') return raced.payload;

  pending = null;
  const result = raced.result;
  if (result.type === 'cancel' || result.type === 'dismiss') {
    try {
      return await waitDeepLink(25_000);
    } catch {
      throw new Error('CANCELLED');
    }
  }
  if (result.type !== 'success' || !result.url) throw new Error('Đăng nhập Google thất bại');
  const parsed = parseCallback(result.url);
  if (parsed?.token || parsed?.code || parsed?.idToken) return parsed;
  throw new Error('Không nhận được phiên Google');
}

ensureLinkListener();
