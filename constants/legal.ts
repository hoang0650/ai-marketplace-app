export type LegalGroupId = 'core' | 'commerce' | 'data' | 'ops';

export type LegalPolicyMeta = {
  slug: string;
  file: string;
  title: string;
  summary: string;
  group: LegalGroupId;
};

export const LEGAL_POLICY_GROUPS: { id: LegalGroupId }[] = [
  { id: 'core' },
  { id: 'commerce' },
  { id: 'data' },
  { id: 'ops' },
];

/** Same catalog as Angular `legal-policies.catalog.ts`. */
export const LEGAL_POLICIES: LegalPolicyMeta[] = [
  {
    slug: 'quy-che-hoat-dong-san-tmdt',
    file: '01-quy-che-hoat-dong-san-tmdt.md',
    title: 'Quy chế hoạt động sàn TMĐT',
    summary: 'Mô hình sàn trung gian, Platform Direct, Seller và Provider.',
    group: 'core',
  },
  {
    slug: 'dieu-khoan-su-dung',
    file: '02-dieu-khoan-su-dung.md',
    title: 'Điều khoản sử dụng',
    summary: 'Điều kiện truy cập, tài khoản và giới hạn trách nhiệm.',
    group: 'core',
  },
  {
    slug: 'mau-hop-dong-cung-cap-dich-vu-nguoi-ban',
    file: '15-mau-hop-dong-cung-cap-dich-vu-nguoi-ban.md',
    title: 'Thỏa thuận người bán',
    summary: 'Hợp đồng điện tử / clickwrap giữa sàn và Seller.',
    group: 'core',
  },
  {
    slug: 'chinh-sach-nguoi-ban',
    file: '03-chinh-sach-nguoi-ban.md',
    title: 'Chính sách người bán',
    summary: 'Điều kiện đăng bán, phí sàn 20%, thuế 10% trên 80% doanh thu seller, phí CHPlay/App Store.',
    group: 'commerce',
  },
  {
    slug: 'chinh-sach-nguoi-mua',
    file: '04-chinh-sach-nguoi-mua.md',
    title: 'Chính sách người mua',
    summary: 'Quyền, nghĩa vụ Buyer và nhãn nguồn hàng.',
    group: 'commerce',
  },
  {
    slug: 'chinh-sach-thanh-toan-doi-soat',
    file: '05-chinh-sach-thanh-toan-doi-soat.md',
    title: 'Thanh toán và đối soát',
    summary: 'Cổng thanh toán, phí IAP cửa hàng, ledger nội bộ, cấm giao dịch ngoài sàn.',
    group: 'commerce',
  },
  {
    slug: 'chinh-sach-hoan-tien',
    file: '06-chinh-sach-hoan-tien.md',
    title: 'Chính sách hoàn tiền',
    summary: 'Điều kiện hoàn, usage billing và quy trình xử lý.',
    group: 'commerce',
  },
  {
    slug: 'chinh-sach-khieu-nai-tranh-chap',
    file: '07-chinh-sach-khieu-nai-tranh-chap.md',
    title: 'Khiếu nại và tranh chấp',
    summary: 'Kênh tiếp nhận, phân loại dispute và appeal.',
    group: 'commerce',
  },
  {
    slug: 'chinh-sach-thue',
    file: '18-chinh-sach-thue.md',
    title: 'Chính sách thuế',
    summary: 'Phí sàn 20% + thuế 10% trên 80% doanh thu seller (8% đơn).',
    group: 'commerce',
  },
  {
    slug: 'chinh-sach-hoa-don',
    file: '19-chinh-sach-hoa-don.md',
    title: 'Chính sách hóa đơn',
    summary: 'Phân biệt hóa đơn sàn (commission) và hóa đơn seller.',
    group: 'commerce',
  },
  {
    slug: 'chinh-sach-bao-mat-va-du-lieu',
    file: '08-chinh-sach-bao-mat-va-du-lieu.md',
    title: 'Bảo mật và dữ liệu cá nhân',
    summary: 'Xử lý dữ liệu theo Nghị định 13/2023/NĐ-CP.',
    group: 'data',
  },
  {
    slug: 'chinh-sach-ip-ban-quyen-license',
    file: '09-chinh-sach-ip-ban-quyen-license.md',
    title: 'Sở hữu trí tuệ và license',
    summary: 'Quyền SHTT, notice-and-action, phạm vi quyền Buyer.',
    group: 'data',
  },
  {
    slug: 'chinh-sach-cookies',
    file: '16-chinh-sach-cookies.md',
    title: 'Chính sách cookies',
    summary: 'Cookie cần thiết, phân tích và quyền quản lý.',
    group: 'data',
  },
  {
    slug: 'chinh-sach-luu-tru-va-cung-cap-du-lieu',
    file: '17-chinh-sach-luu-tru-va-cung-cap-du-lieu.md',
    title: 'Lưu trữ và cung cấp dữ liệu',
    summary: 'Retention, legal hold và yêu cầu cơ quan nhà nước.',
    group: 'data',
  },
  {
    slug: 'chinh-sach-su-dung-chap-nhan-duoc',
    file: '10-chinh-sach-su-dung-chap-nhan-duoc.md',
    title: 'Sử dụng chấp nhận được (AUP)',
    summary: 'Hành vi cấm trên API, GPU, agent và listing.',
    group: 'ops',
  },
  {
    slug: 'chinh-sach-kiem-duyet-san-pham-ai',
    file: '11-chinh-sach-kiem-duyet-san-pham-ai.md',
    title: 'Kiểm duyệt sản phẩm AI',
    summary: 'Luồng duyệt model, dataset, agent, API trước khi publish.',
    group: 'ops',
  },
  {
    slug: 'chinh-sach-agent-container-security',
    file: '12-chinh-sach-agent-container-security.md',
    title: 'An ninh agent và container',
    summary: 'Sandbox, secret và xử lý workload độc hại.',
    group: 'ops',
  },
  {
    slug: 'quy-trinh-xac-minh-nguoi-ban',
    file: '13-quy-trinh-xac-minh-nguoi-ban.md',
    title: 'Quy trình xác minh người bán',
    summary: 'Hồ sơ KYC, VERIFIED và clickwrap thỏa thuận Seller.',
    group: 'ops',
  },
  {
    slug: 'quy-trinh-xu-ly-vi-pham',
    file: '14-quy-trinh-xu-ly-vi-pham.md',
    title: 'Quy trình xử lý vi phạm',
    summary: 'Mức độ vi phạm, khẩn cấp an ninh và audit.',
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
};

export function resolveLegalPolicy(slugOrAlias: string | null | undefined): LegalPolicyMeta | undefined {
  const raw = String(slugOrAlias || '')
    .trim()
    .replace(/^\/+|\/+$/g, '');
  if (!raw) return undefined;
  const slug = ALIASES[raw] || raw;
  return LEGAL_POLICIES.find((p) => p.slug === slug);
}

export function neighborsOf(slug: string): { prev?: LegalPolicyMeta; next?: LegalPolicyMeta } {
  const idx = LEGAL_POLICIES.findIndex((p) => p.slug === slug);
  if (idx < 0) return {};
  return {
    prev: idx > 0 ? LEGAL_POLICIES[idx - 1] : undefined,
    next: idx < LEGAL_POLICIES.length - 1 ? LEGAL_POLICIES[idx + 1] : undefined,
  };
}

export function slugFromLegalFile(file: string): string {
  return String(file)
    .replace(/^.*\//, '')
    .replace(/^\d+-/, '')
    .replace(/\.md$/i, '');
}
