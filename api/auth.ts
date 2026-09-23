import { apiClient, GOOGLE_AUTH_CONFIG } from './client';
import { tokenStorage } from '@/lib/secureStorage';
import type { AuthResponse, GooglePrefill, SignupRole, User } from './types';

export const authApi = {
  login: (email: string, password: string) => apiClient.post<AuthResponse>('/auth/login', { email, password }),
  register: (data: {
    email: string;
    password: string;
    name: string;
    confirmPassword?: string;
    role?: SignupRole;
    avatarUrl?: string;
    googleSignupToken?: string;
  }) => apiClient.post<AuthResponse>('/auth/register', data),
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
  loginWithGoogle: (data: {
    token?: string;
    refreshToken?: string;
    idToken?: string;
    code?: string;
    redirectUri?: string;
    clientId?: string;
  }) => {
    if (data.token) {
      return (async () => {
        await tokenStorage.setAccessToken(data.token!);
        if (data.refreshToken) await tokenStorage.setRefreshToken(data.refreshToken);
        const user = await apiClient.get<User>('/auth/me');
        return { token: data.token!, refreshToken: data.refreshToken, user } as AuthResponse;
      })();
    }
    return apiClient.post<AuthResponse>('/auth/google/login', {
      idToken: data.idToken,
      code: data.code,
      clientId: data.clientId,
      redirectUri: data.redirectUri || 'postmessage',
    });
  },
  googlePrefill: (data: { idToken?: string; code?: string; redirectUri?: string; clientId?: string }) =>
    apiClient.post<GooglePrefill>('/auth/google/prefill', {
      idToken: data.idToken,
      code: data.code,
      clientId: data.clientId,
      redirectUri: data.redirectUri || 'postmessage',
    }),
  refresh: (refreshToken: string) => apiClient.post<AuthResponse>('/auth/refresh-token', { refreshToken }),
  logout: (refreshToken?: string) => apiClient.post<{ message: string }>('/auth/logout', refreshToken ? { refreshToken } : {}),
};
