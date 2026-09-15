import type { IssuedLicense, Order, Product } from '@/api/types';
import {
  isContentCategory,
  isDatasetCategory,
  isFilmCategory,
  isGpuCategory,
  isComputeStreamCategory,
  isLicenseCategory,
  isPlaygroundCategory,
  isSkillCategory,
  isStoryCategory,
  isUsagePricing,
} from '@/constants/categories';

export function licenseCoversProduct(l: IssuedLicense, productId: string) {
  if (String(l.productId || '') !== String(productId)) return false;
  if (l.status === 'revoked' || l.status === 'expired' || l.valid === false) return false;
  if (l.expiresAt && new Date(l.expiresAt).getTime() <= Date.now()) return false;
  return true;
}

export function isPaidOrder(o: Order) {
  const status = String(o.status || '').toLowerCase();
  const pay = String(o.paymentStatus || '').toLowerCase();
  if (status === 'refunded' || pay === 'refunded' || o.fulfillmentStatus === 'cancelled') return false;
  return status === 'paid' || pay === 'paid' || pay === 'completed' || !!o.completedAt;
}

export function findActiveLicense(licenses: IssuedLicense[] | undefined, productId: string) {
  return (licenses || []).find((l) => licenseCoversProduct(l, productId));
}

export function findExpiredLicense(licenses: IssuedLicense[] | undefined, productId: string) {
  return (licenses || []).find((l) => String(l.productId || '') === String(productId) && !licenseCoversProduct(l, productId));
}

export function findPaidOrder(orders: Order[] | undefined, productId: string) {
  return (orders || []).find((o) => String(o.productId || '') === String(productId) && isPaidOrder(o));
}

export function productCtaKey(p: Product, opts: { hasAccess: boolean; expiredLicense: boolean }) {
  if (isPlaygroundCategory(p.category)) return 'playground.run';
  if (isComputeStreamCategory(p.category)) return 'compute.cta.play';
  if (opts.hasAccess) {
    if (isFilmCategory(p.category)) return 'product.cta.watchNow';
    if (isStoryCategory(p.category)) return 'product.cta.readNow';
    if (isSkillCategory(p.category)) return 'product.cta.downloadSkill';
    if (isDatasetCategory(p.category)) return 'product.cta.downloadDataset';
    return 'product.cta.openOrder';
  }
  if (opts.expiredLicense) return 'product.cta.renew';
  if (isFilmCategory(p.category)) return 'product.watch';
  if (isStoryCategory(p.category)) return 'product.read';
  if (isLicenseCategory(p.category)) return 'product.buyLicense';
  if (isGpuCategory(p.category)) return 'common.rentGpu';
  if (isUsagePricing(p.pricing?.model)) return 'product.cta.payPerUse';
  return 'common.buyNow';
}

export function productPriceCaptionKey(p: Product, hasAccess: boolean) {
  if (isPlaygroundCategory(p.category)) return 'playground.billed';
  if (hasAccess) return 'product.owned';
  if (isLicenseCategory(p.category)) return 'product.buyLicense';
  if (isContentCategory(p.category)) return 'product.buy';
  if (isUsagePricing(p.pricing?.model)) return 'product.cta.payPerUse';
  return 'product.buy';
}
