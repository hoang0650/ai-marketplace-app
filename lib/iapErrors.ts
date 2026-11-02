const CONNECT_CODES = new Set([
  'init-connection',
  'billing-unavailable',
  'iap-not-available',
  'network-error',
  'service-disconnected',
  'service-timeout',
  'service-error',
  'connection-closed',
  'activity-unavailable',
]);

const PRODUCT_CODES = new Set(['sku-not-found', 'item-unavailable', 'query-product', 'empty-sku-list']);

export type IapFailureKind = 'cancel' | 'connect' | 'products' | 'other';

export function iapErrorCode(error: unknown): string {
  if (typeof error === 'object' && error && 'code' in error) {
    return String((error as { code?: unknown }).code || '');
  }
  return '';
}

/** Separate a StoreKit/Play connection failure from an empty or unapproved catalog. */
export function iapFailureKind(error: unknown): IapFailureKind {
  const code = iapErrorCode(error);
  if (code === 'user-cancelled') return 'cancel';
  if (CONNECT_CODES.has(code)) return 'connect';
  if (PRODUCT_CODES.has(code)) return 'products';
  return 'other';
}

export function looksLikeJws(value: string): boolean {
  const parts = String(value || '').split('.');
  return parts.length === 3 && parts.every((part) => part.length > 0);
}
