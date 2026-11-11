/**
 * Buyer choice for a professional-service package.
 * Prepaid means the wallet is debited now into escrow and the seller is
 * credited only when the buyer accepts. Staged debits each phase on acceptance.
 * priceVnd is the server quote. This module does not convert a ledger price.
 */

export type PaymentChoice = 'staged' | 'prepaid';

export function paymentChoiceOf(raw: string | null | undefined): PaymentChoice | null {
  if (raw === 'staged' || raw === 'prepaid') return raw;
  return null;
}

export interface PackagePriceQuote {
  amountVnd?: unknown;
  authoritative?: unknown;
  code?: string | null;
}

export function packagePriceVnd(quote: PackagePriceQuote | null | undefined): number | null {
  if (!quote || quote.authoritative !== true || typeof quote.amountVnd !== 'number' || !Number.isSafeInteger(quote.amountVnd) || quote.amountVnd <= 0) {
    return null;
  }
  return quote.amountVnd;
}

export interface SellerPackageDraft {
  name: string;
  scope: string;
  deliverable: string;
  durationDays: string;
  price: string;
  currency: string;
}

/** The amount is stored as entered. This does not turn USD into VND. */
export function sellerPackageDraft(input: SellerPackageDraft):
  | { ok: true; row: { name: string; scope: string; deliverables: string[]; durationDays: number; price: number; currency: 'USD' | 'VND' } }
  | { ok: false; code: 'SERVICE_PACKAGE_FIELDS' | 'SERVICE_PACKAGE_DURATION' | 'SERVICE_PACKAGE_PRICE' | 'SERVICE_PACKAGE_CURRENCY' } {
  const name = input.name.trim();
  const scope = input.scope.trim();
  const deliverable = input.deliverable.trim();
  const durationDays = Number(input.durationDays);
  const price = Number(input.price);
  const currency = input.currency.trim().toUpperCase();
  if (!name || !scope || !deliverable) return { ok: false, code: 'SERVICE_PACKAGE_FIELDS' };
  if (!Number.isInteger(durationDays) || durationDays < 1 || durationDays > 365) return { ok: false, code: 'SERVICE_PACKAGE_DURATION' };
  if (!(price > 0) || price > 100000) return { ok: false, code: 'SERVICE_PACKAGE_PRICE' };
  if (currency !== 'USD' && currency !== 'VND') return { ok: false, code: 'SERVICE_PACKAGE_CURRENCY' };
  return { ok: true, row: { name, scope, deliverables: [deliverable], durationDays, price, currency } };
}
