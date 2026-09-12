import { apiClient, GOOGLE_AUTH_CONFIG } from './client';
import type { AuthResponse, User } from './types';

export const authApi = {
  login: (email: string, password: string) => apiClient.post<AuthResponse>('/auth/login', { email, password }),
  register: (data: { email: string; password: string; name: string }) =>
    apiClient.post<AuthResponse>('/auth/register', data),
  me: () => apiClient.get<User>('/auth/me'),
  patchMe: (data: Partial<Pick<User, 'name' | 'bio' | 'avatarUrl'>>) => apiClient.patch<User>('/auth/me', data),
  getGoogleConfig: async () => {
    try {
      return await apiClient.get<{ enabled: boolean; clientId?: string; iosClientId?: string; androidClientId?: string }>(
        '/auth/google/config',
      );
    } catch {
      const clientId = GOOGLE_AUTH_CONFIG.webClientId;
      return { enabled: !!clientId, clientId };
    }
  },
  loginWithGoogle: (data: { idToken?: string; code?: string; redirectUri?: string; clientId?: string }) =>
    apiClient.post<AuthResponse>('/auth/google/login', { ...data, redirectUri: data.redirectUri || 'postmessage' }),
  refresh: (refreshToken: string) => apiClient.post<AuthResponse>('/auth/refresh-token', { refreshToken }),
  logout: (refreshToken?: string) => apiClient.post<{ message: string }>('/auth/logout', refreshToken ? { refreshToken } : {}),
};
