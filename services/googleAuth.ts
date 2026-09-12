import { Platform } from 'react-native';
import * as WebBrowser from 'expo-web-browser';
import * as Linking from 'expo-linking';
import { GOOGLE_AUTH_CONFIG } from '@/api/client';
import { authApi } from '@/api/auth';

WebBrowser.maybeCompleteAuthSession();

export type GoogleSignInResult = {
  idToken?: string;
  code?: string;
  redirectUri?: string;
  clientId?: string;
};

export const GOOGLE_HTTPS_REDIRECT_URI =
  process.env.EXPO_PUBLIC_GOOGLE_REDIRECT_URI?.trim() ||
  'https://aimarkets.vn/assets/oauth/google-mobile.html';

const APP_RETURN_URL = 'aimarkets://oauthredirect';

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

export function getGoogleRedirectUri(clients: ClientIds): string {
  if (useNativeIos(clients)) {
    return `${getIosUrlScheme(clients.iosClientId)}:/oauthredirect`;
  }
  return GOOGLE_HTTPS_REDIRECT_URI;
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
    const parsed = parseCallback(url);
    if (parsed && pending) {
      pending.resolve(parsed);
      pending = null;
      void WebBrowser.dismissBrowser();
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

function buildGoogleAuthUrl(clientId: string, redirectUri: string) {
  const url = new URL('https://accounts.google.com/o/oauth2/v2/auth');
  url.searchParams.set('client_id', clientId);
  url.searchParams.set('redirect_uri', redirectUri);
  url.searchParams.set('response_type', 'code');
  url.searchParams.set('scope', 'openid email profile');
  url.searchParams.set('prompt', 'select_account');
  url.searchParams.set('access_type', 'online');
  return url.toString();
}

export async function signInWithGoogle(): Promise<GoogleSignInResult> {
  ensureLinkListener();
  const remote = await authApi.getGoogleConfig();
  const clients = resolveClientIds(remote);
  const nativeIos = useNativeIos(clients);
  const clientId = nativeIos
    ? clients.iosClientId
    : clients.webClientId || clients.androidClientId;
  if (!clientId) throw new Error('Thiếu Google Client ID');

  const redirectUri = getGoogleRedirectUri(clients);
  const returnUrl = nativeIos ? redirectUri : APP_RETURN_URL;
  const deepWait = waitDeepLink();

  const prompt = WebBrowser.openAuthSessionAsync(buildGoogleAuthUrl(clientId, redirectUri), returnUrl, {
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
  if (parsed?.code || parsed?.idToken) return { ...parsed, clientId };
  throw new Error('Không nhận được mã Google');
}

ensureLinkListener();
