import { Platform } from 'react-native';
import { apiClient } from './client';
import type {
  CategoryMeta,
  CheckoutResult,
  Complaint,
  Creator,
  HomeFeed,
  Banner,
  BannerSlot,
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
  WorkField,
  WorkJobBid,
  ContentEpisode,
  ContentUnlock,
  PaypalConfig,
  PaypalCreateOrderResult,
  PaypalFunding,
  PlaygroundRunResult,
  GameSessionInfo,
  GameHeartbeat,
  GpuOffersResponse,
  GpuRental,
  Coupon,
  CouponPreview,
  ChatConversation,
  ChatMessage,
  OpenClawLaunchResult,
  AgentSshAccess,
  AgentGatewayApi,
  AgentGatewayId,
  AgentPricing,
  AgentSubscriptionStatus,
  HiredAgent,
  AgentStatus,
  KycProfile,
  KycSide,
  KycSubmitBody,
  PayoutPolicy,
  PayoutPolicyResponse,
  PayoutQuote,
  BuilderGenerateResult,
  BuilderKind,
  BuilderProject,
  BuilderTemplateListing,
  BuilderTemplateMeta,
  TemplateBuild,
  TemplateGitPick,
  TemplateUploadResult,
  GitConnection,
  GitPushBody,
  GitPushResult,
  GitRepo,
  GitStatus,
  ByokKey,
  ByokProvider,
  HireMilestoneDraft,
  HireProject,
  HireTerminateReason,
  WorkListingFee,
  AdminDailyPoint,
  AdminGranularity,
  AdminOverview,
} from './types';
import type { RunpodModelSchema } from '@/lib/runpod-schema';
import { isHiddenCategory, withoutHiddenProducts } from '@/constants/categories';

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
  list: async ({
    includeHidden,
    ...params
  }: {
    q?: string;
    category?: string;
    creatorSlug?: string;
    featured?: boolean;
    limit?: number;
    offset?: number;
    sort?: string;
    /** Seller back-office: keep listings in paused categories so owners can still manage them. */
    includeHidden?: boolean;
  } = {}) => {
    const rows = await apiClient.get<Product[]>(`/products${qs(params)}`);
    return includeHidden ? rows : withoutHiddenProducts(rows);
  },
  home: async () => {
    const feed = await apiClient.get<HomeFeed>('/home');
    return {
      ...feed,
      newArrivals: withoutHiddenProducts(feed?.newArrivals),
      promoted: withoutHiddenProducts(feed?.promoted),
      bestsellers: withoutHiddenProducts(feed?.bestsellers),
    };
  },
  listMany: async (categories: string[], limit = 40) => {
    const visible = categories.filter((c) => !isHiddenCategory(c));
    const lists = await Promise.all(visible.map((category) => apiClient.get<Product[]>(`/products${qs({ category, limit })}`)));
    const seen = new Set<string>();
    return withoutHiddenProducts(lists.flat()).filter((p) => {
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

export const bannersApi = {
  list: (params?: { slot?: BannerSlot | string }) =>
    apiClient.get<Banner[]>(`/banners${qs({ slot: params?.slot })}`),
};

export const categoriesApi = {
  list: async () => {
    const rows = await apiClient.get<CategoryMeta[]>('/categories');
    return (rows || []).filter((c) => !isHiddenCategory(c?.id));
  },
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
  summary: (persona?: string) =>
    apiClient.get<WalletSummary>(`/wallet/summary${qs({ persona })}`),
  payoutPolicy: (persona?: string, amount?: number) =>
    apiClient.get<PayoutPolicyResponse>(`/wallet/payout-policy${qs({ persona, amount })}`),
  withdraw: (amount: number, persona?: string) =>
    apiClient.post<WalletTx>('/wallet/withdraw', { amount, persona }),
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

export const kycApi = {
  me: () => apiClient.get<KycProfile>('/kyc/me'),
  uploadDocument: (side: KycSide, form: FormData) =>
    apiClient.uploadForm<{ ok: boolean; side: string; previewUrl?: string; kyc: KycProfile }>(
      `/kyc/documents/${side}`,
      form,
    ),
  documentUrl: (side: KycSide) =>
    apiClient.get<{ side: string; url: string; expiresIn: number }>(`/kyc/documents/${side}`),
  submit: (body: KycSubmitBody) => apiClient.post<{ ok: boolean; kyc: KycProfile }>('/kyc/submit', body),
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
  list: (as?: 'mine' | 'seller' | 'work') => apiClient.get<Complaint[]>(`/complaints${qs({ as })}`),
  one: (id: string) => apiClient.get<Complaint>(`/complaints/${id}`),
  create: (data: {
    kind: string;
    body: string;
    orderId?: string;
    jobApplicationId?: string;
    evidenceUrls?: string[];
    requestedAction?: string;
  }) => apiClient.post<Complaint>('/complaints', data),
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
    apiClient.get<RunpodModelSchema>(`/endpoints/public-endpoints/${encodeURIComponent(slug)}/schema`),
};

/** The app is the mobile stream flow (touch, virtual gamepad, landscape); web is the PC flow. */
export const gameSessionsApi = {
  start: (productSlug: string) =>
    apiClient.post<GameSessionInfo>(
      '/game-sessions',
      { productSlug, client: Platform.OS === 'ios' ? 'ios' : Platform.OS === 'android' ? 'android' : 'mobile' },
      120000,
    ),
  one: (sessionId: string) => apiClient.get<GameSessionInfo>(`/game-sessions/${sessionId}`),
  heartbeat: (sessionId: string) => apiClient.post<GameHeartbeat>(`/game-sessions/${sessionId}/heartbeat`, {}),
  stop: (sessionId: string) => apiClient.delete<{ ok: boolean; billedCost?: number }>(`/game-sessions/${sessionId}`),
};

export const gpuRentalApi = {
  offers: () => apiClient.get<GpuOffersResponse>('/gpu/offers'),
  list: () => apiClient.get<{ rentals: GpuRental[] }>('/gpu/rentals'),
  one: (id: string) => apiClient.get<{ rental: GpuRental }>(`/gpu/rentals/${id}`),
  create: (body: { offerId: string; name?: string; volumeGb?: number }) =>
    apiClient.post<{ rental: GpuRental }>('/gpu/rentals', body, 120000),
  start: (id: string) => apiClient.post<{ rental: GpuRental }>(`/gpu/rentals/${id}/start`, {}),
  stop: (id: string) => apiClient.post<{ rental: GpuRental }>(`/gpu/rentals/${id}/stop`, {}),
  remove: (id: string) => apiClient.delete<{ rental: GpuRental }>(`/gpu/rentals/${id}`),
  open: (id: string, target: 'lab' | 'terminal') =>
    apiClient.post<{ path: string; expiresIn: number }>(`/gpu/rentals/${id}/open`, { target }),
};

/** Generation can take minutes; the app uses the JSON mode (no SSE). */
const BUILDER_GENERATE_TIMEOUT_MS = 9 * 60 * 1000;
const TEMPLATE_BUILD_TIMEOUT_MS = 2 * 60 * 1000;

export const builderApi = {
  providers: () => apiClient.get<{ providers: ByokProvider[]; keys: ByokKey[] }>('/builder/providers'),
  list: () => apiClient.get<{ projects: BuilderProject[] }>('/builder/projects'),
  create: (body: { name: string; kind: BuilderKind; provider?: string }) =>
    apiClient.post<{ project: BuilderProject }>('/builder/projects', body),
  one: (id: string) => apiClient.get<{ project: BuilderProject }>(`/builder/projects/${id}`),
  update: (id: string, body: { name?: string; provider?: string; model?: string }) =>
    apiClient.patch<{ project: BuilderProject }>(`/builder/projects/${id}`, body),
  remove: (id: string) => apiClient.delete<{ success: boolean }>(`/builder/projects/${id}`),
  generate: (id: string, body: { prompt: string; previewError?: string; provider?: string; model?: string }) =>
    apiClient.post<BuilderGenerateResult>(`/builder/projects/${id}/generate`, { ...body, stream: false }, BUILDER_GENERATE_TIMEOUT_MS),
  saveKey: (provider: string, body: { apiKey: string; baseUrl?: string; model?: string }) =>
    apiClient.put<{ key: ByokKey }>(`/openclaw/byok/keys/${provider}`, body),
  deleteKey: (provider: string) => apiClient.delete<{ success: boolean }>(`/openclaw/byok/keys/${provider}`),
  templates: (kind?: BuilderKind) =>
    apiClient.get<{ templates: BuilderTemplateListing[] }>(`/builder/templates${kind ? `?kind=${kind}` : ''}`),
  template: (productId: string) =>
    apiClient.get<{ template: BuilderTemplateMeta; isOwner: boolean }>(`/builder/templates/${productId}`),
  useTemplate: (productId: string, name?: string) =>
    apiClient.post<{ project: BuilderProject }>(`/builder/templates/${productId}/use`, name ? { name } : {}),
  /** Seller's own template listings (any moderation status). */
  myTemplates: () => apiClient.get<{ templates: BuilderTemplateListing[] }>('/builder/templates/mine'),
  /** GitHub → checks (Dokploy-style log). Only a `success` build can be published. */
  templateBuild: (body: { kind: BuilderKind; fromGit: TemplateGitPick } | { productId: string; fromGit?: TemplateGitPick }) =>
    apiClient.post<{ build: TemplateBuild }>('/builder/templates/builds', body, TEMPLATE_BUILD_TIMEOUT_MS),
  templateFromBuild: (productId: string, buildId: string) =>
    apiClient.put<TemplateUploadResult>(`/builder/templates/${productId}/files`, { fromBuild: buildId }),
  /** Rebuild from the linked repo; a failed build answers 422 TEMPLATE_BUILD_FAILED with `build` in the body. */
  templateSyncGit: (productId: string) =>
    apiClient.request<TemplateUploadResult>(`/builder/templates/${productId}/files`, {
      method: 'PUT',
      body: { fromGit: { sync: true } },
      timeoutMs: TEMPLATE_BUILD_TIMEOUT_MS,
    }),
  gitStatus: () => apiClient.get<GitStatus>('/builder/git'),
  /** GitHub sends the auth session back to `returnTo?git_connect=…` (or `git_error=…`). */
  gitOAuthStart: (returnTo: string) => apiClient.post<{ url: string }>('/builder/git/github/oauth/start', { returnTo }),
  gitOAuthComplete: (connectId: string) =>
    apiClient.post<{ connection: GitConnection }>('/builder/git/github/oauth/complete', { connectId }),
  gitConnectToken: (token: string) => apiClient.post<{ connection: GitConnection }>('/builder/git/github/token', { token }),
  gitDisconnect: () => apiClient.delete<{ success: boolean }>('/builder/git/github'),
  gitRepos: () => apiClient.get<{ repos: GitRepo[] }>('/builder/git/github/repos'),
  gitPush: (id: string, body: GitPushBody) => apiClient.post<GitPushResult>(`/builder/git/projects/${id}/push`, body, 60_000),
  gitUnlink: (id: string) => apiClient.delete<{ git: null }>(`/builder/git/projects/${id}/link`),
};

export const contentApi = {
  episodes: (slug: string) => apiClient.get<ContentEpisode[]>(`/content/products/${slug}/episodes`),
  unlock: (episodeId: string, licenseKey?: string) =>
    apiClient.post<ContentUnlock>('/content/unlock', { episodeId, licenseKey }),
};

export const chatApi = {
  conversations: () => apiClient.get<ChatConversation[]>('/chat/conversations'),
  conversation: (id: string) => apiClient.get<ChatConversation>(`/chat/conversations/${id}`),
  start: (body: {
    productId?: string;
    jobId?: string;
    jobSlug?: string;
    applicantId?: string;
    applicationId?: string;
    talentSlug?: string;
    body?: string;
    imageUrl?: string;
  }) => apiClient.post<ChatConversation>('/chat/conversations', body),
  messages: (id: string) => apiClient.get<ChatMessage[]>(`/chat/conversations/${id}/messages`),
  send: (id: string, body: { body?: string; imageUrl?: string }) =>
    apiClient.post<ChatMessage>(`/chat/conversations/${id}/messages`, body),
  uploadImage: (form: FormData) =>
    apiClient.uploadForm<{ ok: boolean; url: string }>('/uploads/image', form),
};

/** All agent runtimes share launch + pairing + ssh; only the mount differs (Open WebUI / Paperclip have no ssh). */
function agentGatewayApi(base: AgentGatewayId): AgentGatewayApi {
  return {
    launch: () => apiClient.post<OpenClawLaunchResult>(`/${base}/launch`, { audience: 'aimarkets' }),
    approvePairing: (requestId?: string | null) =>
      apiClient.post<{ success: boolean; message?: string; skipped?: boolean }>(
        `/${base}/device-pairings/approve`,
        {
          request_id: requestId || null,
          requestId: requestId || null,
          ...(base === 'openclaw'
            ? {
                role: 'operator',
                scopes: ['operator.read', 'operator.write', 'operator.admin', 'operator.pairing'],
              }
            : {}),
        },
      ),
    generateSsh: (body) => apiClient.post<AgentSshAccess>(`/${base}/ssh/generate`, body),
    activeSsh: (agentId: string) =>
      apiClient.get<AgentSshAccess>(`/${base}/ssh/active${qs({ agentId })}`),
    revokeSsh: (agentId: string) =>
      apiClient.post<{ success: boolean }>(`/${base}/ssh/revoke`, { agentId }),
  };
}

export const openclawApi = agentGatewayApi('openclaw');
export const hermesApi = agentGatewayApi('hermes');
export const nanoclawApi = agentGatewayApi('nanoclaw');
export const spacebotApi = agentGatewayApi('spacebot');
export const openwebuiApi = agentGatewayApi('openwebui');
export const paperclipApi = agentGatewayApi('paperclip');

/** Server-side "My Agents" list so web and app stay in sync. */
export const hiredAgentsApi = {
  list: () => apiClient.get<HiredAgent[]>('/agents/hired'),
  upsert: (data: {
    agentId: string;
    slug: string;
    name: string;
    status?: AgentStatus;
    version?: string;
    model?: string;
  }) => apiClient.post<HiredAgent>('/agents/hired', data),
  update: (agentId: string, data: { status?: AgentStatus; name?: string; version?: string; model?: string }) =>
    apiClient.request<HiredAgent>(`/agents/hired/${encodeURIComponent(agentId)}`, {
      method: 'PATCH',
      body: data,
    }),
  remove: (agentId: string) =>
    apiClient.delete<{ success: boolean }>(`/agents/hired/${encodeURIComponent(agentId)}`),
};

/** Monthly agent rental — prepaid from the wallet; token usage is billed separately (BYOK is free). */
export const agentPlansApi = {
  pricing: () => apiClient.get<AgentPricing[]>('/agents/pricing'),
  list: () => apiClient.get<AgentSubscriptionStatus[]>('/agents/subscriptions'),
  one: (agentId: AgentGatewayId) => apiClient.get<AgentSubscriptionStatus>(`/agents/subscriptions/${agentId}`),
  subscribe: (agentId: AgentGatewayId) =>
    apiClient.post<AgentSubscriptionStatus>(`/agents/subscriptions/${agentId}`, {}),
  setAutoRenew: (agentId: AgentGatewayId, autoRenew: boolean) =>
    apiClient.request<AgentSubscriptionStatus>(`/agents/subscriptions/${agentId}`, {
      method: 'PATCH',
      body: { autoRenew },
    }),
};

/** Custom work (web, app, marketing, SEO, creator, automation): quote → phases → demo → approve per phase. */
export const adminApi = {
  overview: () => apiClient.get<AdminOverview>('/admin/overview'),
  revenueSeries: (granularity: AdminGranularity) =>
    apiClient.get<{ granularity: AdminGranularity; series: AdminDailyPoint[] }>(`/admin/revenue-series${qs({ granularity })}`),
  disputes: () => apiClient.get<Order[]>('/admin/disputes'),
  resolveDispute: (orderId: string, resolution: 'seller' | 'buyer') =>
    apiClient.patch<Order>(`/admin/disputes/${orderId}`, { resolution }),
};

export const hireApi = {
  list: (as?: 'buyer' | 'seller') => apiClient.get<HireProject[]>(`/hire/projects${qs({ as })}`),
  one: (id: string) => apiClient.get<HireProject>(`/hire/projects/${id}`),
  request: (body: { productId: string; brief: string; budget?: number; desiredDeadline?: string }) =>
    apiClient.post<HireProject>('/hire/projects', body),
  quote: (id: string, amount: number, note: string) =>
    apiClient.post<HireProject>(`/hire/projects/${id}/quote`, { amount, note }),
  counter: (id: string, amount: number, note: string) =>
    apiClient.post<HireProject>(`/hire/projects/${id}/counter`, { amount, note }),
  decline: (id: string, note: string) => apiClient.post<HireProject>(`/hire/projects/${id}/decline`, { note }),
  cancel: (id: string) => apiClient.post<HireProject>(`/hire/projects/${id}/cancel`, {}),
  accept: (id: string, milestones: HireMilestoneDraft[]) =>
    apiClient.post<HireProject>(`/hire/projects/${id}/accept`, { milestones }),
  submit: (id: string, body: { builderProjectId?: string; demoUrl?: string; note?: string }) =>
    apiClient.post<HireProject>(`/hire/projects/${id}/submit`, body),
  approve: (id: string) => apiClient.post<HireProject>(`/hire/projects/${id}/approve`, {}, 60_000),
  revision: (id: string, note: string) => apiClient.post<HireProject>(`/hire/projects/${id}/revision`, { note }),
  terminate: (id: string, reason: HireTerminateReason, note: string) =>
    apiClient.post<HireProject>(`/hire/projects/${id}/terminate`, { reason, note }),
};

export const workApi = {
  fields: () => apiClient.get<WorkField[]>('/work/fields'),
  listingFee: () => apiClient.get<WorkListingFee>('/work/listing-fee'),
  jobs: (params?: { q?: string; field?: string }) =>
    apiClient.get<WorkJob[]>(`/work/jobs${qs({ q: params?.q, field: params?.field })}`),
  job: (slug: string) => apiClient.get<WorkJob>(`/work/jobs/${slug}`),
  bids: (slug: string) => apiClient.get<WorkJobBid[]>(`/work/jobs/${slug}/bids`),
  applications: (slug: string) => apiClient.get<WorkJobBid[]>(`/work/jobs/${slug}/applications`),
  apply: (
    slug: string,
    data: {
      proposedAmount: number;
      proposedCurrency?: string;
      proposedPeriod?: string;
      coverLetter?: string;
    },
  ) => apiClient.post<WorkJobBid>(`/work/jobs/${slug}/applications`, data),
  updateApplication: (id: string, data: { status: 'accepted' | 'rejected' | 'withdrawn' }) =>
    apiClient.request<WorkJobBid>(`/work/applications/${id}`, { method: 'PATCH', body: data }),
  startWork: (id: string) => apiClient.post<WorkJobBid>(`/work/applications/${id}/start`, {}),
  deliver: (id: string, data: { note: string; urls?: string[] }) =>
    apiClient.post<WorkJobBid>(`/work/applications/${id}/deliver`, data),
  complete: (id: string) => apiClient.post<WorkJobBid>(`/work/applications/${id}/complete`, {}),
  revision: (id: string, note: string) =>
    apiClient.post<WorkJobBid>(`/work/applications/${id}/revision`, { note }),
  contracts: (as?: 'employer' | 'freelancer' | 'all') =>
    apiClient.get<WorkJobBid[]>(`/work/contracts/mine${qs({ as: as || 'all' })}`),
  talents: (params?: { q?: string; field?: string }) =>
    apiClient.get<WorkTalent[]>(`/work/talents${qs({ q: params?.q, field: params?.field })}`),
  talent: (slug: string) => apiClient.get<WorkTalent>(`/work/talents/${slug}`),
  postJob: (data: {
    title: string;
    company: string;
    description: string;
    location?: string;
    remote?: boolean;
    skills?: string[];
    employmentType?: string;
    salaryMin?: number;
    salaryMax?: number;
    salaryCurrency?: string;
    salaryPeriod?: string;
    salaryNegotiable?: boolean;
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
