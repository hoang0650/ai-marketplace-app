/**
 * Temporary feature flags.
 *
 * GPay (web top-up gateway) is hidden by default. Set EXPO_PUBLIC_GPAY_ENABLED=true
 * at build time (EAS env / .env) to show GPay copy again. Only the copy is gated;
 * no GPay code is removed.
 */
const truthy = (v: unknown) => ['1', 'true', 'yes', 'on'].includes(String(v ?? '').trim().toLowerCase());

export const GPAY_ENABLED: boolean = truthy(process.env.EXPO_PUBLIC_GPAY_ENABLED);
