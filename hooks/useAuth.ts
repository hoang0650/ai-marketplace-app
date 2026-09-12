import { useEffect } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { authApi } from '@/api/auth';
import { useAuthStore } from '@/stores/authStore';
import { tokenStorage } from '@/lib/secureStorage';
import { tokenUnexpired } from '@/lib/jwt';

/** Refresh the signed-in user once per session. Do not call from list cells. */
export function AuthSessionSync() {
  const hydrated = useAuthStore((s) => s.hydrated);
  const token = useAuthStore((s) => s.token);

  useEffect(() => {
    if (!hydrated || !token) return;
    let cancelled = false;
    authApi
      .me()
      .then((fresh) => {
        if (!cancelled) void useAuthStore.getState().setUser(fresh);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [hydrated, token]);

  return null;
}

export function useAuth() {
  const token = useAuthStore((s) => s.token);
  const user = useAuthStore((s) => s.user);
  const hydrated = useAuthStore((s) => s.hydrated);
  const setSession = useAuthStore((s) => s.setSession);
  const logoutStore = useAuthStore((s) => s.logout);
  const qc = useQueryClient();
  const authed = tokenUnexpired(token);

  const loginMutation = useMutation({
    mutationFn: ({ email, password }: { email: string; password: string }) => authApi.login(email, password),
    onSuccess: (res) => setSession(res.token, res.user, res.refreshToken),
  });
  const googleMutation = useMutation({
    mutationFn: authApi.loginWithGoogle,
    onSuccess: (res) => setSession(res.token, res.user, res.refreshToken),
  });
  const registerMutation = useMutation({
    mutationFn: authApi.register,
    onSuccess: (res) => setSession(res.token, res.user, res.refreshToken),
  });

  return {
    user,
    token,
    isAuthenticated: authed,
    isInitialized: hydrated,
    isLoading: !hydrated,
    isAdmin: user?.role === 'admin',
    isCreator: user?.role === 'creator' || user?.role === 'admin',
    login: loginMutation.mutateAsync,
    loginLoading: loginMutation.isPending,
    loginWithGoogle: googleMutation.mutateAsync,
    googleLoginLoading: googleMutation.isPending,
    register: registerMutation.mutateAsync,
    registerLoading: registerMutation.isPending,
    logout: async () => {
      const refreshToken = await tokenStorage.getRefreshToken();
      try {
        await authApi.logout(refreshToken || undefined);
      } catch {
        /* still clear local session */
      }
      await logoutStore();
      qc.clear();
    },
  };
}
