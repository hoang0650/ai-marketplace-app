import type { LicenseTerm, Product } from '@/api/types';
import { isLicenseCategory } from '@/constants/categories';

const formatters = new Map<string, Intl.NumberFormat>();

export function formatMoney(amount: number, currency = 'USD') {
  const cur = (currency || 'USD').toUpperCase();
  try {
    let fmt = formatters.get(cur);
    if (!fmt) {
      fmt = new Intl.NumberFormat(cur === 'VND' ? 'vi-VN' : 'en-US', {
        style: 'currency',
        currency: cur,
        maximumFractionDigits: cur === 'VND' ? 0 : 2,
      });
      formatters.set(cur, fmt);
    }
    return fmt.format(amount);
  } catch {
    return `${amount.toLocaleString()} ${cur}`;
  }
}

export function formatJobPay(
  job: {
    salaryMin?: number;
    salaryMax?: number;
    salaryCurrency?: string;
    salaryPeriod?: string;
    salaryNegotiable?: boolean;
  },
  t: (k: string) => string,
) {
  if (job.salaryNegotiable || (!job.salaryMin && !job.salaryMax)) return t('work.negotiable');
  const cur = job.salaryCurrency || 'VND';
  const period = t(`work.period.${job.salaryPeriod || 'month'}`);
  if (job.salaryMin && job.salaryMax && job.salaryMin !== job.salaryMax) {
    return `${formatMoney(job.salaryMin, cur)} – ${formatMoney(job.salaryMax, cur)} / ${period}`;
  }
  return `${formatMoney(job.salaryMin || job.salaryMax || 0, cur)} / ${period}`;
}

export function availableLicenseTerms(p: Pick<Product, 'contentMeta' | 'pricing'>): LicenseTerm[] {
  const prices = p.contentMeta?.licensePrices || {};
  const terms = (['day', 'month', 'year'] as const).filter((term) => Number(prices[term]) > 0);
  if (terms.length) return terms;
  const fallback = p.contentMeta?.licenseTerm;
  if (fallback === 'day' || fallback === 'month' || fallback === 'year') return [fallback];
  return ['month'];
}

export function licenseUnitPrice(p: Pick<Product, 'contentMeta' | 'pricing'>, term: LicenseTerm) {
  const mapped = Number(p.contentMeta?.licensePrices?.[term]);
  if (mapped > 0) return mapped;
  return p.pricing?.price ?? 0;
}

export function cheapestLicensePrice(p: Pick<Product, 'contentMeta' | 'pricing'>) {
  const amounts = availableLicenseTerms(p).map((term) => licenseUnitPrice(p, term)).filter((n) => n > 0);
  if (amounts.length) return Math.min(...amounts);
  return p.pricing?.price ?? 0;
}

export function productPrice(p: Pick<Product, 'pricing' | 'category' | 'contentMeta'>, term?: LicenseTerm) {
  const cur = p.pricing?.currency || 'USD';
  if (isLicenseCategory(p.category)) {
    const amount = term ? licenseUnitPrice(p, term) : cheapestLicensePrice(p);
    return formatMoney(amount, cur);
  }
  const amount = p.pricing?.model === 'usage' ? p.pricing?.usageRate ?? 0 : p.pricing?.price ?? 0;
  const unit = p.pricing?.unit || (p.pricing?.model === 'usage' ? '/ usage' : '');
  return `${formatMoney(amount, cur)}${unit ? ` ${unit}` : ''}`;
}

export function productSale(p: Pick<Product, 'pricing' | 'category' | 'contentMeta'>) {
  const compare = Number(p.pricing?.compareAtPrice) || 0;
  const now = isLicenseCategory(p.category)
    ? cheapestLicensePrice(p)
    : p.pricing?.model === 'usage'
      ? Number(p.pricing?.usageRate) || 0
      : Number(p.pricing?.price) || 0;
  return {
    onSale: compare > now && (p.pricing?.model || '') !== 'free',
    was: formatMoney(compare, p.pricing?.currency || 'USD'),
  };
}

export function formatDate(iso?: string | null, locale: 'vi' | 'en' = 'vi') {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  return d.toLocaleDateString(locale === 'en' ? 'en-GB' : 'vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

export function greetingHour(lang: 'vi' | 'en') {
  const h = new Date().getHours();
  if (lang === 'en') {
    if (h < 12) return 'Good morning';
    if (h < 18) return 'Good afternoon';
    return 'Good evening';
  }
  if (h < 12) return 'Chào buổi sáng';
  if (h < 18) return 'Chào buổi chiều';
  return 'Chào buổi tối';
}
