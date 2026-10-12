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
    summary: 'Phiên bản 2.1, hiệu lực 05/10/2026: mô hình sàn, sản phẩm được phép, phí 20% + thuế 8%, thanh toán bằng ví và giải quyết khiếu nại.',
    group: 'core',
  },
  {
    slug: 'dieu-khoan-su-dung',
    file: '02-dieu-khoan-su-dung.md',
    title: 'Điều khoản sử dụng',
    summary: 'Tài khoản, dịch vụ định kỳ, nội dung AI, hành vi cấm và giới hạn trách nhiệm.',
    group: 'core',
  },
  {
    slug: 'mau-hop-dong-cung-cap-dich-vu-nguoi-ban',
    file: '15-mau-hop-dong-cung-cap-dich-vu-nguoi-ban.md',
    title: 'Thỏa thuận người bán',
    summary: 'Phiên bản v2026.10.05: hợp đồng điện tử giữa sàn và người bán về phí, đối soát, eKYC và rút tiền.',
    group: 'core',
  },
  {
    slug: 'chinh-sach-nguoi-ban',
    file: '03-chinh-sach-nguoi-ban.md',
    title: 'Chính sách người bán',
    summary: 'Điều kiện đăng bán, eKYC, giấy chứng nhận đăng ký kinh doanh, phí sàn 20%, thuế 8%, giữ tiền 48 giờ.',
    group: 'commerce',
  },
  {
    slug: 'chinh-sach-nguoi-mua',
    file: '04-chinh-sach-nguoi-mua.md',
    title: 'Chính sách người mua',
    summary: 'Quyền, nghĩa vụ người mua; thanh toán bằng ví, rút số dư sau eKYC; GPU, phút chơi game, thuê bao agent và dịch vụ chuyên môn trọn gói.',
    group: 'commerce',
  },
  {
    slug: 'chinh-sach-thanh-toan-doi-soat',
    file: '05-chinh-sach-thanh-toan-doi-soat.md',
    title: 'Thanh toán và đối soát',
    summary: 'Mọi đơn thanh toán bằng ví; GPay, Apple/Google IAP chỉ để nạp ví; rút ví sau eKYC; đối soát và cấm giao dịch ngoài sàn.',
    group: 'commerce',
  },
  {
    slug: 'chinh-sach-hoan-tien',
    file: '06-chinh-sach-hoan-tien.md',
    title: 'Chính sách hoàn tiền',
    summary: 'Điều kiện hoàn theo loại sản phẩm, thời hạn 48 giờ và chấm dứt dịch vụ.',
    group: 'commerce',
  },
  {
    slug: 'chinh-sach-khieu-nai-tranh-chap',
    file: '07-chinh-sach-khieu-nai-tranh-chap.md',
    title: 'Khiếu nại và tranh chấp',
    summary: 'Tiếp nhận 24 giờ, xác minh 01 ngày làm việc, người bán phản hồi 02 ngày làm việc, quyết định 07 ngày làm việc; khiếu nại lại trong 07 ngày.',
    group: 'commerce',
  },
  {
    slug: 'chinh-sach-thue',
    file: '18-chinh-sach-thue.md',
    title: 'Chính sách thuế',
    summary: 'Thuế khấu trừ cố định 8% cho mọi người bán; cùng phí sàn 20% tổng khấu trừ 28%.',
    group: 'commerce',
  },
  {
    slug: 'chinh-sach-hoa-don',
    file: '19-chinh-sach-hoa-don.md',
    title: 'Chính sách hóa đơn',
    summary: 'Phân biệt hóa đơn phí dịch vụ của sàn và hóa đơn của người bán.',
    group: 'commerce',
  },
  {
    slug: 'chinh-sach-affiliate',
    file: '20-chinh-sach-affiliate.md',
    title: 'Chính sách chương trình Affiliate',
    summary: 'Phiên bản 2026.10.12: hoa hồng 0–25% giá trị đơn do người bán chi trả, last-click 30 ngày, giữ 48 giờ, thuế TNCN, hành vi cấm và thu hồi hoa hồng.',
    group: 'commerce',
  },
  {
    slug: 'chinh-sach-bao-mat-va-du-lieu',
    file: '08-chinh-sach-bao-mat-va-du-lieu.md',
    title: 'Bảo mật và dữ liệu cá nhân',
    summary: 'Bảo vệ dữ liệu cá nhân theo Luật 91/2025/QH15; dữ liệu lưu trữ tại Việt Nam trên máy chủ 123HOST.',
    group: 'data',
  },
  {
    slug: 'chinh-sach-ip-ban-quyen-license',
    file: '09-chinh-sach-ip-ban-quyen-license.md',
    title: 'Sở hữu trí tuệ và license',
    summary: 'Quyền SHTT, thông báo và gỡ bỏ, phạm vi quyền người mua.',
    group: 'data',
  },
  {
    slug: 'chinh-sach-cookies',
    file: '16-chinh-sach-cookies.md',
    title: 'Chính sách cookies',
    summary: 'Cookie cần thiết, phân tích tự vận hành, bên thứ ba và quyền quản lý.',
    group: 'data',
  },
  {
    slug: 'chinh-sach-luu-tru-va-cung-cap-du-lieu',
    file: '17-chinh-sach-luu-tru-va-cung-cap-du-lieu.md',
    title: 'Lưu trữ và cung cấp dữ liệu',
    summary: 'Thời hạn lưu trữ (sản phẩm 01 năm, giao dịch 03 năm), tạm giữ và cung cấp dữ liệu.',
    group: 'data',
  },
  {
    slug: 'chinh-sach-su-dung-chap-nhan-duoc',
    file: '10-chinh-sach-su-dung-chap-nhan-duoc.md',
    title: 'Sử dụng chấp nhận được (AUP)',
    summary: 'Danh mục cấm kinh doanh, hành vi cấm trên API, GPU và agent.',
    group: 'ops',
  },
  {
    slug: 'chinh-sach-kiem-duyet-san-pham-ai',
    file: '11-chinh-sach-kiem-duyet-san-pham-ai.md',
    title: 'Kiểm duyệt sản phẩm AI',
    summary: 'Luồng duyệt model, agent, API, mẫu website, dataset và dịch vụ chuyên môn trọn gói trước khi hiển thị.',
    group: 'ops',
  },
  {
    slug: 'chinh-sach-agent-container-security',
    file: '12-chinh-sach-agent-container-security.md',
    title: 'An ninh agent và container',
    summary: 'Cách ly, khóa bí mật, BYOK và xử lý agent độc hại.',
    group: 'ops',
  },
  {
    slug: 'quy-trinh-xac-minh-nguoi-ban',
    file: '13-quy-trinh-xac-minh-nguoi-ban.md',
    title: 'Quy trình xác minh người bán',
    summary: 'Hồ sơ xác minh, trạng thái duyệt và xác nhận thỏa thuận người bán.',
    group: 'ops',
  },
  {
    slug: 'quy-trinh-xu-ly-vi-pham',
    file: '14-quy-trinh-xu-ly-vi-pham.md',
    title: 'Quy trình xử lý vi phạm',
    summary: 'Mức độ vi phạm, gỡ bỏ trong 24 giờ theo yêu cầu cơ quan nhà nước.',
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
