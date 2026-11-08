export type WalletHistoryKind = 'iap' | 'gpay_historical' | 'debit' | 'deposit';

/**
 * Historical GPay rows keep the GPay label.
 * Turning the removed channel off must not rename them as a generic bank transfer.
 */
export function walletHistoryKind(item: {
  paymentMethod?: string | null;
  type?: string | null;
  note?: string | null;
}): WalletHistoryKind {
  const method = String(item.paymentMethod || '').toLowerCase();
  if (method === 'gpay') return 'gpay_historical';
  const note = String(item.note || '').toLowerCase();
  if (
    method === 'iap' ||
    method === 'apple_pay' ||
    method === 'google_pay' ||
    note.includes('app store') ||
    note.includes('google play') ||
    note.includes(' iap')
  ) {
    return 'iap';
  }
  if (item.type === 'debit' || item.type === 'withdraw') return 'debit';
  return 'deposit';
}
