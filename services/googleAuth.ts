import { Platform } from 'react-native';
import * as AuthSession from 'expo-auth-session';
import * as WebBrowser from 'expo-web-browser';
import * as Linking from 'expo-linking';
import { API_CONFIG, GOOGLE_AUTH_CONFIG } from '@/api/client';
import { authApi } from '@/api/auth';
import type { GooglePrefill } from '@/api/types';

WebBrowser.maybeCompleteAuthSession();

export type GoogleSignInResult = {
  /** Session already created (API-hosted fallback callback only). */
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

/** Deep link the app catches after Google redirects back (see app.json scheme). */
const APP_SCHEME = 'aimarkets';

/**
 * HTTPS bridge page — Google requires an http/https redirect for Web clients.
 * The page forwards its query to the app deep link.
 */
export const GOOGLE_HTTPS_REDIRECT_URI =
  process.env.EXPO_PUBLIC_GOOGLE_REDIRECT_URI?.trim() ||
  'https://aimarkets.vn/assets/oauth/google-mobile.html';

type ClientIds = { webClientId: string; iosClientId: string; androidClientId: string };

type PendingOAuth = {
  resolve: (result: GoogleSignInResult) => void;
  reject: (error: Error) => void;
};

let pendingOAuth: PendingOAuth | null = null;
let linkingSubscribed = false;

function resolveClientIds(server?: {
  clientId?: string;
  iosClientId?: string;
  androidClientId?: string;
}): ClientIds {
  const webClientId = GOOGLE_AUTH_CONFIG.webClientId || server?.clientId || '';
  return {
    webClientId,
    iosClientId: GOOGLE_AUTH_CONFIG.iosClientId || server?.iosClientId || '',
    androidClientId: GOOGLE_AUTH_CONFIG.androidClientId || server?.androidClientId || '',
  };
}

/** iOS native OAuth scheme: com.googleusercontent.apps.{clientIdPrefix} */
export function getIosUrlScheme(iosClientId: string): string {
  return `com.googleusercontent.apps.${iosClientId.replace('.apps.googleusercontent.com', '')}`;
}

/**
 * iOS uses its own reverse-scheme client so the consent screen returns straight
 * to the app. Android/Web fall back to the HTTPS bridge.
 */
function shouldUseNativeIosFlow(clients: ClientIds): boolean {
  return Platform.OS === 'ios' && clients.iosClientId.includes('.apps.googleusercontent.com');
}

export function getGoogleRedirectUri(clients: ClientIds): string {
  if (Platform.OS === 'web') {
    return AuthSession.makeRedirectUri({ scheme: APP_SCHEME, path: 'oauthredirect' });
  }
  if (shouldUseNativeIosFlow(clients)) {
    return `${getIosUrlScheme(clients.iosClientId)}:/oauthredirect`;
  }
  return GOOGLE_HTTPS_REDIRECT_URI;
}

/**
 * App-native flow: send Google the client ID that matches the running platform
 * (Android client on Android, iOS client on iOS) so the consent screen belongs
 * to the app — never the shared Web client.
 */
function resolveOAuthClientId(clients: ClientIds): string {
  if (Platform.OS === 'ios') return clients.iosClientId || clients.webClientId;
  if (Platform.OS === 'android') return clients.androidClientId || clients.webClientId;
  return clients.webClientId;
}

function readParam(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

/** Parse code / id_token / prefill from the deep link Google sent us back. */
function parseCallback(url: string): GoogleSignInResult | null {
  if (!url) return null;
  const isCallback =
    url.includes('oauthredirect') ||
    url.includes('google-mobile.html') ||
    url.includes('com.googleusercontent.apps.');
  if (!isCallback) return null;

  const parsed = Linking.parse(url);
  const q = parsed.queryParams || {};

  const googleStatus = readParam(q.google as string | string[] | undefined);
  if (googleStatus === 'error') {
    throw new Error(readParam(q.message as string | string[] | undefined) || 'Đăng nhập Google thất bại');
  }
  if (googleStatus === 'prefill') {
    return {
      prefill: {
        email: readParam(q.email as string | string[] | undefined) || '',
        name: readParam(q.name as string | string[] | undefined) || '',
        avatarUrl: readParam(q.avatar as string | string[] | undefined) || '',
        googleSignupToken: readParam(q.googleSignupToken as string | string[] | undefined) || '',
        hasAccount: false,
      },
    };
  }

  const token = readParam(q.token as string | string[] | undefined);
  if (token) {
    return { token, refreshToken: readParam(q.refreshToken as string | string[] | undefined) };
  }

  const code = readParam(q.code as string | string[] | undefined);
  const idToken =
    readParam(q.id_token as string | string[] | undefined) ||
    url.match(/[#&]id_token=([^&]+)/)?.[1];

  const redirectUri = url.includes('com.googleusercontent.apps.')
    ? url.split('?')[0].split('#')[0]
    : GOOGLE_HTTPS_REDIRECT_URI;

  if (code || idToken) return { code, idToken, redirectUri };
  return null;
}

function tryCompletePending(url: string): boolean {
  const parsed = parseCallback(url);
  if (!parsed || !pendingOAuth) return false;
  pendingOAuth.resolve(parsed);
  pendingOAuth = null;
  void WebBrowser.dismissBrowser();
  return true;
}

function ensureLinkListener() {
  if (linkingSubscribed || Platform.OS === 'web') return;
  linkingSubscribed = true;
  Linking.addEventListener('url', ({ url }) => {
    try {
      tryCompletePending(url);
    } catch (e) {
      if (pendingOAuth) {
        pendingOAuth.reject(e instanceof Error ? e : new Error('Đăng nhập Google thất bại'));
        pendingOAuth = null;
        void WebBrowser.dismissBrowser();
      }
    }
  });
  void Linking.getInitialURL().then((url) => {
    if (url) tryCompletePending(url);
  });
}

function waitDeepLink(timeoutMs = 120_000): Promise<GoogleSignInResult> {
  return new Promise<GoogleSignInResult>((resolve, reject) => {
    pendingOAuth = { resolve, reject };
    setTimeout(() => {
      if (!pendingOAuth) return;
      pendingOAuth.reject(new Error('CANCELLED'));
      pendingOAuth = null;
    }, timeoutMs);
  });
}

function resultFromAuthSession(
  result: AuthSession.AuthSessionResult,
  redirectUri: string,
  clientId: string,
): GoogleSignInResult | null {
  if (result.type !== 'success') return null;
  if (result.url) {
    const fromUrl = parseCallback(result.url);
    if (fromUrl) return fromUrl;
  }
  const params = (result.params || {}) as { code?: string | string[]; id_token?: string | string[] };
  const code = readParam(params.code);
  const idToken =
    readParam(params.id_token) ||
    (result as { authentication?: { idToken?: string } }).authentication?.idToken;
  if (code) return { code, redirectUri, clientId };
  if (idToken) return { idToken, redirectUri, clientId };
  return null;
}

const DISCOVERY = {
  authorizationEndpoint: 'https://accounts.google.com/o/oauth2/v2/auth',
  tokenEndpoint: 'https://oauth2.googleapis.com/token',
  revocationEndpoint: 'https://oauth2.googleapis.com/revoke',
};

/**
 * Web build only: full-page redirect to the API-hosted consent screen. The API
 * redirects back to the current page with `?token=` (login) or `?google=prefill`
 * (signup). Native builds never take this path.
 */
function webGoogleStartUrl(mode: GoogleSignInMode): string {
  const base = API_CONFIG.BASE_URL.replace(/\/v1$/, '');
  const returnTo = typeof window !== 'undefined' ? window.location.href.split('?')[0] : '/';
  const params = new URLSearchParams({ returnTo });
  if (mode === 'signup') params.set('mode', 'signup');
  return `${base}/v1/auth/google/start?${params.toString()}`;
}

/**
 * Google sign-in for the app (native consent + deep link back).
 * @param mode `signup` only prefills the register form; it never creates a session.
 */
export async function signInWithGoogle(mode: GoogleSignInMode = 'login'): Promise<GoogleSignInResult> {
  ensureLinkListener();

  if (Platform.OS === 'web') {
    window.location.assign(webGoogleStartUrl(mode));
    // Navigation leaves the page; resolve the promise contract with a sentinel.
    throw new Error('CANCELLED');
  }

  const remote = await authApi.getGoogleConfig();
  const clients = resolveClientIds(remote);
  const clientId = resolveOAuthClientId(clients);

  if (!clientId) {
    throw new Error('Google Sign-In chưa được cấu hình (thiếu GOOGLE client ID)');
  }

  const redirectUri = getGoogleRedirectUri(clients);
  const useAuthCodeFlow = Platform.OS === 'ios' || Platform.OS === 'android';
  const useHttpsBridge = redirectUri.startsWith('https://');

  const request = new AuthSession.AuthRequest({
    clientId,
    redirectUri,
    responseType: useAuthCodeFlow ? AuthSession.ResponseType.Code : AuthSession.ResponseType.IdToken,
    scopes: ['openid', 'profile', 'email'],
    usePKCE: false,
    ...(useAuthCodeFlow
      ? {}
      : { extraParams: { nonce: Math.random().toString(36).slice(2) } }),
  });

  // Android/HTTPS bridge: the browser tab may close before the deep link lands,
  // so race the prompt against the app-level link listener.
  const deepLinkWait = useHttpsBridge && useAuthCodeFlow ? waitDeepLink() : null;

  try {
    const promptPromise = request.promptAsync(DISCOVERY, {
      showInRecents: true,
      ...(Platform.OS === 'android' ? { createTask: false } : {}),
    });

    const raced = deepLinkWait
      ? await Promise.race([
          promptPromise.then((result) => ({ source: 'prompt' as const, result })),
          deepLinkWait.then((payload) => ({ source: 'deeplink' as const, payload })),
        ])
      : { source: 'prompt' as const, result: await promptPromise };

    if (raced.source === 'deeplink') return { ...raced.payload, clientId };

    const result = raced.result;
    if (result.type === 'dismiss' || result.type === 'cancel') {
      if (useHttpsBridge && useAuthCodeFlow) {
        try {
          return { ...(await waitDeepLink(25_000)), clientId };
        } catch {
          throw new Error('CANCELLED');
        }
      }
      throw new Error('CANCELLED');
    }
    if (result.type !== 'success') throw new Error('Đăng nhập Google thất bại');

    const parsed = resultFromAuthSession(result, redirectUri, clientId);
    if (!parsed) {
      throw new Error(useAuthCodeFlow ? 'Không nhận được mã Google' : 'Không nhận được token Google');
    }
    return { ...parsed, clientId };
  } finally {
    pendingOAuth = null;
  }
}

ensureLinkListener();
