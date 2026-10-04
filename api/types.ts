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
export type KycSide = 'front' | 'back';
export type KycSubjectType = 'individual' | 'organization';
export type KycOrgType = 'household' | 'company';

export interface KycProfile {
  status: KycStatus;
  subjectType: KycSubjectType;
  /** Individual: the person. Organization: the legal representative / household owner. */
  fullName: string;
  idType: KycIdType;
  idNumber?: string;
  idNumberMasked: string;
  personalTaxCode?: string;
  personalTaxCodeMasked: string;
  orgType: KycOrgType | '';
  orgName: string;
  orgTaxCode: string;
  orgAddress: string;
  hasFront: boolean;
  hasBack: boolean;
  submittedAt: string | null;
  reviewedAt: string | null;
  rejectReason: string;
  canSubmit: boolean;
  canEdit: boolean;
  withdrawAllowed: boolean;
}

export interface KycSubmitBody {
  subjectType: KycSubjectType;
  fullName: string;
  idType: KycIdType;
  idNumber: string;
  personalTaxCode?: string;
  orgType?: KycOrgType;
  orgName?: string;
  orgTaxCode?: string;
  orgAddress?: string;
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
  /** Hire-request listings: the seller accepts a counter offer. */
  negotiable?: boolean;
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
  /** GPU / game stream listings only. */
  streaming?: ProductStreaming;
}

/** pc = web / desktop; mobile = this Android / iOS app (touch, landscape). */
export type StreamDevice = 'pc' | 'mobile';

export interface ProductStreaming {
  devices: StreamDevice[];
  /** Platform-sold GPU rented as a platform GPU workspace instead of a seller stream. */
  platformRental?: boolean;
  rentalOfferId?: string;
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
  /** i18n key rendered as `notify.<key>.title|body` with `params`. */
  key?: string;
  params?: Record<string, string | number>;
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
  client?: 'pc' | 'android' | 'ios';
  device?: StreamDevice;
  profile?: StreamProfile;
  stopReason?: string;
  heartbeatMs?: number;
  idleTimeoutMs?: number;
  billedMinutes?: number;
  billedCost?: number;
}

export interface StreamProfile {
  device: StreamDevice;
  maxWidth: number;
  maxHeight: number;
  fps: number;
  bitrateKbps: number;
  inputs: string[];
  orientation: 'any' | 'landscape';
}

export interface GameHeartbeat {
  ok?: boolean;
  status?: string;
  ratePerHour: number;
  billedMinutes: number;
  billedCost: number;
  currency: string;
  available?: number;
  minutesLeft?: number;
}

export interface GpuOffer {
  id: string;
  name: string;
  memoryGb: number;
  pricePerHour: number;
  availability: 'high' | 'medium' | 'low' | 'unknown';
}

export interface GpuOffersResponse {
  offers: GpuOffer[];
  currency: 'USD';
  wallet: { available: number };
  limits: {
    minPrepayHours: number;
    maxGpuCount: number;
    maxActive: number;
    volumeGb: { min: number; max: number; default: number };
    diskGb: number;
    warnMinutes: number;
    terminateGraceHours: number;
  };
}

export type GpuRentalStatus = 'creating' | 'running' | 'stopped' | 'terminated' | 'error';

export interface GpuRental {
  id: string;
  name: string;
  gpu: { id: string; name: string; memoryGb: number; count: number };
  diskGb: number;
  volumeGb: number;
  status: GpuRentalStatus;
  ready: boolean;
  pricePerHour: number;
  stoppedPricePerHour: number;
  currency: 'USD';
  billedMinutes: number;
  billedTotal: number;
  stoppedReason: '' | 'user' | 'insufficient_funds' | 'admin';
  terminateAfter: string | null;
  createdAt: string;
  stoppedAt: string | null;
  terminatedAt: string | null;
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

export type AgentIconKind = 'openclaw' | 'hermes' | 'nano' | 'webui' | 'paperclip' | 'space';

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
  openwebuiGateway?: boolean;
  paperclipGateway?: boolean;
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

/** OpenClaw / Hermes / NanoClaw / SpaceBot / Open WebUI / Paperclip all share this launch + pairing shape. */
export type AgentGatewayId = 'openclaw' | 'hermes' | 'nanoclaw' | 'spacebot' | 'openwebui' | 'paperclip';

export interface AgentFee {
  vnd: number;
  amount: number;
  currency: string;
  periodDays: number;
}

/** Public price row from GET /agents/pricing. */
export interface AgentPricing {
  agentId: AgentGatewayId;
  fee: AgentFee;
  /** Markup over the provider price on AI Markets-provided models (0.25 = +25%). */
  tokenMarkup: number;
  /** Runs only on the buyer's own provider keys — never billed per token. */
  byokOnly: boolean;
}

/** Monthly plan of one hosted agent (launch is refused with 402 AGENT_SUBSCRIPTION_REQUIRED when inactive). */
export interface AgentSubscriptionStatus {
  agentId: AgentGatewayId;
  active: boolean;
  exempt: boolean;
  paidUntil: string | null;
  daysLeft: number;
  /** Wallet auto-renewal (on by default; renews ~1 day before expiry). */
  autoRenew: boolean;
  /** Set once the plan expired: workspace data is deleted at this time unless renewed. */
  purgeDueAt: string | null;
  purgedAt: string | null;
  retentionDays: number;
  fee: AgentFee;
  charged?: boolean;
}

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

/** AI App Builder (rork-style, buyer's own provider key). */
export type BuilderKind = 'web' | 'app';

export interface BuilderFile {
  path: string;
  content: string;
}

export interface BuilderMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  files: string[];
  provider: string;
  model: string;
  createdAt: string;
}

