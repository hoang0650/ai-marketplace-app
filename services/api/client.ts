import { API_CONFIG } from './config';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Alert } from 'react-native';

interface RequestOptions {
  method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  body?: unknown;
  headers?: Record<string, string>;
}

class ApiClient {
  private baseUrl = API_CONFIG.BASE_URL;
  private timeout = API_CONFIG.TIMEOUT;
  private static lastNetworkWarning = 0;

  private async request<T>(endpoint: string, options: RequestOptions = {}): Promise<T> {
    const { method = 'GET', body, headers = {} } = options;
    let authHeader: Record<string, string> = {};
    try {
      const token = await AsyncStorage.getItem('auth_token');
      if (token) authHeader = { Authorization: `Bearer ${token}` };
    } catch {}

    const url = `${this.baseUrl}${endpoint}`;
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.timeout);

    try {
      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
          ...authHeader,
          ...headers,
        },
        body: body ? JSON.stringify(body) : undefined,
        signal: controller.signal,
      });
      clearTimeout(timeoutId);
      const rawBody = await response.text();
      if (!response.ok) {
        let errorMessage = rawBody;
        try {
          const json = JSON.parse(rawBody);
          errorMessage = json?.message || JSON.stringify(json);
        } catch {}
        if (response.status === 401) {
          try {
            await AsyncStorage.multiRemove(['auth_token', 'auth_user']);
          } catch {}
          throw new Error('UNAUTHORIZED');
        }
        throw new Error(errorMessage || `API Error: ${response.status}`);
      }
      return rawBody ? (JSON.parse(rawBody) as T) : ({} as T);
    } catch (error) {
      clearTimeout(timeoutId);
      if (error instanceof Error && error.name === 'AbortError') throw new Error('Request timeout');
      const isNetwork =
        (error instanceof TypeError &&
          (error.message === 'Failed to fetch' || error.message === 'Network request failed')) ||
        (error instanceof Error && error.message === 'Network request failed');
      if (isNetwork) {
        const now = Date.now();
        if (now - ApiClient.lastNetworkWarning > 3000) {
          ApiClient.lastNetworkWarning = now;
          try {
            Alert.alert('Mất kết nối', 'Không tới được api.aimarkets.vn');
          } catch {}
        }
        throw new Error('NETWORK_ERROR');
      }
      throw error;
    }
  }

  get<T>(endpoint: string) {
    return this.request<T>(endpoint, { method: 'GET' });
  }
  post<T>(endpoint: string, body?: unknown) {
    return this.request<T>(endpoint, { method: 'POST', body });
  }
  put<T>(endpoint: string, body?: unknown) {
    return this.request<T>(endpoint, { method: 'PUT', body });
  }
  patch<T>(endpoint: string, body?: unknown) {
    return this.request<T>(endpoint, { method: 'PATCH', body });
  }
}

export const apiClient = new ApiClient();
