import { create } from 'zustand';
import { tokenStorage } from '@/lib/secureStorage';
import { stubUserFromToken, tokenUnexpired } from '@/lib/jwt';
import type { User } from '@/api/types';

type AuthState = {
  hydrated: boolean;
  token: string | null;
  user: User | null;
  hydrate: () => Promise<void>;
  setSession: (token: string, user: User, refreshToken?: string) => Promise<void>;
  setUser: (user: User) => Promise<void>;
  logout: () => Promise<void>;
};

export const useAuthStore = create<AuthState>((set) => ({
  hydrated: false,
  token: null,
  user: null,
  hydrate: async () => {
    try {
      const [token, userJson] = await Promise.all([tokenStorage.getAccessToken(), tokenStorage.getUserJson()]);
      if (token && tokenUnexpired(token)) {
        let user: User | null = null;
        if (userJson) {
          try {
            user = JSON.parse(userJson) as User;
          } catch {
            user = null;
          }
        }
        set({ token, user: user || stubUserFromToken(token) });
      } else if (token) {
        await tokenStorage.clear();
      }
    } catch {
      await tokenStorage.clear();
    } finally {
      set({ hydrated: true });
    }
  },
  setSession: async (token, user, refreshToken) => {
    await tokenStorage.setAccessToken(token);
    await tokenStorage.setUserJson(JSON.stringify(user));
    if (refreshToken) await tokenStorage.setRefreshToken(refreshToken);
    set({ token, user });
  },
  setUser: async (user) => {
    await tokenStorage.setUserJson(JSON.stringify(user));
    set({ user });
  },
  logout: async () => {
    await tokenStorage.clear();
    set({ token: null, user: null });
  },
}));

export function selectIsAuthenticated(s: AuthState) {
  return tokenUnexpired(s.token);
}
