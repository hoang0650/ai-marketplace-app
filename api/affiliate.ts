import AsyncStorage from '@react-native-async-storage/async-storage';
import { apiClient } from './client';

export type AffiliateConfig = {
  attributionDays: number;
  maxRate: number;
  attribution: 'last_click';
  holdHours: number;
  /**
   * PIT is configured by the server (rate, Mẫu 08/CK-TNCN exemption).
   * `thresholdVnd` and `minWithdrawVnd` are the former commercial payout floor.
   * The app does not enforce them and does not substitute a PIT rate when the server omits one.
   */
  pit: {
    enabled: boolean;
    rate: number;
    /** Legacy alias of the old affiliate commercial minimum. Not a client-side floor. */
    thresholdVnd: number;
    /** Legacy server field. Not a client-side floor. */
    minWithdrawVnd?: number;
    legalReview: boolean;
    rule?: string;
    commitmentForm?: string;
    commitmentExempts?: boolean;
    yearEndCertificate?: boolean;
  };
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
  /** null until the user is eKYC-verified. */
  code: string | null;
  kycStatus: string;
  kycRequired?: boolean;
  linkReady?: boolean;
  payoutReady: boolean;
  clicks: number;
  orders: number;
  conversions: number;
  earnings: number;
  currency: string;
  commission: { pending: number; available: number; reversed: number; pitWithheld: number; total: number };
  recent: AffiliateCommissionRow[];
  config: AffiliateConfig;
  pitCommitment?: PitCommitment;
  /**
   * Affiliate wallet slice. `available` is USD and already excludes the hold.
   * `minWithdrawVnd` is the legacy commercial floor and is not applied here.
   * Updated servers set `canWithdraw` from identity plus a positive eligible balance.
   * Older servers may still set it from the 2,000,000 VND floor; the form does not hide behind that.
   */
  withdrawal?: {
    earned?: number;
    held?: number;
    withdrawn?: number;
    balance?: number;
    /** Withdrawable commission in wallet currency (USD). */
    available: number;
    availableVnd: number;
    /** Legacy commercial minimum. Ignored by the app. */
    minWithdrawVnd?: number;
    canWithdraw?: boolean;
    /** Server PIT rate for this affiliate. 0 when exempt or when the server withholds nothing. */
    pitRate?: number;
    pitCommitmentApplied?: boolean;
    persona?: string;
  };
};

/** Cam kết Mẫu 08/CK-TNCN - uploaded on the website, approved by an admin. */
export type PitCommitment = {
  status: 'none' | 'draft' | 'pending' | 'approved' | 'rejected';
  year: number | null;
  hasDocument: boolean;
  personalTaxCode: string;
  rejectReason: string;
  activeForCurrentYear: boolean;
  currentYear: number;
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
  /**
   * Affiliate withdrawal in wallet currency (USD, 2 decimals). No commercial minimum.
   * POST /wallet/withdraw with persona affiliate. The API applies the 48h hold,
   * the available-balance check, and whatever tax it has configured.
   */
  withdraw: (amountUsd: number) =>
    apiClient.post<{ quote?: { gross: number; tax: number; net: number }; payoutId?: string }>('/wallet/withdraw', {
      amount: amountUsd,
      persona: 'affiliate',
    }),
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
