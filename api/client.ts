import { tokenStorage } from '@/lib/secureStorage';
import { ApiError, toUserMessage } from '@/lib/errors';
import { useSettingsStore } from '@/stores/settingsStore';
import { useAuthStore } from '@/stores/authStore';
import { tokenUnexpired } from '@/lib/jwt';
import type { AuthResponse } from './types';

export const API_CONFIG = {
  BASE_URL: (process.env.EXPO_PUBLIC_API_URL || 'https://api.aimarkets.vn/v1').replace(/\/$/, ''),
  APP_ENV: process.env.EXPO_PUBLIC_APP_ENV || 'production',
  TIMEOUT: 20000,
};

export const GOOGLE_AUTH_CONFIG = {
  webClientId: process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID || '',
  iosClientId: process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID || '',
  androidClientId: process.env.EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID || '',
};

type Method = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';

function lang(): 'vi' | 'en' {
  return useSettingsStore.getState().language;
}

let refreshLock: Promise<boolean> | null = null;

async function tryRefreshAccessToken(): Promise<boolean> {
  if (refreshLock) return refreshLock;
  refreshLock = (async () => {
    const refreshToken = await tokenStorage.getRefreshToken();
    if (!refreshToken) return false;
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), API_CONFIG.TIMEOUT);
    try {
      const response = await fetch(`${API_CONFIG.BASE_URL}/auth/refresh-token`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify({ refreshToken }),
        signal: controller.signal,
      });
      const rawBody = await response.text();
      const parsed = rawBody ? safeJson(rawBody) : null;
      if (!response.ok || !parsed || typeof parsed.token !== 'string') return false;
      const session = parsed as unknown as AuthResponse;
      await useAuthStore.getState().setSession(session.token, session.user, session.refreshToken || refreshToken);
      return true;
    } catch {
      return false;
    } finally {
      clearTimeout(timeoutId);
    }
  })().finally(() => {
    refreshLock = null;
  });
  return refreshLock;
}

class ApiClient {
  async request<T>(
    endpoint: string,
    options: { method?: Method; body?: unknown; timeoutMs?: number } = {},
    allowRefresh = true,
  ): Promise<T> {
    const { method = 'GET', body, timeoutMs = API_CONFIG.TIMEOUT } = options;
    const token = await tokenStorage.getAccessToken();
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
    try {
      const response = await fetch(`${API_CONFIG.BASE_URL}${endpoint}`, {
        method,
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: body ? JSON.stringify(body) : undefined,
        signal: controller.signal,
      });
      clearTimeout(timeoutId);
      const rawBody = await response.text();
      const parsed = rawBody ? safeJson(rawBody) : null;
      if (response.status === 401) {
        const isAuthPath =
          endpoint.startsWith('/auth/login') ||
          endpoint.startsWith('/auth/register') ||
          endpoint.startsWith('/auth/refresh-token') ||
          endpoint.startsWith('/auth/logout') ||
          endpoint.startsWith('/auth/google');
        if (allowRefresh && !isAuthPath) {
          const ok = await tryRefreshAccessToken();
          if (ok) return this.request<T>(endpoint, options, false);
        }
        const access = await tokenStorage.getAccessToken();
        const keepSession = !isAuthPath && tokenUnexpired(access);
        if (!keepSession) {
          await useAuthStore.getState().logout();
        }
        throw new ApiError(401, 'UNAUTHORIZED', toUserMessage('UNAUTHORIZED', lang()));
      }
      if (!response.ok) {
        const message = typeof parsed?.message === 'string' ? parsed.message : rawBody;
        const code = typeof parsed?.code === 'string' ? parsed.code : `HTTP_${response.status}`;
        throw new ApiError(response.status, code, toUserMessage(message, lang()));
      }
      return (parsed ?? {}) as T;
    } catch (error) {
      clearTimeout(timeoutId);
      if (error instanceof ApiError) throw error;
      if (error instanceof Error && error.name === 'AbortError') {
        throw new ApiError(408, 'TIMEOUT', toUserMessage('Request timeout', lang()));
      }
      throw new ApiError(0, 'NETWORK_ERROR', toUserMessage('NETWORK_ERROR', lang()));
    }
  }

  get<T>(endpoint: string) {
    return this.request<T>(endpoint, { method: 'GET' });
  }
  post<T>(endpoint: string, body?: unknown, timeoutMs?: number) {
    return this.request<T>(endpoint, { method: 'POST', body, timeoutMs });
  }
  put<T>(endpoint: string, body?: unknown) {
    return this.request<T>(endpoint, { method: 'PUT', body });
  }
  patch<T>(endpoint: string, body?: unknown) {
    return this.request<T>(endpoint, { method: 'PATCH', body });
  }
  delete<T>(endpoint: string) {
    return this.request<T>(endpoint, { method: 'DELETE' });
  }
}

function safeJson(raw: string): Record<string, unknown> | null {
  try {
    return JSON.parse(raw) as Record<string, unknown>;
  } catch {
    return null;
  }
}

export const apiClient = new ApiClient();
