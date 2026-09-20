import { apiClient } from './client';
import type {
  CategoryMeta,
  CheckoutResult,
  Complaint,
  Creator,
  HomeFeed,
  IssuedLicense,
  LegalDocument,
  NotificationItem,
  Order,
  Product,
  Review,
  SellerEarnings,
  SellerPayout,
  SellerProfile,
  BuyerUsageFeed,
  WalletSummary,
  WalletTx,
  WorkJob,
  WorkTalent,
  ContentEpisode,
  ContentUnlock,
  PaypalConfig,
  PaypalCreateOrderResult,
  PaypalFunding,
  PlaygroundRunResult,
  GameSessionInfo,
  Coupon,
  CouponPreview,
  ChatConversation,
  ChatMessage,
  OpenClawLaunchResult,
} from './types';
import type { RunpodModelSchema } from '@/lib/runpod-schema';

function qs(params: Record<string, string | number | boolean | undefined>) {
  const q = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) {
    if (v === undefined || v === '') continue;
    q.set(k, String(v));
  }
  const s = q.toString();
  return s ? `?${s}` : '';
}

export const productsApi = {
  list: (params?: {
    q?: string;
    category?: string;
    creatorSlug?: string;
    featured?: boolean;
    limit?: number;
    offset?: number;
    sort?: string;
  }) => apiClient.get<Product[]>(`/products${qs(params || {})}`),
  home: () => apiClient.get<HomeFeed>('/home'),
  listMany: async (categories: string[], limit = 40) => {
    const lists = await Promise.all(categories.map((category) => apiClient.get<Product[]>(`/products${qs({ category, limit })}`)));
    const seen = new Set<string>();
    return lists.flat().filter((p) => {
      if (!p?.id || seen.has(p.id)) return false;
      seen.add(p.id);
      return true;
    });
  },
  one: (slug: string) => apiClient.get<Product>(`/products/${slug}`),
  create: (body: Record<string, unknown>) => apiClient.post<Product>('/products', body),
  update: (id: string, body: Record<string, unknown>) => apiClient.put<Product>(`/products/${id}`, body),
  remove: (id: string) => apiClient.request(`/products/${id}`, { method: 'DELETE' }),
};

export const categoriesApi = {
  list: () => apiClient.get<CategoryMeta[]>('/categories'),
};

export const creatorsApi = {
  list: () => apiClient.get<Creator[]>('/creators'),
  one: (slug: string) => apiClient.get<Creator>(`/creators/${slug}`),
};

export const ordersApi = {
  list: () => apiClient.get<Order[]>('/orders'),
  disputes: () => apiClient.get<Order[]>('/orders/disputes'),
  openDispute: (id: string, reason: string) => apiClient.post<Order>(`/orders/${id}/dispute`, { reason }),
};

export const billingApi = {
  checkout: (
    productId: string,
    quantity = 1,
    licenseTerm?: string,
    salesChannel?: 'WEB' | 'APP_STORE' | 'GOOGLE_PLAY',
    couponCode?: string,
  ) =>
    apiClient.post<CheckoutResult>('/billing/checkout', {
      productId,
      quantity,
      provider: 'wallet',
      licenseTerm,
      salesChannel,
      couponCode,
    }),
};

export const couponsApi = {
  list: () => apiClient.get<Coupon[]>('/coupons'),
  create: (body: Partial<Coupon> & { code: string; type: 'percent' | 'amount'; value: number }) =>
    apiClient.post<Coupon>('/coupons', body),
  update: (id: string, body: Partial<Coupon>) => apiClient.patch<Coupon>(`/coupons/${id}`, body),
  deactivate: (id: string) => apiClient.delete<Coupon>(`/coupons/${id}`),
  preview: (input: { productId: string; code: string; quantity?: number; licenseTerm?: string }) =>
    apiClient.post<CouponPreview>('/coupons/preview', input),
};

