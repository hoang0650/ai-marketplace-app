import { useMemo } from 'react';
import { useSettingsStore } from '@/stores/settingsStore';

export function useTheme() {
  const themeMode = useSettingsStore((s) => s.themeMode);
  const colors = useSettingsStore((s) => s.colors);
  const isDarkFn = useSettingsStore((s) => s.isDark);
  const isDark = useMemo(() => isDarkFn(), [themeMode, isDarkFn]);
  return { colors: colors(), isDark, themeMode, toggleTheme: () => useSettingsStore.getState().setThemeMode(isDark ? 'light' : 'dark') };
}

export function useT() {
  const language = useSettingsStore((s) => s.language);
  const t = useSettingsStore((s) => s.t);
  return { t, language };
}
