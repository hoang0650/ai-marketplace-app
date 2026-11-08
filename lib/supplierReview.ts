/** Public tax lookup. The app only opens this page. It does not query or scrape it. */
export const PUBLIC_TAX_LOOKUP_URL = 'https://tracuunnt.gdt.gov.vn/tcnnt/mstdn.jsp';

export type ManualReviewStatus = 'none' | 'pending' | 'approved' | 'rejected';
export type ElectronicIdentityStatus = 'none' | 'draft' | 'pending' | 'verified' | 'rejected';

export interface SupplierReviewInput {
  verificationStatus?: string | null;
  /**
   * True only when the seller payload contains `manualTaxReview`.
   * A missing field is unknown. It is not "approved" and it is not "not submitted".
   */
  manualTaxReviewFieldPresent?: boolean;
  manualStatus?: string | null;
  statusReason?: string | null;
  sellerAgreementAcceptedAt?: string | null;
  canPublish?: boolean | null;
  /**
   * user.kyc.status only, and only after that read succeeded.
   * Never the seller profile identity flag.
   */
  electronicIdentityKnown?: boolean;
  electronicIdentityStatus?: string | null;
}

export interface SupplierReviewView {
  manualStatus: ManualReviewStatus | 'unknown';
  manualStatusKnown: boolean;
  reason: string;
  electronicIdentityStatus: ElectronicIdentityStatus | 'unknown';
  electronicIdentityKnown: boolean;
  manualReviewCompletesEkyc: false;
  contractAccepted: boolean;
  serverCanPublish: boolean;
  electronicIdentityVerified: boolean;
}

function manualStatusOf(input: SupplierReviewInput): ManualReviewStatus {
  const explicit = String(input.manualStatus || '').toLowerCase();
  if (explicit === 'pending' || explicit === 'approved' || explicit === 'rejected') return explicit;
  const verification = String(input.verificationStatus || '').toUpperCase();
  if (verification === 'VERIFICATION_REQUIRED') return 'pending';
  return 'none';
}

function identityOf(raw: string | null | undefined): ElectronicIdentityStatus {
  const value = String(raw || 'none').toLowerCase();
  if (value === 'verified' || value === 'pending' || value === 'rejected' || value === 'draft') return value;
  return 'none';
}

export function supplierReviewView(input: SupplierReviewInput): SupplierReviewView {
  const manualStatusKnown = input.manualTaxReviewFieldPresent === true;
  const electronicIdentityKnown = input.electronicIdentityKnown === true;
  const electronicIdentityStatus = electronicIdentityKnown ? identityOf(input.electronicIdentityStatus) : 'unknown';
  return {
    manualStatus: manualStatusKnown ? manualStatusOf(input) : 'unknown',
    manualStatusKnown,
    reason: manualStatusKnown ? String(input.statusReason || '') : '',
    electronicIdentityStatus,
    electronicIdentityKnown,
    manualReviewCompletesEkyc: false,
    contractAccepted: Boolean(input.sellerAgreementAcceptedAt),
    serverCanPublish: input.canPublish === true,
    electronicIdentityVerified: electronicIdentityStatus === 'verified',
  };
}

export function isSupplierTaxCode(raw: string, sellerType: string): boolean {
  const value = String(raw || '').replace(/\s+/g, '');
  if (/^\d{10}(-\d{3})?$/.test(value)) return true;
  const type = String(sellerType || '').toLowerCase();
  return (type === 'individual' || type === 'household_business') && /^\d{12}$/.test(value);
}

export function supplierReviewDecision(input: {
  action: 'approve' | 'reject';
  reason: string;
  actorRole?: string | null;
  lookupAttested?: boolean;
}):
  | { ok: true; status: 'approved' | 'rejected'; reason: string; lookupAttested: boolean }
  | { ok: false; code: 'RBAC' | 'REASON_REQUIRED' | 'LOOKUP_ATTESTATION_REQUIRED' } {
  if (input.actorRole !== 'admin') return { ok: false, code: 'RBAC' };
  const reason = String(input.reason || '').trim();
  if (reason.length < 5 || reason.length > 1000) return { ok: false, code: 'REASON_REQUIRED' };
  if (input.action === 'approve' && input.lookupAttested !== true) {
    return { ok: false, code: 'LOOKUP_ATTESTATION_REQUIRED' };
  }
  return {
    ok: true,
    status: input.action === 'approve' ? 'approved' : 'rejected',
    reason,
    lookupAttested: input.action === 'approve',
  };
}
