export type UserRole = 'buyer' | 'creator' | 'admin';

export interface User {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  avatarUrl?: string;
  creatorSlug?: string;
  bio?: string;
}

export interface AuthResponse {
  token: string;
  refreshToken?: string;
  user: User;
}

export interface ProductPricing {
  model?: string;
  price?: number;
  usageRate?: number;
  currency?: string;
  interval?: string;
  unit?: string;
  usageUnit?: string;
}

export interface ChangelogEntry {
  version: string;
  date: string;
  notes: string;
}

export interface ProductRuntime {
  serverlessEndpoint?: string;
  tokenizeEndpoint?: string;
  gatewayUrl?: string;
  publicEndpoint?: string;
  skills?: string[];
  baseModel?: string;
  systemPrompt?: string;
  temperature?: number;
  maxTokens?: number;
  [key: string]: unknown;
}

export type LicenseTerm = 'day' | 'month' | 'year';

export interface ContentMeta {
  kind?: string;
  episodeCount?: number;
  licenseTerm?: LicenseTerm | '';
  licensePrices?: Partial<Record<LicenseTerm, number>>;
  voiceModes?: string[];
  voiceSampleUrl?: string;
  cloneStatus?: string;
  creditUnit?: string;
  charactersPerCredit?: number;
}

export interface Product {
  id: string;
  slug: string;
  name: string;
  tagline: string;
  description: string;
  category: string;
  productType?: string;
  ownershipType?: string;
  sellerId?: string;
  sellerSlug?: string;
  sellerName?: string;
  creatorId?: string;
  creatorSlug?: string;
  creatorName?: string;
  soldByPlatform?: boolean;
  coverUrl?: string;
  gallery?: string[];
  pricing?: ProductPricing;
  rating?: number;
  reviewCount?: number;
  salesCount?: number;
  tags?: string[];
  license?: string;
  termsSummary?: string;
  featured?: boolean;
  publishedAt?: string;
  runtime?: ProductRuntime;
  changelog?: ChangelogEntry[];
  contentMeta?: ContentMeta | null;
  apiDocsMarkdown?: string;
  provider?: string;
  infraProvider?: string;
  moderationStatus?: string;
  complianceStatus?: string;
}

export interface CategoryMeta {
  id: string;
  label: string;
  description?: string;
  navGroup?: string;
  group?: string;
}

export interface Creator {
  id: string;
  slug: string;
  name: string;
  bio: string;
  avatarUrl: string;
  coverUrl: string;
  verified: boolean;
  productCount: number;
  rating: number;
  totalSales: number;
}

export interface Order {
  id: string;
  productId: string;
  productName: string;
  buyerId?: string;
  sellerId?: string;
  quantity: number;
  amount: number;
  unitPrice?: number;
  grossAmount?: number;
  commissionRate?: number;
  commissionAmount?: number;
  taxAmount?: number;
  taxBreakdown?: unknown[];
  paymentFeeAmount?: number;
  sellerNetAmount?: number;
  platformFee?: number;
  currency: string;
  status: string;
  paymentStatus?: string;
  fulfillmentStatus?: string;
  createdAt: string;
  completedAt?: string | null;
  disputeStatus?: string;
  disputeReason?: string;
  canDispute?: boolean;
  payoutHeld?: boolean;
  contractSnapshot?: { termsVersion?: string; refundPolicy?: string } | null;
}

export interface CheckoutResult {
  checkoutId: string;
  status: string;
  amount?: number;
  currency?: string;
  balance?: number;
  orderId?: string;
  taxAmount?: number;
  commissionAmount?: number;
  provider?: string;
  license?: IssuedLicense | null;
  alreadyLicensed?: boolean;
  alreadyPurchased?: boolean;
}

export interface IssuedLicense {
  id?: string;
  licenseKey: string;
  orderId?: string;
  productId?: string;
  productName?: string;
  category?: string;
  term?: string;
  startsAt?: string | null;
  expiresAt?: string | null;
  status?: string;
  valid?: boolean;
}

