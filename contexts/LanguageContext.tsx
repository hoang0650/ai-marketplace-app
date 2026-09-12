import React from 'react';
import { useSettingsStore } from '@/stores/settingsStore';
import { useT } from '@/hooks/useT';

export function useLanguage() {
  const { t, language } = useT();
  const setLanguage = useSettingsStore((s) => s.setLanguage);
  return { t, language, setLanguage };
}

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
