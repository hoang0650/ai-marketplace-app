/**
 * Ordinary buyers do not complete eKYC to check out, top up, use a product,
 * file a complaint, or request a refund. Seller, talent, freelancer, employer
 * and affiliate payouts still require eKYC. Stored identity documents are kept.
 *
 * Buyer prepaid credit is not cash and cannot be withdrawn by selecting another
 * persona. The server's persona, canWithdraw and unavailableCode decide.
 * A rejection is not retried under a different persona.
 */

export const BUYER_ACTIONS = ['checkout', 'topup', 'use', 'complaint', 'refund'] as const;
export type BuyerAction = (typeof BUYER_ACTIONS)[number];

export const BUYER_CREDIT_CODE = 'BUYER_CREDIT_NON_WITHDRAWABLE';

const PAYOUT_MENU_ROLES = new Set(['seller', 'talent', 'freelancer', 'employer', 'admin']);
const WALLET_PAYOUT_PERSONAS = new Set(['seller', 'talent', 'freelancer', 'employer', 'admin']);

export function normalizeRole(role: string | null | undefined): string {
  const value = String(role || '').trim().toLowerCase();
  return value === 'creator' ? 'seller' : value;
}

/** Buying, topping up, using a product, complaining and requesting a refund do not require eKYC. */
export function buyerActionNeedsEkyc(_action: BuyerAction): false {
  return false;
}

/** Account-menu eKYC entry. A pure buyer does not see it. Affiliate eKYC stays on the affiliate screen. */
export function showEkycMenu(role: string | null | undefined): boolean {
  return PAYOUT_MENU_ROLES.has(normalizeRole(role));
}

/** Seller-like and affiliate payouts still require eKYC. Admins are exempt. Buyers are not asked. */
export function payoutPersonaNeedsEkyc(persona: string | null | undefined, role?: string | null): boolean {
  const who = String(persona || '').trim().toLowerCase();
  if (who === 'admin' || normalizeRole(role) === 'admin') return false;
  return who === 'seller' || who === 'talent' || who === 'freelancer' || who === 'employer' || who === 'affiliate';
}

export function affiliateNeedsEkyc(): true {
  return true;
}

/** Never clear or reset an identity file from the client. */
export function storedIdentityAction(): 'keep' {
  return 'keep';
}

export type PayoutWithdrawDecision =
  | { ok: true; persona: string }
  | { ok: false; code: 'buyer_credit' | 'server_blocked' | 'affiliate_separate' };

/**
 * General wallet withdrawal. Buyer credit stays non-withdrawable even if the
 * client asks for seller, employer or affiliate. Affiliate commission uses its
 * own screen and is not submitted here.
 */
export function resolvePayoutWithdraw(input: {
  requestedPersona?: string | null;
  serverPersona?: string | null;
  serverPersonas?: readonly string[] | null;
  canWithdraw?: boolean;
  unavailableCode?: string | null;
}): PayoutWithdrawDecision {
  const requested = String(input.requestedPersona || '').trim().toLowerCase();
  const server = String(input.serverPersona || '').trim().toLowerCase();
  const code = String(input.unavailableCode || '');
  if (code === BUYER_CREDIT_CODE || requested === 'buyer' || server === 'buyer') {
    return { ok: false, code: 'buyer_credit' };
  }
  if (requested === 'affiliate' || server === 'affiliate') {
    return { ok: false, code: 'affiliate_separate' };
  }
  if (input.canWithdraw !== true) return { ok: false, code: 'server_blocked' };
  const persona = requested || server;
  if (!WALLET_PAYOUT_PERSONAS.has(persona)) return { ok: false, code: 'server_blocked' };
  const allowed = input.serverPersonas;
  if (allowed && allowed.length > 0 && persona !== 'admin' && !allowed.includes(persona)) {
    return { ok: false, code: 'server_blocked' };
  }
  return { ok: true, persona };
}

/**
 * A refund or complaint request stays with the signed-in buyer of that order.
 * Missing buyer id is left to the server. eKYC is not required.
 */
export function canRequestOwnRefund(input: {
  authenticated: boolean;
  userId?: string | null;
  orderBuyerId?: string | null;
}): boolean {
  if (!input.authenticated || !input.userId) return false;
  if (input.orderBuyerId && String(input.orderBuyerId) !== String(input.userId)) return false;
  return true;
}