export interface BuilderProject {
  id: string;
  name: string;
  kind: BuilderKind;
  provider: string;
  model: string;
  version: number;
  fileCount: number;
  previewUrl: string;
  lastGeneratedAt: string | null;
  template?: { productId: string; name: string; version: number } | null;
  git?: BuilderProjectGit | null;
  createdAt: string;
  updatedAt: string;
  files?: BuilderFile[];
  messages?: BuilderMessage[];
}

export interface BuilderProjectGit {
  provider: 'github';
  owner: string;
  repo: string;
  fullName: string;
  branch: string;
  repoUrl: string;
  private: boolean;
  lastCommitSha: string;
  lastCommitUrl: string;
  lastPushedAt: string | null;
  lastPushedVersion: number;
}

export interface GitConnection {
  provider: 'github';
  method: 'oauth' | 'token';
  login: string;
  avatarUrl: string;
  scopes: string;
  status: 'active' | 'invalid';
  lastUsedAt: string | null;
  connectedAt: string;
}

export interface GitStatus {
  providers: { id: 'github'; label: string; oauth: boolean }[];
  connections: GitConnection[];
}

export interface GitRepo {
  fullName: string;
  owner: string;
  name: string;
  private: boolean;
  defaultBranch: string;
  htmlUrl: string;
  pushedAt: string | null;
}

export interface GitPushBody {
  create?: { name?: string; private?: boolean };
  repo?: string;
  branch?: string;
  message?: string;
}

export interface GitPushResult {
  git: BuilderProjectGit;
  commit: { sha: string; url: string; unchanged: boolean };
  repo: { fullName: string; url: string; private: boolean; created: boolean };
}

export interface BuilderTemplateMeta {
  productId: string;
  kind: BuilderKind;
  ready: boolean;
  version: number;
  fileCount: number;
  demoEnabled: boolean;
  demoUrl: string;
  useCount: number;
  updatedAt: string | null;
  access: boolean;
  paths?: string[];
  /** Linked GitHub source (owner only). */
  git?: TemplateGitSource | null;
}

export interface TemplateGitSource {
  provider: 'github';
  repo: string;
  branch: string;
  path: string;
  commitSha: string;
  repoUrl: string;
  syncedAt: string | null;
}

export interface TemplateGitPick {
  repo: string;
  branch?: string;
  path?: string;
}

export interface TemplateBuildLine {
  /** ms since the build started */
  t: number;
  level: 'info' | 'warn' | 'error' | 'success';
  msg: string;
}

export interface TemplateBuild {
  id: string;
  kind: BuilderKind;
  status: 'success' | 'failed';
  source: (Omit<TemplateGitSource, 'syncedAt'> & { commitMessage?: string }) | null;
  log: TemplateBuildLine[];
  fileCount: number;
  paths: string[];
  skipped: { path: string; reason: string }[];
  durationMs: number;
  createdAt: string | null;
  previewUrl: string;
  productId: string | null;
}

export interface TemplateUploadResult {
  template: BuilderTemplateMeta;
  skipped: { path: string; reason: string }[];
  build?: TemplateBuild;
}

export interface BuilderTemplateListing {
  product: Product;
  template: BuilderTemplateMeta;
}

export interface ByokProvider {
  id: string;
  label: string;
  keyUrl: string;
  keyHint: string;
  custom: boolean;
  defaultModel: string;
}

export interface ByokKey {
  provider: string;
  last4: string;
  baseUrl: string;
  model: string;
  status: 'active' | 'invalid';
  lastVerifiedAt: string | null;
}

export interface BuilderGenerateResult {
  project: BuilderProject;
  touched: string[];
  rejected: string[];
  truncated: boolean;
}

export type HireStatus = 'requested' | 'quoted' | 'active' | 'completed' | 'terminated' | 'declined' | 'cancelled';
export type HireMilestoneStatus = 'pending' | 'in_progress' | 'submitted' | 'approved' | 'cancelled';
export type HireTerminateReason = 'late' | 'not_as_requested' | 'other';

export interface HireMilestone {
  id: string;
  index: number;
  title: string;
  amount: number;
  dueAt: string;
  status: HireMilestoneStatus;
  overdue: boolean;
  builderProjectId: string | null;
  previewUrl: string;
  previewKind: 'web' | 'app' | null;
  demoUrl: string;
  demoNote: string;
  submittedAt: string | null;
  approvedAt: string | null;
  revisionNote: string;
  revisionCount: number;
  orderId: string | null;
}

export interface HireProject {
  id: string;
  role: 'buyer' | 'seller' | null;
  status: HireStatus;
  productId: string;
  productName: string;
  productSlug: string;
  category: string;
  buyerId: string;
  buyerName: string;
  sellerId: string;
  sellerName: string;
  brief: string;
  budget: number;
  desiredDeadline: string | null;
  currency: string;
  listPrice: number;
  quote: { amount: number; note: string; by: 'seller' | 'buyer' | ''; at: string | null };
  demoKind: 'web' | 'app' | null;
  milestones: HireMilestone[];
  currentMilestoneId: string | null;
  paidTotal: number;
  acceptedAt: string | null;
  completedAt: string | null;
  terminatedAt: string | null;
  terminationReason: HireTerminateReason | '';
  terminationNote: string;
  complaintId: string | null;
  events: { at: string; actor: string; action: string; note: string }[];
  createdAt: string;
  updatedAt: string;
}

export interface HireMilestoneDraft {
  title: string;
  amount: number;
  dueAt: string;
}

export interface WorkListingFee {
  vnd: number;
  amount: number;
  currency: string;
}
