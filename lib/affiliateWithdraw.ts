/**
 * Affiliate payout request. There is no commercial minimum.
 * The wallet amount is USD with 2 decimal places. The form amount is whole VND.
 * A VND figure that rounds to 0.00 USD is below currency precision, not a program minimum.
 * Seller and employer withdrawal minimums are not decided here.
 *
 * `thresholdVnd` and `minWithdrawVnd` on older affiliate payloads are the former
 * 2,000,000 VND commercial floor. This module does not read them. The server
 * still validates the posted amount (balance, hold, identity, tax).
 */

export const AFFILIATE_USD_DECIMALS = 2;
export const AFFILIATE_WITHDRAW_PERSONA = 'affiliate' as const;

/** Codes the current API returns while it still enforces the old configured minimum. */
export const LEGACY_AFFILIATE_MIN_CODES = ['AFFILIATE_MIN_BALANCE', 'AFFILIATE_MIN_WITHDRAWAL'] as const;

export type AffiliateWithdrawCode = 'ok' | 'nonfinite' | 'not_positive' | 'below_precision' | 'exceeds_available';

export interface AffiliateWithdrawInput {
  /** Amount typed on the affiliate form, in VND. */
  amountVnd: number;
  /** Withdrawable affiliate commission in wallet currency (USD). Excludes the 48h hold. */
  availableUsd: number;
  /** Same available balance converted to whole VND by the server quote. */
  availableVnd: number;
  /** VND per 1 USD used only to convert a partial request. Must be positive. */
  vndPerUsd: number;
}

export interface AffiliateWithdrawQuote {
  ok: boolean;
  code: AffiliateWithdrawCode;
  /** Body `amount` for POST /wallet/withdraw with persona affiliate. USD, 2 decimals. */
  amountUsd: number;
  /** Whole VND after precision rounding. 0 when rejected. */
  amountVnd: number;
}

export interface AffiliateWithdrawBody {
  amount: number;
  persona: typeof AFFILIATE_WITHDRAW_PERSONA;
}

function fail(code: Exclude<AffiliateWithdrawCode, 'ok'>): AffiliateWithdrawQuote {
  return { ok: false, code, amountUsd: 0, amountVnd: 0 };
}

function roundUsd(n: number): number {
  return Math.round((n + Number.EPSILON) * 100) / 100;
}

export function quoteAffiliateWithdraw(input: AffiliateWithdrawInput): AffiliateWithdrawQuote {
  const amountVnd = input.amountVnd;
  const availableUsd = input.availableUsd;
  const availableVnd = input.availableVnd;
  const vndPerUsd = input.vndPerUsd;
  if (
    !Number.isFinite(amountVnd) ||
    !Number.isFinite(availableUsd) ||
    !Number.isFinite(availableVnd) ||
    !Number.isFinite(vndPerUsd) ||
    vndPerUsd <= 0 ||
    availableUsd < 0 ||
    availableVnd < 0
  ) {
    return fail('nonfinite');
  }

  const vnd = Math.round(amountVnd);
  if (vnd <= 0) return fail('not_positive');

  const availVnd = Math.round(availableVnd);
  const availUsd = roundUsd(availableUsd);
  if (vnd > availVnd) return fail('exceeds_available');

  // Paying the full quoted VND balance uses the exact USD balance so FX rounding cannot exceed it.
  const amountUsd = vnd === availVnd ? availUsd : roundUsd(vnd / vndPerUsd);
  if (!(amountUsd > 0)) return fail('below_precision');
  if (amountUsd > availUsd) return fail('exceeds_available');
  return { ok: true, code: 'ok', amountUsd, amountVnd: vnd };
}

/** Rate implied by the server's own available USD and available VND. No baked-in FX fallback. */
export function impliedVndPerUsd(availableUsd: number, availableVnd: number): number {
  const usd = Number(availableUsd);
  const vnd = Number(availableVnd);
  if (!(usd > 0) || !(vnd > 0) || !Number.isFinite(usd) || !Number.isFinite(vnd)) return Number.NaN;
  return vnd / usd;
}

/**
 * Whole VND from the text field.
 * Grouped `1.000.000` / `1,000,000` are accepted. A fractional đồng is not a valid VND amount.
 * Blank is 0 (rejected as not positive). There is no commercial minimum in this parser.
 */
export function parseAffiliateVndInput(raw: string): number {
  const s = String(raw ?? '').trim().replace(/\s/g, '');
  if (!s) return 0;
  if (/^-?\d{1,3}(\.\d{3})+$/.test(s) || /^-?\d{1,3}(,\d{3})+$/.test(s)) {
    return Number(s.replace(/[.,]/g, ''));
  }
  if (/^-?\d+$/.test(s)) return Number(s);
  return Number.NaN;
}

/** Body for the existing POST /wallet/withdraw. Null when the quote is not payable. */
export function affiliateWithdrawBody(quote: AffiliateWithdrawQuote): AffiliateWithdrawBody | null {
  if (!quote.ok || !(quote.amountUsd > 0)) return null;
  const amount = roundUsd(quote.amountUsd);
  if (!(amount > 0)) return null;
  return { amount, persona: AFFILIATE_WITHDRAW_PERSONA };
}

export function isLegacyAffiliateMinimumRejection(code: string | null | undefined): boolean {
  return code === 'AFFILIATE_MIN_BALANCE' || code === 'AFFILIATE_MIN_WITHDRAWAL';
}

export function isAffiliatePayoutPersona(persona: string | null | undefined): boolean {
  return persona === AFFILIATE_WITHDRAW_PERSONA;
}
