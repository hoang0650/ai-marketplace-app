import { apiClient } from './client';
import { API_ENDPOINTS, GOOGLE_AUTH_CONFIG } from './config';

export type UserRole = 'buyer' | 'creator' | 'admin';

export interface User {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  avatarUrl?: string;
  creatorSlug?: string;
  bio?: string;
}

export interface AuthResponse {
  token: string;
  user: User;
}

export interface GoogleAuthConfigResponse {
  enabled: boolean;
  clientId?: string;
  iosClientId?: string;
  androidClientId?: string;
}

export const authApi = {
  login: async (email: string, password: string): Promise<AuthResponse> => {
    return apiClient.post<AuthResponse>(API_ENDPOINTS.AUTH.LOGIN, { email, password });
  },

  register: async (data: { email: string; password: string; name: string; asCreator?: boolean }) => {
    return apiClient.post<AuthResponse>(API_ENDPOINTS.AUTH.REGISTER, data);
  },

  me: async (): Promise<User> => apiClient.get<User>(API_ENDPOINTS.AUTH.ME),

  getGoogleConfig: async (): Promise<GoogleAuthConfigResponse> => {
    const fallback = (): GoogleAuthConfigResponse => {
      const clientId =
        GOOGLE_AUTH_CONFIG.webClientId ||
        GOOGLE_AUTH_CONFIG.iosClientId ||
        GOOGLE_AUTH_CONFIG.androidClientId ||
        '';
      return { enabled: !!clientId, clientId };
    };
    try {
      const response = await apiClient.get<GoogleAuthConfigResponse>(API_ENDPOINTS.AUTH.GOOGLE_CONFIG);
      if (!response?.clientId && !response?.iosClientId && !response?.androidClientId) return fallback();
      return {
        enabled: !!response.enabled,
        clientId: response.clientId,
        iosClientId: response.iosClientId,
        androidClientId: response.androidClientId,
      };
    } catch {
      return fallback();
    }
  },

  loginWithGoogle: async (data: {
    idToken?: string;
    code?: string;
    redirectUri?: string;
    clientId?: string;
  }): Promise<AuthResponse> => {
    return apiClient.post<AuthResponse>(API_ENDPOINTS.AUTH.GOOGLE_LOGIN, {
      ...data,
      redirectUri: data.redirectUri || 'postmessage',
    });
  },
};
