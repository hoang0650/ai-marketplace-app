/**
 * Affiliate is a capability of the signed-in account, not a separate account
 * and not a seller, buyer, admin or infrastructure provider.
 * Figures and windows come from the server payload. A missing field stays unknown.
 * A payout request record is not a bank transfer.
 * Manual supplier-tax review does not grant this capability and is not eKYC.
 */

export type CommissionViewState = 'pending' | 'available' | 'reversed' | 'unknown';

export interface AffiliateServerWindow {
  attributionDays: number | null;
  holdHours: number | null;
  /** Percent for display, derived only from a server fraction in [0, 1]. */
  maxRatePercent: number | null;
}

function finiteNumber(value: unknown): number | null {
  return typeof value === 'number' && Number.isFinite(value) ? value : null;
}

export function affiliateServerWindow(config?: {
  attributionDays?: unknown;
  holdHours?: unknown;
  maxRate?: unknown;
} | null): AffiliateServerWindow {
  const days = finiteNumber(config?.attributionDays);
  const hours = finiteNumber(config?.holdHours);
  const max = finiteNumber(config?.maxRate);
  return {
    attributionDays: days != null && days > 0 ? days : null,
    holdHours: hours != null && hours >= 0 ? hours : null,
    maxRatePercent: max != null && max >= 0 && max <= 1 ? Math.round(max * 1000) / 10 : null,
  };
}

export function commissionViewState(state: unknown): CommissionViewState {
  if (state === 'pending' || state === 'available' || state === 'reversed') return state;
  return 'unknown';
}

/** eKYC on the user record. A supplier tax review is a different status and never substitutes. */
export function affiliateIdentityReady(input: {
  kycStatus?: string | null;
  manualTaxReviewStatus?: string | null;
}): { electronicIdentityVerified: boolean; manualReviewGrantsAffiliate: false } {
  return {
    electronicIdentityVerified: input.kycStatus === 'verified',
    manualReviewGrantsAffiliate: false,
  };
}

export function payoutRequestIsTransfer(): false {
  return false;
}

/**
 * New codes are not minted: the server answers 403 ELECTRONIC_IDENTITY_NOT_IMPLEMENTED.
 * An existing code plus internal eKYC can still create a link. A missing code on an
 * older payload is not treated as a completed electronic identity.
 */
export function affiliateLinkGate(input: {
  kycStatus?: string | null;
  code?: string | null;
  linkReady?: boolean | null;
}): { canCreateLink: boolean; code: 'ok' | 'KYC_REQUIRED' | 'ELECTRONIC_IDENTITY_NOT_IMPLEMENTED' } {
  const kyc = String(input.kycStatus || 'none');
  if (kyc !== 'verified') return { canCreateLink: false, code: 'KYC_REQUIRED' };
  const hasCode = typeof input.code === 'string' && input.code.trim().length > 0;
  if (input.linkReady === true || hasCode) return { canCreateLink: true, code: 'ok' };
  return { canCreateLink: false, code: 'ELECTRONIC_IDENTITY_NOT_IMPLEMENTED' };
}

export function affiliateClawbackDecision(input: {
  actorRole?: string | null;
  orderId?: string | null;
  reason?: string | null;
}):
  | { ok: true; orderId: string; reason: string }
  | { ok: false; code: 'RBAC' | 'ORDER_REQUIRED' | 'REASON_REQUIRED' } {
  if (input.actorRole !== 'admin') return { ok: false, code: 'RBAC' };
  const orderId = String(input.orderId || '').trim();
  if (!/^[a-fA-F0-9]{24}$/.test(orderId)) return { ok: false, code: 'ORDER_REQUIRED' };
  const reason = String(input.reason || '').trim();
  if (reason.length < 5 || reason.length > 1000) return { ok: false, code: 'REASON_REQUIRED' };
  return { ok: true, orderId, reason };
}

/** Own withholding summary. Missing numbers are not treated as zero tax. */
export function ownPitSummary(input?: {
  year?: unknown;
  totalIncomeVnd?: unknown;
  totalPitWithheldVnd?: unknown;
  payments?: unknown;
} | null): {
  known: boolean;
  year: number | null;
  totalIncomeVnd: number | null;
  totalPitWithheldVnd: number | null;
  payments: number | null;
  certifiesExemption: false;
} {
  const year = finiteNumber(input?.year);
  const income = finiteNumber(input?.totalIncomeVnd);
  const pit = finiteNumber(input?.totalPitWithheldVnd);
  const payments = finiteNumber(input?.payments);
  const known = year != null || income != null || pit != null || payments != null;
  return {
    known,
    year: year != null ? Math.trunc(year) : null,
    totalIncomeVnd: income,
    totalPitWithheldVnd: pit,
    payments: payments != null ? Math.trunc(payments) : null,
    certifiesExemption: false,
  };
}