export const walletApi = {
  list: () => apiClient.get<WalletTx[]>('/wallet'),
  summary: () => apiClient.get<WalletSummary>('/wallet/summary'),
  withdraw: (amount: number) => apiClient.post<WalletTx>('/wallet/withdraw', { amount }),
  iapPacks: () => apiClient.get<{ packs: Array<{ sku: string; usd: number; currency: string }> }>('/iap/packs'),
  iapVerify: (body: {
    platform: 'ios' | 'android';
    productId: string;
    transactionId: string;
    purchaseToken?: string;
    signedTransaction?: string;
    packageName?: string;
  }) => apiClient.post<{ success: boolean; duplicate?: boolean; wallet?: WalletTx }>('/iap/verify', body),
  paypalConfig: () => apiClient.get<PaypalConfig>('/paypal/config'),
  paypalCreateOrder: (amount: number, currency: string, fundingSource?: PaypalFunding) =>
    apiClient.post<PaypalCreateOrderResult>('/paypal/create-order', { amount, currency, fundingSource }),
  paypalCaptureOrder: (orderId: string) =>
    apiClient.post<{ success: boolean; status: string; wallet?: WalletTx }>('/paypal/capture-order', { orderId }),
};

export const reviewsApi = {
  list: (productId: string) => apiClient.get<Review[]>(`/reviews${qs({ productId })}`),
  byShop: (creatorSlug: string) => apiClient.get<Review[]>(`/reviews${qs({ creatorSlug })}`),
  create: (data: { productId: string; rating: number; title?: string; body?: string }) =>
    apiClient.post<Review>('/reviews', data),
};

export const wishlistApi = {
  list: () => apiClient.get<Product[]>('/wishlist'),
  toggle: (productId: string) => apiClient.post<{ wishlist: Product[]; added: boolean }>('/wishlist/toggle', { productId }),
};

export const notificationsApi = {
  list: () => apiClient.get<NotificationItem[]>('/notifications'),
  readAll: () => apiClient.post<NotificationItem[]>('/notifications/read-all'),
};

export const complaintsApi = {
  list: (as?: 'mine' | 'seller') => apiClient.get<Complaint[]>(`/complaints${qs({ as })}`),
  one: (id: string) => apiClient.get<Complaint>(`/complaints/${id}`),
  create: (data: { kind: string; body: string; orderId?: string; evidenceUrls?: string[]; requestedAction?: string }) =>
    apiClient.post<Complaint>('/complaints', data),
  sellerRespond: (id: string, body: string) => apiClient.post<Complaint>(`/complaints/${id}/seller-response`, { body }),
  appeal: (id: string, reason: string) => apiClient.post<Complaint>(`/complaints/${id}/appeal`, { reason }),
};

export const legalApi = {
  list: (locale = 'vi') => apiClient.get<LegalDocument[]>(`/legal${qs({ locale })}`),
  one: (documentType: string, locale = 'vi') => apiClient.get<LegalDocument>(`/legal/${documentType}${qs({ locale })}`),
  accept: (documentType: string) => apiClient.post(`/legal/${documentType}/accept`),
};

export const sellersApi = {
  me: () => apiClient.get<SellerProfile | null>('/sellers/me'),
  earnings: () => apiClient.get<SellerEarnings>('/sellers/me/earnings'),
  payouts: () => apiClient.get<SellerPayout[]>('/sellers/me/payouts'),
  taxProfile: () => apiClient.get<Record<string, unknown>>('/sellers/me/tax-profile'),
};

export const dashboardApi = {
  summary: () => apiClient.get<Record<string, number | string>>('/dashboard/summary'),
};

export const usageApi = {
  list: () => apiClient.get<unknown[]>('/usage'),
  me: (limit = 100) => apiClient.get<BuyerUsageFeed>(`/usage/me?limit=${limit}`),
};

export const licensesApi = {
  me: () => apiClient.get<IssuedLicense[]>('/licenses/me'),
};

