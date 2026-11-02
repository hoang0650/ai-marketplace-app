/** Words accepted by POST /v1/account/deletion (`isConfirmWord`). */
export const DELETION_CONFIRM_WORDS = ['XOA', 'XÓA', 'XOÁ', 'DELETE', '删除'] as const;

/**
 * iOS Vietnamese keyboards often emit NFD (O + combining accent). The API compares
 * the uppercased string exactly, so normalize to NFC before the check and the request.
 */
export function normalizeDeletionConfirm(value: string): string {
  return String(value || '').normalize('NFC').trim().toUpperCase();
}

export function isDeletionConfirm(value: string): boolean {
  const word = normalizeDeletionConfirm(value);
  return DELETION_CONFIRM_WORDS.some((accepted) => accepted.normalize('NFC').toUpperCase() === word);
}
