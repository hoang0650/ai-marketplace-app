import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';

const KEY = 'aimarkets_blocks_v1';

export type BlockEntry = { userId: string; slug: string; name: string };

export type BlockableProduct = {
  creatorSlug?: string;
  sellerSlug?: string;
  creatorId?: string;
  sellerId?: string;
};

type BlockState = {
  hydrated: boolean;
  entries: BlockEntry[];
  hydrate: () => Promise<void>;
  block: (target: { userId?: string; slug?: string; name?: string }) => void;
  unblock: (target: { userId?: string; slug?: string }) => void;
};

function persist(entries: BlockEntry[]) {
  void AsyncStorage.setItem(KEY, JSON.stringify(entries));
}

export function isBlockedUser(userId: string | undefined, entries: BlockEntry[]): boolean {
  const id = String(userId || '').trim();
  if (!id) return false;
  return entries.some((entry) => entry.userId === id);
}

export function isBlockedSlug(slug: string | undefined, entries: BlockEntry[]): boolean {
  const value = String(slug || '').trim();
  if (!value) return false;
  return entries.some((entry) => entry.slug === value);
}

export function isBlockedTarget(target: { userId?: string; slug?: string }, entries: BlockEntry[]): boolean {
  return isBlockedUser(target.userId, entries) || isBlockedSlug(target.slug, entries);
}

export function isBlockedProduct(product: BlockableProduct, entries: BlockEntry[]): boolean {
  return entries.some(
    (entry) =>
      (!!entry.slug && (entry.slug === product.creatorSlug || entry.slug === product.sellerSlug)) ||
      (!!entry.userId && !!product.creatorId && entry.userId === String(product.creatorId)) ||
      (!!entry.userId && !!product.sellerId && entry.userId === String(product.sellerId)),
  );
}

export function filterBlockedProducts<T extends BlockableProduct>(rows: T[] | null | undefined, entries = useBlockStore.getState().entries): T[] {
  return (rows || []).filter((row) => !isBlockedProduct(row, entries));
}

export function filterBlockedShops<T extends { slug?: string; id?: string }>(
  rows: T[] | null | undefined,
  entries = useBlockStore.getState().entries,
): T[] {
  return (rows || []).filter((row) => !isBlockedSlug(row.slug, entries) && !isBlockedUser(row.id, entries));
}

export const useBlockStore = create<BlockState>((set, get) => ({
  hydrated: false,
  entries: [],
  hydrate: async () => {
    try {
      const raw = await AsyncStorage.getItem(KEY);
      if (!raw) return;
      const parsed = JSON.parse(raw) as unknown;
      if (!Array.isArray(parsed)) return;
      const entries = parsed
        .map((row) => {
          const item = row as Partial<BlockEntry>;
          return {
            userId: String(item.userId || '').trim(),
            slug: String(item.slug || '').trim(),
            name: String(item.name || '').trim(),
          };
        })
        .filter((entry) => entry.userId || entry.slug);
      set({ entries });
    } catch {
      /* ignore corrupt local block list */
    } finally {
      set({ hydrated: true });
    }
  },
  block: (target) => {
    const userId = String(target.userId || '').trim();
    const slug = String(target.slug || '').trim();
    if (!userId && !slug) return;
    const name = String(target.name || slug || userId);
    const entries = [
      ...get().entries.filter((entry) => !(userId && entry.userId === userId) && !(slug && entry.slug === slug)),
      { userId, slug, name },
    ];
    set({ entries });
    persist(entries);
  },
  unblock: (target) => {
    const userId = String(target.userId || '').trim();
    const slug = String(target.slug || '').trim();
    const entries = get().entries.filter((entry) => !(userId && entry.userId === userId) && !(slug && entry.slug === slug));
    set({ entries });
    persist(entries);
  },
}));
