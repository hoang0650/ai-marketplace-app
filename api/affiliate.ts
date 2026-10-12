import AsyncStorage from '@react-native-async-storage/async-storage';
import { apiClient } from './client';

export type AffiliateConfig = {
  attributionDays: number;
  maxRate: number;
  attribution: 'last_click';
  holdHours: number;
  pit: { enabled: boolean; rate: number; thresholdVnd: number; legalReview: boolean };
};

export type AffiliateCommissionRow = {
  id: string;
  orderId: string;
  productId: string;
  productName: string;
  currency: string;
  baseAmount: number;
  rate: number;
  amount: number;
  pitAmount: number;
  netAmount: number;
  reversedAmount: number;
  state: 'pending' | 'available' | 'reversed';
  holdUntil: string;
  createdAt: string;
};

export type AffiliateStats = {
  code: string;
  kycStatus: string;
  payoutReady: boolean;
  clicks: number;
  orders: number;
  conversions: number;
  earnings: number;
  currency: string;
  commission: { pending: number; available: number; reversed: number; pitWithheld: number; total: number };
  recent: AffiliateCommissionRow[];
  config: AffiliateConfig;
};

export type AffiliateLink = { code: string; scope: 'product' | 'store'; rate: number; inProgram: boolean; path: string; url: string };

export type SellerAffiliateStats = {
  defaultRate: number;
  maxRate: number;
  clicks: number;
  orders: number;
  sales: number;
  commission: number;
  currency: string;
  products: {
    id: string;
    name: string;
    slug: string;
    affiliateRate: number | null;
    effectiveRate: number;
    orders: number;
    sales: number;
    commission: number;
  }[];
};

const CLICK_KEY = 'aimarkets_affiliate_click';

function qs(params: Record<string, string | undefined>) {
  const parts = Object.entries(params)
    .filter(([, v]) => v)
    .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(String(v))}`);
  return parts.length ? `?${parts.join('&')}` : '';
}

/** Last-click store: the newest referral click wins and expires with the attribution window. */
export const affiliateClickStore = {
  async save(clickId: string, expiresAt: string) {
    await AsyncStorage.setItem(CLICK_KEY, JSON.stringify({ clickId, expiresAt }));
  },
  async current(): Promise<string | undefined> {
    try {
      const raw = await AsyncStorage.getItem(CLICK_KEY);
      if (!raw) return undefined;
      const v = JSON.parse(raw) as { clickId?: string; expiresAt?: string };
      if (!v.clickId || (v.expiresAt && new Date(v.expiresAt).getTime() < Date.now())) {
        await AsyncStorage.removeItem(CLICK_KEY);
        return undefined;
      }
      return v.clickId;
    } catch {
      return undefined;
    }
  },
};

export const affiliateApi = {
  dashboard: () => apiClient.get<AffiliateStats>('/affiliate'),
  config: () => apiClient.get<AffiliateConfig>('/affiliate/config'),
  link: (target: { productId?: string; productSlug?: string; storeSlug?: string }) =>
    apiClient.get<AffiliateLink>(`/affiliate/link${qs(target)}`),
  /** Record a `?ref=` visit; keeps the click id for checkout. Never throws. */
  track: async (body: { code: string; productSlug?: string; storeSlug?: string }) => {
    try {
      const r = await apiClient.post<{ ok: boolean; clickId?: string; expiresAt?: string }>('/affiliate/click', {
        ...body,
        landing: body.productSlug ? `/product/${body.productSlug}` : body.storeSlug ? `/store/${body.storeSlug}` : '',
      });
      if (r?.ok && r.clickId && r.expiresAt) await affiliateClickStore.save(r.clickId, r.expiresAt);
      return r;
    } catch {
      return null;
    }
  },
  seller: () => apiClient.get<SellerAffiliateStats>('/affiliate/seller'),
  setDefaultRate: (rate: number) => apiClient.put<{ defaultRate: number }>('/affiliate/seller/default-rate', { rate }),
};

/** Seller input in percent (0–25) → API fraction; null = "use store default"; undefined = invalid. */
export function percentToRate(raw: string, { allowEmpty = false } = {}): number | null | undefined {
  const s = String(raw ?? '').trim().replace(',', '.');
  if (!s) return allowEmpty ? null : undefined;
  const n = Number(s);
  if (!Number.isFinite(n) || n < 0 || n > 25) return undefined;
  return Math.round(n * 100) / 10000;
}

export function ratePct(rate: number | null | undefined) {
  return `${Math.round((Number(rate) || 0) * 1000) / 10}%`;
}
