/**
 * Seller listings send a code from GET /v1/usage/units.
 * Free text is not a unit. Labels come from that catalog.
 */

export interface UsageUnit {
  code: string;
  labelEn: string;
  labelVi: string;
  dimension: string;
  kind: 'metered' | 'entitlement' | string;
  unitSize: number;
  period?: string | null;
}

export interface UsageUnitCatalog {
  units: UsageUnit[];
  allowedByCategory: Record<string, string[]>;
}

const ACCESS_PERIODS = new Set(['day', 'week', 'month', 'year']);

export function unitsForCategory(catalog: UsageUnitCatalog | null | undefined, category: string | null | undefined): UsageUnit[] {
  const allowed = catalog?.allowedByCategory?.[String(category || '')];
  if (!catalog || !Array.isArray(allowed)) return [];
  const byCode = new Map(catalog.units.map((unit) => [unit.code, unit]));
  return allowed.map((code) => byCode.get(code)).filter((unit): unit is UsageUnit => !!unit);
}

export function labelForUnit(unit: UsageUnit | null | undefined, lang: string): string {
  if (!unit) return '';
  return lang === 'vi' ? unit.labelVi : unit.labelEn;
}

/** Label the server attached to a canonical unit. Missing text stays blank. */
export function usageUnitLabelText(
  label: { vi?: string | null; en?: string | null } | null | undefined,
  lang: string,
): string | null {
  if (!label) return null;
  const text = String((lang === 'vi' ? label.vi : label.en) || '').trim();
  return text || null;
}

export function isAccessListing(pricing: { usageUnit?: string | null; usagePeriod?: string | null } | null | undefined): boolean {
  const period = String(pricing?.usagePeriod || '');
  if (ACCESS_PERIODS.has(period)) return true;
  return ['1_day', '1_week', '1_month', '1_year'].includes(String(pricing?.usageUnit || ''));
}

export function isAccessPeriodUnit(unit: { kind?: string | null; period?: string | null } | null | undefined): boolean {
  return unit?.kind === 'entitlement' && ACCESS_PERIODS.has(String(unit.period || ''));
}

export function accessPeriodOf(code: string | null | undefined, catalog: UsageUnitCatalog | null | undefined): string | null {
  const unit = catalog?.units.find((row) => row.code === code);
  return isAccessPeriodUnit(unit) ? String(unit?.period) : null;
}

/** Only a catalog code may be saved. Free text is refused before the request. */
export function usageUnitChoice(code: string, allowed: readonly string[]): { ok: true; code: string } | { ok: false; code: 'USAGE_UNIT_INVALID' | 'USAGE_UNIT_NOT_METERABLE' } {
  const value = String(code || '').trim();
  if (!value || /\s/.test(value)) return { ok: false, code: 'USAGE_UNIT_INVALID' };
  if (!allowed.includes(value)) return { ok: false, code: 'USAGE_UNIT_NOT_METERABLE' };
  return { ok: true, code: value };
}
