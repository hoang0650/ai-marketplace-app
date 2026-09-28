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
  /** Android native SDK: ID token (aud = Web client, azp = GOOGLE_ANDROID_CLIENT_ID). */
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

type ClientIds = {
  webClientId: string;
  iosClientId: string;
  androidClientId: string;
};

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

function isGoogleClientId(value: string): boolean {
  return value.trim().endsWith('.apps.googleusercontent.com');
}

/** The API exchanges codes / verifies tokens, so its client ids win over build-time env. */
async function resolveClientIds(): Promise<ClientIds> {
  const server = await authApi.getGoogleConfig();
  return {
    webClientId: (server.clientId || GOOGLE_AUTH_CONFIG.webClientId).trim(),
    iosClientId: (server.iosClientId || GOOGLE_AUTH_CONFIG.iosClientId).trim(),
    androidClientId: (server.androidClientId || GOOGLE_AUTH_CONFIG.androidClientId).trim(),
  };
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

/** iOS (same as phhotel-pms): iOS client + reverse-scheme redirect, code exchanged by the API. */
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

type GoogleSigninModule = typeof import('@react-native-google-signin/google-signin');

/** Throws at import time in builds without the native module (e.g. Expo Go). */
function loadGoogleSigninModule(): GoogleSigninModule | null {
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    return require('@react-native-google-signin/google-signin') as GoogleSigninModule;
  } catch {
    return null;
  }
}

/**
 * Android: Google rejects browser OAuth for Android clients (no redirect URIs,
 * no custom schemes), so the Android client is only usable through the native
 * SDK. The SDK matches the Android client by package + SHA-1 and returns an ID
 * token whose audience is the Web client.
 *
 * Returns null when the SDK is unavailable or misconfigured (DEVELOPER_ERROR,
 * no Play services) so the caller can fall back to the API-hosted flow.
 */
async function signInWithAndroidSdk(webClientId: string): Promise<GoogleSignInResult | null> {
  if (!isGoogleClientId(webClientId)) return null;
  const mod = loadGoogleSigninModule();
  if (!mod) return null;
  const { GoogleSignin, isErrorWithCode, isSuccessResponse, statusCodes } = mod;

  try {
    GoogleSignin.configure({ webClientId });
    await GoogleSignin.hasPlayServices({ showPlayServicesUpdateDialog: true });
    // Always show the account picker instead of reusing the last account.
    await GoogleSignin.signOut().catch(() => null);
    const response = await GoogleSignin.signIn();
    if (!isSuccessResponse(response)) throw new Error('CANCELLED');
    const idToken = response.data.idToken;
    return idToken ? { idToken } : null;
  } catch (e) {
    if (e instanceof Error && e.message === 'CANCELLED') throw e;
    if (isErrorWithCode(e) && (e.code === statusCodes.SIGN_IN_CANCELLED || e.code === statusCodes.IN_PROGRESS)) {
      throw new Error('CANCELLED');
    }
    if (__DEV__) console.warn('[GoogleAuth] Android SDK failed, using API-hosted flow:', e);
    return null;
  }
}

/** Consent on the API's Web client; the API redirects back to `aimarkets://oauthredirect`. */
async function signInWithApiHostedFlow(mode: GoogleSignInMode): Promise<GoogleSignInResult> {
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

/**
 * Google sign-in for the app.
 * - iOS: iOS client (GOOGLE_IOS_CLIENT_ID), code + PKCE sent to the API.
 * - Android: native SDK ID token, verified by the API against GOOGLE_ANDROID_CLIENT_ID.
 * - Fallback (no native client / SDK): API-hosted consent.
 * @param mode `signup` only prefills the register form; it never creates a session.
 */
export async function signInWithGoogle(mode: GoogleSignInMode = 'login'): Promise<GoogleSignInResult> {
  if (Platform.OS === 'web') {
    window.location.assign(googleStartUrl(mode, false));
    // Navigation leaves the page; resolve the promise contract with a sentinel.
    throw new Error('CANCELLED');
  }

  const clients = await resolveClientIds();

  if (Platform.OS === 'ios' && isGoogleClientId(clients.iosClientId)) {
    return signInWithIosClient(clients.iosClientId);
  }

  if (Platform.OS === 'android') {
    const native = await signInWithAndroidSdk(clients.webClientId);
    if (native) return native;
  }

  return signInWithApiHostedFlow(mode);
}
