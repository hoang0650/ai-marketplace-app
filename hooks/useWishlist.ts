import { useCallback, useMemo } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { wishlistApi } from '@/api';
import { useAuthStore, selectIsAuthenticated } from '@/stores/authStore';
import { AnalyticsService } from '@/lib/analytics';

export function useWishlist() {
  const isAuthenticated = useAuthStore(selectIsAuthenticated);
  const qc = useQueryClient();
  const q = useQuery({
    queryKey: ['wishlist'],
    queryFn: wishlistApi.list,
    enabled: isAuthenticated,
    staleTime: 30_000,
  });
  const ids = useMemo(() => new Set((q.data || []).map((p) => p.id)), [q.data]);
  const mutation = useMutation({
    mutationFn: (productId: string) => wishlistApi.toggle(productId),
    onSuccess: (res) => {
      qc.setQueryData(['wishlist'], res.wishlist || []);
    },
  });

  const saved = useCallback((productId?: string) => !!productId && ids.has(productId), [ids]);

  const toggle = useCallback(
    (productId: string) => {
      AnalyticsService.track('add_favorite', { id: productId });
      mutation.mutate(productId);
    },
    [mutation],
  );

  return {
    items: q.data || [],
    isLoading: q.isLoading,
    refetch: q.refetch,
    isFetching: q.isFetching,
    ids,
    saved,
    toggle,
    togglingId: mutation.isPending ? mutation.variables : '',
    isAuthenticated,
  };
}
