import { useQuery } from '@tanstack/react-query';
import { walletApi } from '@/api';

/** One ledger amount, quoted by the server's existing Exchange Rate API route. */
export function useLedgerQuote(amount: number | null, currency: string | null, enabled: boolean) {
  return useQuery({
    queryKey: ['exchange-quote', amount, currency],
    queryFn: () => walletApi.exchangeQuote(amount as number, currency as string),
    enabled: enabled && amount != null && amount > 0 && !!currency,
    retry: false,
    staleTime: 60_000,
  });
}
