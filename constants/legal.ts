export type LegalGroupId = 'core' | 'commerce' | 'data' | 'ops';

/** Labels only: the documents themselves are the website pages https://aimarkets.vn/legal/<slug>. */
export type LegalPolicyMeta = {
  slug: string;
  title: string;
  group: LegalGroupId;
};

export const LEGAL_POLICY_GROUPS: { id: LegalGroupId }[] = [
  { id: 'core' },
  { id: 'commerce' },
  { id: 'data' },
  { id: 'ops' },
];

/** Same slugs as the web routes /legal/:slug (Angular `legal-policies.catalog.ts`). */
export const LEGAL_POLICIES: LegalPolicyMeta[] = [
  {
    slug: 'quy-che-hoat-dong-san-tmdt',
    title: 'Quy chế hoạt động sàn TMĐT',
    group: 'core',
  },
  {
    slug: 'dieu-khoan-su-dung',
    title: 'Điều khoản sử dụng',
    group: 'core',
  },
  {
    slug: 'mau-hop-dong-cung-cap-dich-vu-nguoi-ban',
    title: 'Thỏa thuận người bán',
    group: 'core',
  },
  {
    slug: 'chinh-sach-nguoi-ban',
    title: 'Chính sách người bán',
    group: 'commerce',
  },
  {
    slug: 'chinh-sach-nguoi-mua',
    title: 'Chính sách người mua',
    group: 'commerce',
  },
  {
    slug: 'chinh-sach-thanh-toan-doi-soat',
    title: 'Thanh toán và đối soát',
    group: 'commerce',
  },
  {
    slug: 'chinh-sach-hoan-tien',
    title: 'Chính sách hoàn tiền',
    group: 'commerce',
  },
  {
    slug: 'chinh-sach-khieu-nai-tranh-chap',
    title: 'Khiếu nại và tranh chấp',
    group: 'commerce',
  },
  {
    slug: 'chinh-sach-thue',
    title: 'Chính sách thuế',
    group: 'commerce',
  },
  {
    slug: 'chinh-sach-hoa-don',
    title: 'Chính sách hóa đơn',
    group: 'commerce',
  },
  {
    slug: 'chinh-sach-affiliate',
    title: 'Chính sách chương trình Affiliate',
    group: 'commerce',
  },
  {
    slug: 'chinh-sach-bao-mat-va-du-lieu',
    title: 'Bảo mật và dữ liệu cá nhân',
    group: 'data',
  },
  {
    slug: 'chinh-sach-ip-ban-quyen-license',
    title: 'Sở hữu trí tuệ và license',
    group: 'data',
  },
  {
    slug: 'chinh-sach-cookies',
    title: 'Chính sách cookies',
    group: 'data',
  },
  {
    slug: 'chinh-sach-luu-tru-va-cung-cap-du-lieu',
    title: 'Lưu trữ và cung cấp dữ liệu',
    group: 'data',
  },
  {
    slug: 'chinh-sach-su-dung-chap-nhan-duoc',
    title: 'Sử dụng chấp nhận được (AUP)',
    group: 'ops',
  },
  {
    slug: 'chinh-sach-kiem-duyet-san-pham-ai',
    title: 'Kiểm duyệt sản phẩm AI',
    group: 'ops',
  },
  {
    slug: 'chinh-sach-agent-container-security',
    title: 'An ninh agent và container',
    group: 'ops',
  },
  {
    slug: 'quy-trinh-xac-minh-nguoi-ban',
    title: 'Quy trình xác minh người bán',
    group: 'ops',
  },
  {
    slug: 'quy-trinh-xu-ly-vi-pham',
    title: 'Quy trình xử lý vi phạm',
    group: 'ops',
  },
];

export const LEGAL_QUICK_SLUGS = [
  'quy-che-hoat-dong-san-tmdt',
  'dieu-khoan-su-dung',
  'chinh-sach-bao-mat-va-du-lieu',
  'chinh-sach-hoan-tien',
] as const;

/** API / old mobile aliases → web slug. */
const ALIASES: Record<string, string> = {
  terms: 'dieu-khoan-su-dung',
  'terms-of-service': 'dieu-khoan-su-dung',
  privacy: 'chinh-sach-bao-mat-va-du-lieu',
  'privacy-policy': 'chinh-sach-bao-mat-va-du-lieu',
  'marketplace-rules': 'quy-che-hoat-dong-san-tmdt',
  'seller-policy': 'chinh-sach-nguoi-ban',
  'buyer-policy': 'chinh-sach-nguoi-mua',
  'payment-policy': 'chinh-sach-thanh-toan-doi-soat',
  'refund-policy': 'chinh-sach-hoan-tien',
  'dispute-policy': 'chinh-sach-khieu-nai-tranh-chap',
  'complaint-policy': 'chinh-sach-khieu-nai-tranh-chap',
  'intellectual-property': 'chinh-sach-ip-ban-quyen-license',
  'acceptable-use': 'chinh-sach-su-dung-chap-nhan-duoc',
  'data-policy': 'chinh-sach-bao-mat-va-du-lieu',
  'seller-agreement': 'mau-hop-dong-cung-cap-dich-vu-nguoi-ban',
  cookies: 'chinh-sach-cookies',
  'tax-policy': 'chinh-sach-thue',
  'invoice-policy': 'chinh-sach-hoa-don',
  'affiliate-policy': 'chinh-sach-affiliate',
  affiliate: 'chinh-sach-affiliate',
};

export function resolveLegalPolicy(slugOrAlias: string | null | undefined): LegalPolicyMeta | undefined {
  const raw = String(slugOrAlias || '')
    .trim()
    .replace(/^\/+|\/+$/g, '');
  if (!raw) return undefined;
  const slug = ALIASES[raw] || raw;
  return LEGAL_POLICIES.find((p) => p.slug === slug);
}
