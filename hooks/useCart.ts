import { useCallback, useMemo } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { cartApi, type CartResponse } from '@/api';
import { useAuthStore, selectIsAuthenticated } from '@/stores/authStore';
import { AnalyticsService } from '@/lib/analytics';

const KEY = ['cart'] as const;
const EMPTY: CartResponse = { items: [], count: 0 };

/** Server-side cart shared with the web (`/v1/cart`); independent of favorites. */
export function useCart() {
  const isAuthenticated = useAuthStore(selectIsAuthenticated);
  const qc = useQueryClient();
  const q = useQuery({
    queryKey: KEY,
    queryFn: cartApi.get,
    enabled: isAuthenticated,
    staleTime: 30_000,
  });
  const data = isAuthenticated ? q.data || EMPTY : EMPTY;
  const ids = useMemo(() => new Set(data.items.map((l) => l.product.id)), [data.items]);

  const onSuccess = (res: CartResponse) => qc.setQueryData(KEY, res);
  const onError = () => void qc.invalidateQueries({ queryKey: KEY });

  const addM = useMutation({
    mutationFn: ({ productId, qty }: { productId: string; qty: number }) => cartApi.add(productId, qty),
    onSuccess,
    onError,
  });
  const qtyM = useMutation({
    mutationFn: ({ productId, qty }: { productId: string; qty: number }) =>
      qty <= 0 ? cartApi.remove(productId) : cartApi.setQty(productId, Math.min(99, qty)),
    onMutate: ({ productId, qty }) => {
      const prev = qc.getQueryData<CartResponse>(KEY);
      if (!prev) return;
      const items =
        qty <= 0
          ? prev.items.filter((l) => l.product.id !== productId)
          : prev.items.map((l) => (l.product.id === productId ? { ...l, qty: Math.min(99, qty) } : l));
      qc.setQueryData(KEY, { items, count: items.reduce((s, l) => s + l.qty, 0) });
    },
    onSuccess,
    onError,
  });

  const add = useCallback(
    (productId: string, qty = 1) => {
      AnalyticsService.track('add_to_cart', { id: productId });
      return addM.mutateAsync({ productId, qty });
    },
    [addM],
  );
  const setQty = useCallback(
    (productId: string, qty: number) => qtyM.mutate({ productId, qty: Math.floor(qty) }),
    [qtyM],
  );
  const remove = useCallback((productId: string) => qtyM.mutate({ productId, qty: 0 }), [qtyM]);
  const has = useCallback((productId?: string) => !!productId && ids.has(productId), [ids]);

  return {
    lines: data.items,
    count: data.count,
    has,
    add,
    adding: addM.isPending,
    setQty,
    remove,
    isLoading: q.isLoading,
    isFetching: q.isFetching,
    refetch: q.refetch,
    isAuthenticated,
  };
}
