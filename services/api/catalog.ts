import { apiClient } from './client';
import { API_ENDPOINTS } from './config';

export interface Product {
  id: string;
  slug: string;
  name: string;
  tagline: string;
  description: string;
  category: string;
  coverUrl?: string;
  creatorName?: string;
  sellerName?: string;
  rating?: number;
  salesCount?: number;
  pricing?: { model: string; price: number; currency: string; interval?: string };
}

export interface CategoryMeta {
  id: string;
  label: string;
  description?: string;
}

export interface Order {
  id: string;
  productName: string;
  amount: number;
  currency: string;
  status: string;
  createdAt: string;
}

export interface WalletTx {
  id: string;
  type: 'credit' | 'debit' | 'withdraw' | 'deposit';
  amount: number;
  currency: string;
  note: string;
  status?: string;
  createdAt: string;
}

export interface WalletSummary {
  currency: string;
  balance: number;
  held: number;
  available: number;
}

export const catalogApi = {
  products: (params?: { q?: string; category?: string; featured?: boolean; limit?: number }) => {
    const q = new URLSearchParams();
    if (params?.q) q.set('q', params.q);
    if (params?.category) q.set('category', params.category);
    if (params?.featured) q.set('featured', 'true');
    if (params?.limit) q.set('limit', String(params.limit));
    const suffix = q.toString() ? `?${q.toString()}` : '';
    return apiClient.get<Product[]>(`${API_ENDPOINTS.PRODUCTS}${suffix}`);
  },
  product: (slug: string) => apiClient.get<Product>(`${API_ENDPOINTS.PRODUCTS}/${slug}`),
  categories: () => apiClient.get<CategoryMeta[]>(API_ENDPOINTS.CATEGORIES),
};

export const commerceApi = {
  orders: () => apiClient.get<Order[]>(API_ENDPOINTS.ORDERS),
  checkout: (productId: string, quantity = 1) =>
    apiClient.post<{ checkoutId: string; status: string; amount?: number; currency?: string; balance?: number }>(
      API_ENDPOINTS.CHECKOUT,
      { productId, quantity, provider: 'wallet' },
    ),
  wallet: () => apiClient.get<WalletTx[]>(API_ENDPOINTS.WALLET),
  walletSummary: () => apiClient.get<WalletSummary>(API_ENDPOINTS.WALLET_SUMMARY),
  deposit: (amount: number) => apiClient.post<WalletTx>(API_ENDPOINTS.WALLET_DEPOSIT, { amount }),
  withdraw: (amount: number) => apiClient.post<WalletTx>(API_ENDPOINTS.WALLET_WITHDRAW, { amount }),
};
