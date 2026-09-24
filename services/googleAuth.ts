import { Platform } from 'react-native';
import * as AuthSession from 'expo-auth-session';
import * as WebBrowser from 'expo-web-browser';
import * as Linking from 'expo-linking';
import { API_CONFIG, GOOGLE_AUTH_CONFIG } from '@/api/client';
import { authApi } from '@/api/auth';
import type { GooglePrefill } from '@/api/types';

WebBrowser.maybeCompleteAuthSession();

export type GoogleSignInResult = {
  /** Session created by the API after it exchanged the Google code. */
  token?: string;
  refreshToken?: string;
  idToken?: string;
  /** iOS native flow: code + PKCE verifier, exchanged by the API with GOOGLE_IOS_CLIENT_ID. */
  code?: string;
  codeVerifier?: string;
  redirectUri?: string;
  clientId?: string;
  /** Signup mode: Google profile for prefill only (no session). */
  prefill?: GooglePrefill;
};

export type GoogleSignInMode = 'login' | 'signup';

/** Must match `scheme` in app.json — the API redirects to `{scheme}://oauthredirect`. */
const APP_SCHEME = 'aimarkets';
export const GOOGLE_APP_RETURN_URL = `${APP_SCHEME}://oauthredirect`;

type PendingOAuth = {
  resolve: (result: GoogleSignInResult) => void;
  reject: (error: Error) => void;
};

let pendingOAuth: PendingOAuth | null = null;
let linkingSubscribed = false;

function apiOrigin(): string {
  return API_CONFIG.BASE_URL.replace(/\/+$/, '').replace(/\/v1$/, '');
}

function readParam(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

/** Parse the `aimarkets://oauthredirect?...` deep link the API redirected to. */
export function parseGoogleCallback(url: string): GoogleSignInResult | null {
  if (!url || !url.includes('oauthredirect')) return null;

  const q = Linking.parse(url).queryParams || {};
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
    return { token, refreshToken: readParam(q.refreshToken as string | string[] | undefined) || undefined };
  }
  return null;
}

function settlePending(url: string): boolean {
  if (!pendingOAuth) return false;
  try {
    const parsed = parseGoogleCallback(url);
    if (!parsed) return false;
    pendingOAuth.resolve(parsed);
  } catch (e) {
    pendingOAuth.reject(e instanceof Error ? e : new Error('Đăng nhập Google thất bại'));
  }
  pendingOAuth = null;
  void WebBrowser.dismissBrowser();
  return true;
}

/**
 * Android may deliver the redirect as an app intent (closing the Custom Tab
 * before `openAuthSessionAsync` resolves), so also listen at the app level.
 */
function ensureLinkListener() {
  if (linkingSubscribed || Platform.OS === 'web') return;
  linkingSubscribed = true;
  Linking.addEventListener('url', ({ url }) => {
    settlePending(url);
  });
}

function waitDeepLink(timeoutMs: number): Promise<GoogleSignInResult> {
  return new Promise<GoogleSignInResult>((resolve, reject) => {
    pendingOAuth = { resolve, reject };
    setTimeout(() => {
      if (!pendingOAuth) return;
      pendingOAuth.reject(new Error('CANCELLED'));
      pendingOAuth = null;
    }, timeoutMs);
  });
}

/**
 * Consent runs on the API's Google Web client (`/v1/auth/google/callback` is the
 * only redirect URI Google needs), so no iOS/Android OAuth clients are required.
 */
function googleStartUrl(mode: GoogleSignInMode, native: boolean): string {
  const params = new URLSearchParams();
  if (native) {
    params.set('mobile', '1');
    params.set('scheme', APP_SCHEME);
  } else {
    const returnTo = typeof window !== 'undefined' ? window.location.href.split('?')[0] : '/';
    params.set('returnTo', returnTo);
  }
  if (mode === 'signup') params.set('mode', 'signup');
  return `${apiOrigin()}/v1/auth/google/start?${params.toString()}`;
}

const GOOGLE_DISCOVERY = {
  authorizationEndpoint: 'https://accounts.google.com/o/oauth2/v2/auth',
  tokenEndpoint: 'https://oauth2.googleapis.com/token',
};

/** `com.googleusercontent.apps.{prefix}` — registered in Info.plist by app.config.js. */
function iosReverseScheme(iosClientId: string): string {
  return `com.googleusercontent.apps.${iosClientId.replace('.apps.googleusercontent.com', '')}`;
}

/**
 * The iOS client is usable only when this build registered its reverse scheme
 * (EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID at build time) and the API trusts the same
 * id (GOOGLE_IOS_CLIENT_ID).
 */
async function resolveNativeIosClientId(): Promise<string> {
  if (Platform.OS !== 'ios') return '';
  const built = GOOGLE_AUTH_CONFIG.iosClientId.trim();
  if (!built.endsWith('.apps.googleusercontent.com')) return '';
  try {
    const server = await authApi.getGoogleConfig();
    return server.iosClientId === built ? built : '';
  } catch {
    return '';
  }
}

async function signInWithIosClient(iosClientId: string): Promise<GoogleSignInResult> {
  const redirectUri = `${iosReverseScheme(iosClientId)}:/oauthredirect`;
  const request = new AuthSession.AuthRequest({
    clientId: iosClientId,
    redirectUri,
    responseType: AuthSession.ResponseType.Code,
    scopes: ['openid', 'profile', 'email'],
    usePKCE: true,
    extraParams: { prompt: 'select_account' },
  });
  const result = await request.promptAsync(GOOGLE_DISCOVERY);
  if (result.type === 'cancel' || result.type === 'dismiss') throw new Error('CANCELLED');
  if (result.type !== 'success') throw new Error('Đăng nhập Google thất bại');
  const code = typeof result.params.code === 'string' ? result.params.code : '';
  if (!code) throw new Error('Không nhận được mã Google');
  return { code, codeVerifier: request.codeVerifier, redirectUri, clientId: iosClientId };
}

/**
 * Google sign-in for the app.
 * - iOS with GOOGLE_IOS_CLIENT_ID: native consent, code + PKCE sent to the API.
 * - Otherwise (Android, or iOS without an iOS client): API-hosted consent.
 * @param mode `signup` only prefills the register form; it never creates a session.
 */
export async function signInWithGoogle(mode: GoogleSignInMode = 'login'): Promise<GoogleSignInResult> {
  if (Platform.OS === 'web') {
    window.location.assign(googleStartUrl(mode, false));
    // Navigation leaves the page; resolve the promise contract with a sentinel.
    throw new Error('CANCELLED');
  }

  const iosClientId = await resolveNativeIosClientId();
  if (iosClientId) return signInWithIosClient(iosClientId);

  ensureLinkListener();
  const deepLink = waitDeepLink(180_000);

  const cancelPending = (error: Error) => {
    if (!pendingOAuth) return;
    pendingOAuth.reject(error);
    pendingOAuth = null;
  };

  WebBrowser.openAuthSessionAsync(googleStartUrl(mode, true), GOOGLE_APP_RETURN_URL, {
    showInRecents: true,
    ...(Platform.OS === 'android' ? { createTask: false } : {}),
  })
    .then((result) => {
      if (result.type === 'success' && result.url && settlePending(result.url)) return;
      // Custom Tab closed: give a late Android intent a moment to arrive.
      setTimeout(() => cancelPending(new Error('CANCELLED')), result.type === 'success' ? 0 : 1500);
    })
    .catch((e: unknown) => cancelPending(e instanceof Error ? e : new Error('Đăng nhập Google thất bại')));

  try {
    return await deepLink;
  } finally {
    pendingOAuth = null;
  }
}
