/**
 * Buyer withdrawal of a VietQR transfer into the company bank account.
 * The server must return `buyerDepositWithdraw`. A missing or stale summary
 * does not fall back to the pooled wallet balance, and `payableUsd` is only
 * a foreign-exchange reference. It is never submitted.
 * App Store, Google Play, removed GPay and unknown deposits are not cashed out.
 * A manual supplier-tax review is not an electronic-identity status.
 * The server compares the payout-account holder with eKYC. This module does not.
 */

export const VIETQR_WITHDRAW_SOURCE = 'vietqr_company_bank' as const;

export interface BuyerDepositWithdrawSnapshot {
  enabled?: boolean | null;
  fundingSeparated?: boolean | null;
  electronicIdentityStatus?: string | null;
  payableUsd?: number | null;
  payableVnd?: number | null;
  blockedSources?: readonly string[] | null;
  settlement?: string | null;
  refundsSeparate?: boolean | null;
  source?: string | null;
}

export type BuyerTopupBlocker =
  | 'SERVER_GATE_CLOSED'
  | 'IDENTITY_REQUIRED'
  | 'APPSTORE_UNRESOLVED'
  | 'GPAY_REMOVED'
  | 'SOURCE_NOT_SEPARATED'
  | 'NOTHING_TO_WITHDRAW'
  | 'DEPOSIT_CAP'
  | 'INVALID_AMOUNT';

function wholeVnd(value: unknown): number | null {
  if (typeof value !== 'number' || !Number.isFinite(value) || !Number.isInteger(value)) return null;
  return value;
}

export function buyerTopupWithdrawDecision(input: {
  snapshot?: BuyerDepositWithdrawSnapshot | null;
  amountVnd?: number | null;
}): { ok: true; amountVnd: number } | { ok: false; blocker: BuyerTopupBlocker } {
  const snap = input.snapshot;
  if (
    !snap ||
    snap.enabled !== true ||
    snap.fundingSeparated !== true ||
    snap.settlement !== 'VND' ||
    snap.refundsSeparate !== true
  ) {
    return { ok: false, blocker: 'SERVER_GATE_CLOSED' };
  }
  if (snap.source != null && snap.source !== '' && snap.source !== VIETQR_WITHDRAW_SOURCE) {
    return { ok: false, blocker: 'SOURCE_NOT_SEPARATED' };
  }
  if (snap.electronicIdentityStatus !== 'verified') return { ok: false, blocker: 'IDENTITY_REQUIRED' };
  const payable = wholeVnd(snap.payableVnd);
  const blocked = snap.blockedSources || [];
  if (payable == null || payable <= 0) {
    if (blocked.includes('appstore')) return { ok: false, blocker: 'APPSTORE_UNRESOLVED' };
    if (blocked.includes('gpay')) return { ok: false, blocker: 'GPAY_REMOVED' };
    if (blocked.includes('unknown') || blocked.includes('other')) return { ok: false, blocker: 'SOURCE_NOT_SEPARATED' };
    return { ok: false, blocker: 'NOTHING_TO_WITHDRAW' };
  }
  const amount = wholeVnd(input.amountVnd);
  if (amount == null || amount <= 0) return { ok: false, blocker: 'NOTHING_TO_WITHDRAW' };
  if (amount > payable) return { ok: false, blocker: 'DEPOSIT_CAP' };
  return { ok: true, amountVnd: amount };
}

/** Digits only. A thousands separator is not interpreted. */
export function parseVndInput(raw: string): { ok: true; amountVnd: number } | { ok: false; code: 'empty' | 'INVALID_AMOUNT' } {
  const text = String(raw ?? '').trim();
  if (!text) return { ok: false, code: 'empty' };
  if (!/^\d+$/.test(text)) return { ok: false, code: 'INVALID_AMOUNT' };
  const amountVnd = Number(text);
  if (!Number.isSafeInteger(amountVnd) || amountVnd <= 0) return { ok: false, code: 'INVALID_AMOUNT' };
  return { ok: true, amountVnd };
}

export interface PayoutAccountInput {
  bankName?: string | null;
  accountNumber?: string | null;
  accountName?: string | null;
}

export type PayoutAccountCode =
  | 'BANK_ACCOUNT_REQUIRED'
  | 'INVALID_BANK_NAME'
  | 'INVALID_ACCOUNT_NUMBER'
  | 'INVALID_ACCOUNT_NAME';

/** Shape check only. The server decides whether the holder matches eKYC. */
export function parsePayoutAccountInput(
  raw: PayoutAccountInput | null | undefined,
): { ok: true; bankName: string; accountNumber: string; accountName: string } | { ok: false; code: PayoutAccountCode } {
  const bankName = String(raw?.bankName ?? '')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 100);
  const accountNumber = String(raw?.accountNumber ?? '').replace(/[\s.-]/g, '');
  const accountName = String(raw?.accountName ?? '')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 100);
  if (!bankName && !accountNumber && !accountName) return { ok: false, code: 'BANK_ACCOUNT_REQUIRED' };
  if (bankName.length < 2) return { ok: false, code: 'INVALID_BANK_NAME' };
  if (!/^\d{6,20}$/.test(accountNumber)) return { ok: false, code: 'INVALID_ACCOUNT_NUMBER' };
  if (accountName.length < 2) return { ok: false, code: 'INVALID_ACCOUNT_NAME' };
  return { ok: true, bankName, accountNumber, accountName };
}

export interface VietqrWithdrawBody {
  source: typeof VIETQR_WITHDRAW_SOURCE;
  amountVnd: number;
  settlement: 'VND';
  bankAccount?: { bankName: string; accountNumber: string; accountName: string };
  saveAccount?: true;
}

export function vietqrWithdrawRequest(input: {
  snapshot?: BuyerDepositWithdrawSnapshot | null;
  amountVnd?: number | null;
  /** A saved server account is reused. A typed account is not sent in that case. */
  savedAccount?: boolean;
  bankAccount?: PayoutAccountInput | null;
  saveAccount?: boolean;
}): { ok: true; body: VietqrWithdrawBody } | { ok: false; blocker: BuyerTopupBlocker | PayoutAccountCode } {
  const decision = buyerTopupWithdrawDecision({ snapshot: input.snapshot, amountVnd: input.amountVnd });
  if (!decision.ok) return decision;
  const body: VietqrWithdrawBody = {
    source: VIETQR_WITHDRAW_SOURCE,
    amountVnd: decision.amountVnd,
    settlement: 'VND',
  };
  if (input.savedAccount === true) return { ok: true, body };
  const parsed = parsePayoutAccountInput(input.bankAccount);
  if (!parsed.ok) return { ok: false, blocker: parsed.code };
  body.bankAccount = {
    bankName: parsed.bankName,
    accountNumber: parsed.accountNumber,
    accountName: parsed.accountName,
  };
  if (input.saveAccount === true) body.saveAccount = true;
  return { ok: true, body };
}

/** Foreign-exchange reference from the server. Not a withdrawal amount. */
export function fxReferenceUsd(snapshot?: BuyerDepositWithdrawSnapshot | null): number | null {
  const value = snapshot?.payableUsd;
  if (typeof value !== 'number' || !Number.isFinite(value)) return null;
  return value;
}