export const playgroundApi = {
  run: (body: {
    productSlug: string;
    productId?: string;
    input: Record<string, unknown>;
    model?: string;
    endpointId?: string;
    action?: string;
  }) => apiClient.post<PlaygroundRunResult>('/playground/run', body, 180000),
  schema: (slug: string) =>
    apiClient.get<RunpodModelSchema>(`/runpod/public-endpoints/${encodeURIComponent(slug)}/schema`),
};

export const gameSessionsApi = {
  start: (productSlug: string) =>
    apiClient.post<GameSessionInfo>('/game-sessions', { productSlug }, 120000),
  one: (sessionId: string) => apiClient.get<GameSessionInfo>(`/game-sessions/${sessionId}`),
  stop: (sessionId: string) => apiClient.delete<{ ok: boolean; billedCost?: number }>(`/game-sessions/${sessionId}`),
};

export const contentApi = {
  episodes: (slug: string) => apiClient.get<ContentEpisode[]>(`/content/products/${slug}/episodes`),
  unlock: (episodeId: string, licenseKey?: string) =>
    apiClient.post<ContentUnlock>('/content/unlock', { episodeId, licenseKey }),
};

export const chatApi = {
  conversations: () => apiClient.get<ChatConversation[]>('/chat/conversations'),
  conversation: (id: string) => apiClient.get<ChatConversation>(`/chat/conversations/${id}`),
  start: (body: { productId: string; body?: string; imageUrl?: string }) =>
    apiClient.post<ChatConversation>('/chat/conversations', body),
  messages: (id: string) => apiClient.get<ChatMessage[]>(`/chat/conversations/${id}/messages`),
  send: (id: string, body: { body?: string; imageUrl?: string }) =>
    apiClient.post<ChatMessage>(`/chat/conversations/${id}/messages`, body),
  uploadImage: (form: FormData) =>
    apiClient.uploadForm<{ ok: boolean; url: string }>('/uploads/image', form),
};

export const openclawApi = {
  launch: () =>
    apiClient.post<OpenClawLaunchResult>('/openclaw/launch', { audience: 'aimarkets' }),
  approvePairing: (requestId?: string | null) =>
    apiClient.post<{ success: boolean; message?: string }>('/openclaw/device-pairings/approve', {
      request_id: requestId || null,
      requestId: requestId || null,
      role: 'operator',
      scopes: ['operator.read', 'operator.write', 'operator.admin', 'operator.pairing'],
    }),
};

export const hermesApi = {
  launch: () =>
    apiClient.post<OpenClawLaunchResult>('/hermes/launch', { audience: 'aimarkets' }),
  approvePairing: (requestId?: string | null) =>
    apiClient.post<{ success: boolean; message?: string; skipped?: boolean }>(
      '/hermes/device-pairings/approve',
      {
        request_id: requestId || null,
        requestId: requestId || null,
      },
    ),
};

export const workApi = {
  jobs: (q?: string) => apiClient.get<WorkJob[]>(`/work/jobs${qs({ q })}`),
  job: (slug: string) => apiClient.get<WorkJob>(`/work/jobs/${slug}`),
  talents: (q?: string) => apiClient.get<WorkTalent[]>(`/work/talents${qs({ q })}`),
  talent: (slug: string) => apiClient.get<WorkTalent>(`/work/talents/${slug}`),
  postJob: (data: {
    title: string;
    company: string;
    description: string;
    location?: string;
    remote?: boolean;
  }) => apiClient.post<WorkJob>('/work/jobs', data),
};

/** Typed gaps — backend has no consumer endpoint yet. */
export const missingApi = {
  forgotPassword: async (_email: string): Promise<never> => {
    throw new Error('FORGOT_PASSWORD_NOT_AVAILABLE');
  },
  registerDevice: async (_token: string): Promise<{ ok: false; reason: string }> => {
    return { ok: false, reason: 'POST /devices is not implemented on ai-marketplace-api' };
  },
};
