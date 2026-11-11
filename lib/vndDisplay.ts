/**
 * VND on the Vietnamese interface comes only from a server quote.
 * The server keeps its existing Exchange Rate API source. This module does
 * not call a provider, store a rate, or multiply a ledger amount.
 * A missing or non-authoritative quote stays closed. A sub-dong figure is
 * not raised to 1. The stored ledger amount is not relabelled as VND.
 */

export interface ServerVndQuote {
  amountVnd?: unknown;
  authoritative?: unknown;
  code?: string | null;
  ledgerCurrency?: string | null;
  displayOnly?: boolean;
  rateSource?: string | null;
}

export type ServerVndRead = { ok: true; amountVnd: number } | { ok: false; code: string };

export function serverVndInteger(quote: ServerVndQuote | null | undefined): number | null {
  const read = readServerVnd(quote);
  return read.ok ? read.amountVnd : null;
}

export function readServerVnd(quote: ServerVndQuote | null | undefined): ServerVndRead {
  if (!quote || typeof quote !== 'object') return { ok: false, code: 'VND_UNAVAILABLE' };
  if (quote.authoritative !== true || typeof quote.amountVnd !== 'number' || !Number.isSafeInteger(quote.amountVnd)) {
    const code = typeof quote.code === 'string' && quote.code ? quote.code : 'VND_UNAVAILABLE';
    return { ok: false, code };
  }
  if (quote.amountVnd <= 0) return { ok: false, code: quote.code || 'AMOUNT_BELOW_VND_PRECISION' };
  return { ok: true, amountVnd: quote.amountVnd };
}

/** Ledger cents, matching the server charge rounding. This is not a rate. */
export function ledgerPayableAmount(unit: number, quantity: number): number {
  const q = Number.isFinite(quantity) && quantity > 0 ? quantity : 1;
  return Math.round((Number(unit) || 0) * q * 100) / 100;
}

export function listedVndQuote(product: {
  pricing?: { model?: string } | null;
  pricingVnd?: {
    price?: ServerVndQuote | null;
    usageRate?: ServerVndQuote | null;
    compareAtPrice?: ServerVndQuote | null;
  } | null;
}, kind: 'price' | 'usageRate' | 'compareAtPrice' = 'price'): ServerVndQuote | null {
  const box = product.pricingVnd;
  if (!box) return null;
  if (kind === 'compareAtPrice') return box.compareAtPrice ?? null;
  if (kind === 'usageRate' || product.pricing?.model === 'usage') return box.usageRate ?? null;
  return box.price ?? null;
}

/** The debit the server stored. A display quote is not copied onto it. */
export function ledgerCharge(server: { amount?: number; currency?: string | null }): {
  amount: number | undefined;
  currency: string | undefined;
} {
  return {
    amount: server.amount,
    currency: server.currency == null ? undefined : String(server.currency),
  };
}
