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
  compareAtPrice?: number;
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
  hubPath?: string;
  /** Live published listing count from GET /categories. */
  productCount?: number;
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
  revenue?: number;
  reviewCount?: number;
  joinedAt?: string;
}

export interface HomeFeed {
  shops: Creator[];
  newArrivals: Product[];
  promoted: Product[];
  bestsellers: Product[];
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
  couponCode?: string;
  couponDiscount?: number;
}

export interface Coupon {
  id: string;
  sellerId?: string;
  code: string;
  type: 'percent' | 'amount';
  value: number;
  productIds: string[];
  minSubtotal: number;
  maxDiscount: number;
  startsAt: string | null;
  endsAt: string | null;
  maxUses: number;
  maxUsesPerBuyer: number;
  usedCount: number;
  active: boolean;
  createdAt?: string | null;
}

export interface CouponPreview {
  ok: boolean;
  code: string;
  type: 'percent' | 'amount';
  value: number;
  subtotal: number;
  discount: number;
  total: number;
  currency: string;
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

export interface BuyerUsageItem {
  id: string;
  createdAt: string;
  source: string;
  channel: string;
  model: string;
  productId?: string | null;
  productName?: string;
  productSlug?: string;
  inputTokens: number;
  outputTokens: number;
  tokens: number;
  amount: number;
  currency: string;
  note: string;
  markup?: number | null;
}

export interface BuyerUsageFeed {
  currency: string;
  summary: {
    requests: number;
    totalCharged: number;
    totalInputTokens: number;
    totalOutputTokens: number;
    totalTokens: number;
  };
  items: BuyerUsageItem[];
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
}

export interface PaypalCreateOrderResult {
  success: boolean;
  orderId: string;
  amountUsd: string;
  paymentHistoryId: string;
  approvalUrl?: string;
}

export type PaypalFunding = 'paypal';

export interface Review {
  id: string;
  productId: string;
  productName?: string;
  productSlug?: string;
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

export interface GameSessionInfo {
  sessionId: string;
  projectId?: string;
  serverId?: string;
  provider?: string;
  status: string;
  streamKind?: string;
  playerUrl: string;
  publicUrl?: string;
  productSlug?: string;
  hosting?: 'external' | 'aimarkets';
  playerMode?: 'terminal' | 'game';
}

export type { RunpodModelSchema as PlaygroundSchema } from '@/lib/runpod-schema';

export interface ChatConversation {
  id: string;
  productId: string;
  productName: string;
  productSlug: string;
  productCover: string;
  role: 'buyer' | 'seller';
  otherId: string;
  otherName: string;
  lastMessage: string;
  lastKind: 'text' | 'image';
  lastMessageAt: string | null;
  unread: number;
  createdAt: string | null;
}

export interface ChatMessage {
  id: string;
  conversationId: string;
  senderId: string;
  kind: 'text' | 'image';
  body: string;
  imageUrl: string;
  createdAt: string;
}

export interface OpenClawLaunchResult {
  success: boolean;
  url?: string;
  message?: string;
  audience?: string;
  userId?: string;
  gatewayUrl?: string;
  token?: string;
}
