import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';

type RecentState = {
  searches: string[];
  viewedSlugs: string[];
  addSearch: (q: string) => void;
  addViewed: (slug: string) => void;
  hydrate: () => Promise<void>;
};

const KEY = 'aimarkets_recent_v1';

export const useRecentStore = create<RecentState>((set, get) => ({
  searches: [],
  viewedSlugs: [],
  hydrate: async () => {
    try {
      const raw = await AsyncStorage.getItem(KEY);
      if (!raw) return;
      const parsed = JSON.parse(raw) as Partial<Pick<RecentState, 'searches' | 'viewedSlugs'>>;
      set({
        searches: Array.isArray(parsed.searches) ? parsed.searches : [],
        viewedSlugs: Array.isArray(parsed.viewedSlugs) ? parsed.viewedSlugs : [],
      });
    } catch {
      /* ignore */
    }
  },
  addSearch: (q) => {
    const value = q.trim();
    if (value.length < 2) return;
    const searches = [value, ...get().searches.filter((s) => s !== value)].slice(0, 8);
    set({ searches });
    void AsyncStorage.setItem(KEY, JSON.stringify({ searches, viewedSlugs: get().viewedSlugs }));
  },
  addViewed: (slug) => {
    const viewedSlugs = [slug, ...get().viewedSlugs.filter((s) => s !== slug)].slice(0, 12);
    set({ viewedSlugs });
    void AsyncStorage.setItem(KEY, JSON.stringify({ searches: get().searches, viewedSlugs }));
  },
}));
