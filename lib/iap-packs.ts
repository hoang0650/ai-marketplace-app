export const WALLET_IAP_PACKS = [
  { sku: 'aimarkets.wallet.5', usd: 5 },
  { sku: 'aimarkets.wallet.10', usd: 10 },
  { sku: 'aimarkets.wallet.20', usd: 20 },
  { sku: 'aimarkets.wallet.50', usd: 50 },
  { sku: 'aimarkets.wallet.100', usd: 100 },
] as const;

export const WALLET_IAP_SKUS = WALLET_IAP_PACKS.map((p) => p.sku);
