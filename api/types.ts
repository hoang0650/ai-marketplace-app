export type UserRole = 'buyer' | 'seller' | 'talent' | 'freelancer' | 'employer' | 'admin';

/** Roles a user may pick at signup (admin is never self-assignable). */
export type SignupRole = Exclude<UserRole, 'admin'>;

export interface GooglePrefill {
  email: string;
  name: string;
  avatarUrl?: string;
  googleSignupToken: string;
  hasAccount: boolean;
}

export interface User {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  avatarUrl?: string;
  creatorSlug?: string;
  bio?: string;
  kycStatus?: string;
}

export type KycStatus = 'none' | 'draft' | 'pending' | 'verified' | 'rejected';
export type KycIdType = 'cccd' | 'cmnd' | 'passport' | 'other';
export type KycSide = 'front' | 'back' | 'selfie';

export interface KycProfile {
  status: KycStatus;
  fullName: string;
  idType: KycIdType;
  idNumber?: string;
  idNumberMasked: string;
  hasFront: boolean;
  hasBack: boolean;
  hasSelfie: boolean;
  submittedAt: string | null;
  reviewedAt: string | null;
  rejectReason: string;
  canSubmit: boolean;
  canEdit: boolean;
  withdrawAllowed: boolean;
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

export type BannerLinkType = 'product' | 'category' | 'seller' | 'url' | 'agents' | 'explore';
export type BannerSlot = 'home_hero' | 'offers' | 'partners';

export interface Banner {
  id: string;
  title: string;
  subtitle?: string;
  imageUrl: string;
  linkType: BannerLinkType;
  linkValue?: string;
  slot: BannerSlot;
  sortOrder?: number;
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
  holdHours?: number;
  persona?: PayoutPersona;
  personas?: PayoutPersona[];
  policy?: PayoutPolicy;
  holds?: Array<{
    orderId: string;
    productName: string;
    amount: number;
    currency: string;
    kind: 'protection_window' | 'dispute';
    holdUntil: string;
    disputeStatus: string;
    disputeReason: string;
  }>;
}

export type PayoutPersona = 'buyer' | 'seller' | 'talent' | 'freelancer' | 'employer' | 'admin';

export interface PayoutPolicy {
  persona: PayoutPersona;
  canWithdraw: boolean;
  platformFeeRate: number;
  taxRate: number;
  totalFeeRate: number;
  chargeAtWithdraw: boolean;
  minAmount: number;
  minAmountCurrency: string;
  minAmountVnd: number;
  holdHours: number;
  requiresNoDispute: boolean;
}

export interface PayoutQuote {
  gross: number;
  platformFee: number;
  tax: number;
  net: number;
  totalFee: number;
}

export interface PayoutPolicyResponse {
  persona: PayoutPersona;
  personas: PayoutPersona[];
  policy: PayoutPolicy;
  quote: PayoutQuote | null;
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

export interface GpayConfig {
  available?: boolean;
  enabled: boolean;
  /** GPay payment gateway (ATM / card / transfer on GPay's page). */
  portalEnabled?: boolean;
  /** Dynamic VietQR via GPay QR Payment. */
  qrEnabled?: boolean;
  sandbox: boolean;
  canSimulate?: boolean;
  bankCode: string;
  accountType: string;
  minTopupVnd: number;
  vndPerUsd: number;
  merchantName?: string;
}

export interface GpayOrder {
  requestId: string;
  status: 'pending' | 'completed' | 'failed' | 'cancelled';
  channel: string;
  amountVnd: number;
  amountUsd: number;
  createdAt: string | null;
}

export interface GpayCheckoutResponse {
  success: boolean;
  order: GpayOrder;
  billUrl: string;
  billId: string;
  expiredTime: number | null;
}

export interface GpayQrResponse {
  success: boolean;
  order: GpayOrder;
  qrCode: string;
  qrCodeImage: string;
  accountNumber: string;
  accountName: string;
  provider: string;
}

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
  jobApplicationId?: string | null;
  jobId?: string | null;
  jobTitle?: string;
  jobSlug?: string;
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
  fieldIds?: string[];
  skills?: string[];
  employmentType?: string;
  salaryMin?: number;
  salaryMax?: number;
  salaryCurrency?: string;
  salaryPeriod?: string;
  salaryNegotiable?: boolean;
  postedBy?: string;
  postedByName?: string;
  applicationsCount?: number;
  createdAt?: string;
}

export interface WorkTalent {
  id: string;
  slug: string;
  userId?: string;
  name: string;
  title: string;
  avatarUrl?: string;
  bio?: string;
  fieldIds?: string[];
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

export interface WorkField {
  id: string;
  label: string;
  children?: WorkField[];
}

export interface WorkJobBid {
  id: string;
  jobId?: string;
  jobSlug?: string;
  jobTitle?: string;
  applicantId?: string;
  applicantName: string;
  applicantAvatar?: string;
  proposedAmount: number;
  proposedCurrency: string;
  proposedPeriod: string;
  coverLetter?: string;
  status: string;
  workStatus?: string;
  deliveryNote?: string;
  deliveryUrls?: string[];
  deliveredAt?: string | null;
  revisionNote?: string;
  revisionCount?: number;
  completedAt?: string | null;
  disputedAt?: string | null;
  conversationId?: string;
  createdAt?: string;
  mine?: boolean;
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
  contextType?: 'product' | 'job' | 'talent';
  productId: string;
  productName: string;
  productSlug: string;
  productCover: string;
  jobId?: string;
  jobTitle?: string;
  jobSlug?: string;
  talentSlug?: string;
  title?: string;
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
  gatewayToken?: string;
  username?: string;
  password?: string;
  autoLogin?: boolean;
}

export type AgentStatus = 'running' | 'archived' | 'provisioning' | 'stopped';

export type AgentIconKind = 'openclaw' | 'hermes' | 'nano' | 'webui' | 'tavern' | 'space';

export interface MarketplaceAgent {
  id: string;
  slug: string;
  name: string;
  description: string;
  icon: AgentIconKind;
  logoUrl: string;
  version: string;
  model: string;
  docsUrl: string;
  public: boolean;
  hireProductSlug?: string;
  openclawGateway?: boolean;
  hermesGateway?: boolean;
  nanoclawGateway?: boolean;
  spacebotGateway?: boolean;
}

export interface HiredAgent {
  id: string;
  agentId: string;
  slug: string;
  name: string;
  status: AgentStatus;
  version: string;
  model: string;
  launchedAt: string;
  archivedAt?: string;
}

export interface AgentSshAccess {
  success: boolean;
  id?: string;
  agentId?: string;
  authMethod?: 'password' | 'key';
  host?: string;
  port?: number;
  username?: string;
  password?: string;
  privateKey?: string;
  publicKey?: string;
  fingerprint?: string;
  keyName?: string;
  installed?: boolean;
  command?: string;
  commandWithPassword?: string;
  expiresAt?: string;
  expiresInMinutes?: number;
  note?: string;
  howTo?: string[];
  message?: string;
  active?: boolean;
  session?: AgentSshAccess | null;
}

/** OpenClaw / Hermes / NanoClaw / SpaceBot all share this launch + pairing shape. */
export type AgentGatewayId = 'openclaw' | 'hermes' | 'nanoclaw' | 'spacebot';

/** Shared gateway surface — launch, device pairing, and temporary SSH. */
export interface AgentGatewayApi {
  launch: () => Promise<OpenClawLaunchResult>;
  approvePairing: (
    requestId?: string | null,
  ) => Promise<{ success: boolean; message?: string; skipped?: boolean }>;
  generateSsh: (body: {
    agentId: string;
    host?: string;
    port?: number;
    username?: string;
  }) => Promise<AgentSshAccess>;
  activeSsh: (agentId: string) => Promise<AgentSshAccess>;
  revokeSsh: (agentId: string) => Promise<{ success: boolean }>;
}
