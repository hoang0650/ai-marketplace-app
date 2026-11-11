/**
 * AI Markets is working directly with GPay to complete the service contract
 * for this project. That contract is not executed. A status string, an
 * enabled flag, or a payload field cannot open checkout, collect gateway
 * credentials, or submit a buyer withdrawal.
 */
export const AI_MARKETS_GPAY_CONTRACT_EXECUTED = false;

export interface GpayStatusInput {
  status?: string | null;
  code?: string | null;
  removed?: boolean | null;
  enabled?: boolean | null;
  featureEnabled?: boolean | null;
  contractExecuted?: boolean | null;
  pendingContract?: boolean | null;
}

/** Checkout and credential collection stay closed. Status is not activation. */
export function gpayMayActivate(_input?: GpayStatusInput | null): boolean {
  return false;
}

/** Buyer top-up withdrawal stays closed until this project contract is executed. */
export function buyerWithdrawMaySubmit(): boolean {
  return AI_MARKETS_GPAY_CONTRACT_EXECUTED;
}
