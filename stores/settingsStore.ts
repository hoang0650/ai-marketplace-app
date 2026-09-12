import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Appearance } from 'react-native';
import type { Lang } from '@/i18n/messages';
import { translate } from '@/i18n/messages';
import type { ThemeMode } from '@/theme/tokens';
import { darkColors, lightColors } from '@/theme/tokens';

type SettingsState = {
  hydrated: boolean;
  language: Lang;
  themeMode: ThemeMode;
  onboarded: boolean;
  currency: string;
  hydrate: () => Promise<void>;
  setLanguage: (language: Lang) => Promise<void>;
  setThemeMode: (themeMode: ThemeMode) => Promise<void>;
  setOnboarded: (onboarded: boolean) => Promise<void>;
  setCurrency: (currency: string) => Promise<void>;
  t: (key: string, vars?: Record<string, string | number>) => string;
  isDark: () => boolean;
  colors: () => typeof lightColors;
};

const KEY = 'aimarkets_settings_v1';

export const useSettingsStore = create<SettingsState>((set, get) => ({
  hydrated: false,
  language: 'vi',
  themeMode: 'system',
  onboarded: false,
  currency: 'USD',
  t: (key, vars) => translate(get().language, key, vars),
  isDark: () => {
    const mode = get().themeMode;
    if (mode === 'dark') return true;
    if (mode === 'light') return false;
    return Appearance.getColorScheme() === 'dark';
  },
  colors: () => (get().isDark() ? darkColors : lightColors),
  hydrate: async () => {
    try {
      const raw = await AsyncStorage.getItem(KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as Partial<SettingsState>;
        set({
          language: parsed.language === 'en' ? 'en' : 'vi',
          themeMode: parsed.themeMode === 'light' || parsed.themeMode === 'dark' || parsed.themeMode === 'system' ? parsed.themeMode : 'system',
          onboarded: !!parsed.onboarded,
          currency: parsed.currency || 'USD',
        });
      }
    } finally {
      set({ hydrated: true });
    }
  },
  setLanguage: async (language) => {
    set({ language });
    await persist(get());
  },
  setThemeMode: async (themeMode) => {
    set({ themeMode });
    await persist(get());
  },
  setOnboarded: async (onboarded) => {
    set({ onboarded });
    await persist(get());
  },
  setCurrency: async (currency) => {
    set({ currency });
    await persist(get());
  },
}));

async function persist(state: SettingsState) {
  await AsyncStorage.setItem(
    KEY,
    JSON.stringify({
      language: state.language,
      themeMode: state.themeMode,
      onboarded: state.onboarded,
      currency: state.currency,
    }),
  );
}
