import { create } from 'zustand';
import type { Product } from '@/api/types';

export type CartLine = { product: Product; qty: number };

type CartState = {
  lines: CartLine[];
  add: (product: Product, qty?: number) => void;
  remove: (productId: string) => void;
  clear: () => void;
};

export const useCartStore = create<CartState>((set, get) => ({
  lines: [],
  add: (product, qty = 1) => {
    const existing = get().lines.find((l) => l.product.id === product.id);
    if (existing) {
      set({
        lines: get().lines.map((l) => (l.product.id === product.id ? { ...l, qty: l.qty + qty } : l)),
      });
      return;
    }
    set({ lines: [...get().lines, { product, qty }] });
  },
  remove: (productId) => set({ lines: get().lines.filter((l) => l.product.id !== productId) }),
  clear: () => set({ lines: [] }),
}));
