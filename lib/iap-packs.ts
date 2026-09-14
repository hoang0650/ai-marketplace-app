export const WALLET_IAP_PACKS = [
  { sku: 'aimarkets.wallet.5', usd: 5 },
  { sku: 'aimarkets.wallet.10', usd: 10 },
  { sku: 'aimarkets.wallet.20', usd: 20 },
  { sku: 'aimarkets.wallet.50', usd: 50 },
  { sku: 'aimarkets.wallet.100', usd: 100 },
] as const;

export const WALLET_IAP_SKUS = WALLET_IAP_PACKS.map((p) => p.sku);
export const WALLET_IAP_MIN = 1;
export const WALLET_IAP_MAX = WALLET_IAP_PACKS[WALLET_IAP_PACKS.length - 1].usd;

export type WalletIapPack = (typeof WALLET_IAP_PACKS)[number];

export function parseTopupAmount(raw: string): { ok: true; usd: number } | { ok: false } {
  const usd = Number(String(raw).replace(',', '.').replace(/[^\d.]/g, ''));
  if (!Number.isFinite(usd) || usd < WALLET_IAP_MIN) return { ok: false };
  return { ok: true, usd: Math.round(usd * 100) / 100 };
}

/** App Store / Play only sell fixed consumable SKUs. Map a typed amount to a pack. */
export function resolveIapPack(usd: number): { pack: WalletIapPack; exact: boolean } {
  const exact = WALLET_IAP_PACKS.find((p) => p.usd === usd);
  if (exact) return { pack: exact, exact: true };
  const up = WALLET_IAP_PACKS.find((p) => p.usd >= usd);
  return { pack: up || WALLET_IAP_PACKS[WALLET_IAP_PACKS.length - 1], exact: false };
}