export interface ContentEpisode {
  id: string;
  productId: string;
  index: number;
  title: string;
  kind: 'video' | 'image' | 'audio' | 'text' | string;
  mime?: string;
  durationSec?: number;
  size?: number;
  previewUrl?: string;
  published?: boolean;
  pageCount?: number;
}

export interface ContentUnlock {
  ok: boolean;
  playUrl: string;
  playToken?: string;
  downloadUrl?: string;
  kind: string;
  mime?: string;
  title?: string;
  pageCount?: number;
  pages?: Array<{ index: number; playUrl: string }>;
  expiresIn?: number;
  licenseExpiresAt?: string | null;
  drm?: string;
}

export interface WalletTx {
  id: string;
  type: 'credit' | 'debit' | 'withdraw' | 'deposit';
  amount: number;
  currency: string;
  note: string;
  status?: string;
  paymentMethod?: string;
  createdAt: string;
}

export interface WalletSummary {
  currency: string;
  balance: number;
  held: number;
  available: number;
}

export interface PaypalConfig {
  enabled: boolean;
  clientId: string;
  sandbox: boolean;
  merchantName?: string;
  applePay?: boolean;
  googlePay?: boolean;
  applePayDomains?: string[];
}

export interface PaypalCreateOrderResult {
  success: boolean;
  orderId: string;
  amountUsd: string;
  paymentHistoryId: string;
  approvalUrl?: string;
}

export type PaypalFunding = 'applepay' | 'googlepay' | 'paypal';

export interface Review {
  id: string;
  productId: string;
  userId: string;
  userName: string;
  rating: number;
  title: string;
  body: string;
  createdAt: string;
}

export interface Complaint {
  id: string;
  caseRef: string;
  kind: string;
  orderId?: string | null;
  productName?: string;
  body: string;
  status: string;
  evidenceUrls?: string[];
  sellerResponse?: string;
  events?: { at: string; actorRole: string; action: string; note: string }[];
  createdAt: string;
}

export interface NotificationItem {
  id: string;
  title: string;
  body: string;
  read: boolean;
  createdAt: string;
  href?: string;
}

export interface LegalDocument {
  id: string;
  documentType: string;
  version: string;
  title: string;
  locale: string;
  summary?: string;
  content?: string;
  effectiveAt?: string | null;
  publishedAt?: string | null;
}

export interface SellerProfile {
  id: string;
  verificationStatus: string;
  displayName?: string;
  legalName?: string;
  canPublish?: boolean;
  statusReason?: string;
  bankAccountMetadata?: { bankName?: string; accountHolderName?: string; accountNumberMasked?: string };
}

export interface SellerEarnings {
  grossSales: number;
  platformFee: number;
  platformCommissionRate?: number;
  taxWithholding: number;
  paymentFees: number;
  storeFees?: number;
  refunds: number;
  chargebacks: number;
  netPayable: number;
  currency: string;
  orderCount: number;
}

export interface SellerPayout {
  id?: string;
  _id?: string;
  status?: string;
  amount?: number;
  currency?: string;
  createdAt?: string;
  paidAt?: string;
}

export interface ApiErrorBody {
  message?: string;
  code?: string;
}

export interface WorkJob {
  id: string;
  slug: string;
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
  postedByName?: string;
  createdAt?: string;
}

export interface WorkTalent {
  id: string;
  slug: string;
  name: string;
  title: string;
  avatarUrl?: string;
  bio?: string;
  skills?: string[];
  experienceYears?: number;
  hoursPerWeek?: number;
  rateAmount?: number;
  rateCurrency?: string;
  rateNegotiable?: boolean;
  available?: boolean;
  contractsCount?: number;
  rating?: number;
  reviewsCount?: number;
}

export interface PlaygroundRunResult {
  ok?: boolean;
  id?: string;
  status?: string;
  provider?: string;
  model?: string;
  endpointId?: string;
  executionTime?: number;
  output?: {
    kind?: string;
    text?: string;
    image_url?: string;
    video_url?: string;
    audio_url?: string;
    images?: string[];
    cost?: number;
  };
  usage?: Record<string, unknown>;
  cost?: number;
  currency?: string;
}

export type { RunpodModelSchema as PlaygroundSchema } from '@/lib/runpod-schema';
